import { injectable, inject } from 'inversify';
import { TYPES } from '../types';
import type { ITrademarkRepository } from '../repositories/ITrademarkRepository';
import type { IUSPTOApiClient } from '../../infrastructure/api/IUSPTOApiClient';
import type { ICacheManager } from '../../infrastructure/cache/ICacheManager';
import type { ISimilarityEngine } from '../engines/ISimilarityEngine';
import type { IRiskAssessmentEngine } from '../engines/IRiskAssessmentEngine';
import { logger } from '../../infrastructure/monitoring/logger';
import { searchCounter, searchDuration } from '../../infrastructure/monitoring/metrics';
import { InvalidSearchQueryError, SearchFailedError } from '../../shared/errors';

export interface SearchOptions {
  markText: string;
  niceClasses: number[];
  includeUSPTOVerification?: boolean;
  forceRefresh?: boolean;
}

/** TSDR (Trademark Status and Document Retrieval) base URL for evidence links */
const TSDR_CASE_URL = 'https://tsdr.uspto.gov/#caseNumber';

export interface TrademarkConflict {
  id: number;
  serialNumber: string;
  markText: string;
  ownerName: string;
  status: 'live' | 'dead' | 'pending' | 'abandoned';
  filingDate: string;
  niceClasses: number[];
  similarityScore: number;
  similarityBreakdown: {
    overallScore: number;
    exact: number;
    visual: number;
    phonetic: number;
    fuzzy: number;
  };
  riskLevel: 'low' | 'medium' | 'high';
  riskExplanation: string;
  verified?: boolean;
  currentStatus?: string;
  verifiedAt?: string;
  /** Link to USPTO TSDR for this application (evidence) */
  usptoUrl?: string;
}

export interface SearchSummary {
  totalResults: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  overallRisk: 'low' | 'medium' | 'high';
  verifiedCount: number;
}

export interface SearchResult {
  query: SearchOptions;
  conflicts: TrademarkConflict[];
  summary: SearchSummary;
  metadata: {
    searchedAt: string;
    duration: number;
    sources: string[];
    cached: boolean;
  };
}

@injectable()
export class TrademarkSearchService {
  constructor(
    @inject(TYPES.TrademarkRepository) private repository: ITrademarkRepository,
    @inject(TYPES.USPTOApiClient) private usptoApi: IUSPTOApiClient,
    @inject(TYPES.CacheManager) private cacheManager: ICacheManager,
    @inject(TYPES.SimilarityEngine) private similarityEngine: ISimilarityEngine,
    @inject(TYPES.RiskAssessmentEngine) private riskEngine: IRiskAssessmentEngine
  ) {}

  /**
   * MAIN SEARCH METHOD
   * Orchestrates the entire search process
   */
  async performSearch(options: SearchOptions): Promise<SearchResult> {
    const startTime = Date.now();
    const timer = searchDuration.startTimer();

    logger.info({
      markText: options.markText,
      niceClasses: options.niceClasses,
    }, 'Starting trademark search');

    try {
      // Validate input
      this.validateSearchOptions(options);

      // Check cache first (unless force refresh)
      if (!options.forceRefresh) {
        const cached = await this.getCachedResult(options);
        if (cached) {
          logger.info({ markText: options.markText }, 'Cache hit');
          searchCounter.inc({ status: 'success', source: 'cache' });
          timer({ status: 'success' });
          return cached;
        }
      }

      // Execute search pipeline
      const result = await this.executeSearchPipeline(options);

      // Cache the result
      await this.cacheResult(options, result);

      // Record metrics
      const duration = Date.now() - startTime;
      result.metadata.duration = duration;
      
      searchCounter.inc({ status: 'success', source: 'database' });
      timer({ status: 'success' });

      logger.info({
        markText: options.markText,
        duration,
        resultsCount: result.conflicts.length,
      }, 'Search completed successfully');

      return result;

    } catch (error) {
      searchCounter.inc({ status: 'error', source: 'unknown' });
      timer({ status: 'error' });

      logger.error({
        err: error,
        markText: options.markText,
      }, 'Search failed');

      throw new SearchFailedError(
        `Search failed for "${options.markText}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute the search pipeline
   */
  private async executeSearchPipeline(options: SearchOptions): Promise<SearchResult> {
    // Step 1: Search local database (FAST - ~200ms)
    const databaseResults = await this.searchDatabase(options);
    logger.debug({ count: databaseResults.length }, 'Database search completed');

    // Step 2: Apply similarity algorithms to all results
    const scoredResults = this.scoreResults(
      options.markText,
      databaseResults,
      options.niceClasses
    );
    logger.debug({ count: scoredResults.length }, 'Results scored');

    // Step 3: Filter results by similarity threshold (40%)
    const filteredResults = this.filterBySimilarity(scoredResults, 40);
    logger.debug({ count: filteredResults.length }, 'Results filtered');

    // Step 4: Verify top results with USPTO (if enabled)
    let verifiedResults = filteredResults;
    if (options.includeUSPTOVerification) {
      verifiedResults = await this.verifyWithUSPTO(filteredResults);
      logger.debug({
        verifiedCount: verifiedResults.filter(r => r.verified).length,
      }, 'USPTO verification completed');
    }

    // Step 5: Sort results (high risk first, then by similarity)
    const sortedResults = this.sortResults(verifiedResults);

    // Step 6: Generate summary
    const summary = this.generateSummary(sortedResults);

    // Step 7: Build result object
    return {
      query: options,
      conflicts: sortedResults.slice(0, 50), // Return top 50
      summary,
      metadata: {
        searchedAt: new Date().toISOString(),
        duration: 0, // Will be set by caller
        sources: this.getSourcesList(options),
        cached: false,
      },
    };
  }

  /**
   * Search local database
   */
  private async searchDatabase(options: SearchOptions): Promise<any[]> {
    try {
      return await this.repository.searchByMark(
        options.markText,
        options.niceClasses
      );
    } catch (error) {
      logger.error({ err: error }, 'Database search failed');
      throw error;
    }
  }

  /**
   * Score all results with similarity and risk assessment
   */
  private scoreResults(
    queryMark: string,
    results: any[],
    queryClasses: number[]
  ): TrademarkConflict[] {
    return results.map(result => {
      // Calculate similarity
      const similarity = this.similarityEngine.calculateSimilarity(
        queryMark,
        result.markText
      );

      // Assess risk
      const riskAssessment = this.riskEngine.assessRisk({
        similarityScore: similarity.overallScore,
        queryClasses,
        resultClasses: result.niceClasses,
        status: result.status,
      });

      return {
        id: result.id,
        serialNumber: result.serialNumber,
        markText: result.markText,
        ownerName: result.ownerName,
        status: result.status,
        filingDate: result.filingDate,
        niceClasses: result.niceClasses,
        similarityScore: similarity.overallScore,
        similarityBreakdown: similarity,
        riskLevel: riskAssessment.level,
        riskExplanation: riskAssessment.explanation,
        verified: false,
        usptoUrl: `${TSDR_CASE_URL}=${result.serialNumber}&caseSearchType=US_APPLICATION&caseType=DEFAULT`,
      };
    });
  }

  /**
   * Filter results by minimum similarity threshold
   */
  private filterBySimilarity(
    results: TrademarkConflict[],
    minThreshold: number
  ): TrademarkConflict[] {
    return results.filter(r => r.similarityScore >= minThreshold);
  }

  /**
   * Verify top results with USPTO API
   */
  private async verifyWithUSPTO(
    results: TrademarkConflict[]
  ): Promise<TrademarkConflict[]> {
    const topResults = results.slice(0, 10); // Only verify top 10
    const serialNumbers = topResults.map(r => r.serialNumber);

    logger.info({
      count: serialNumbers.length,
    }, 'Verifying with USPTO API');

    try {
      const verifications = await this.usptoApi.verifyBatch(serialNumbers);

      return results.map(result => {
        const verification = verifications.get(result.serialNumber);
        
        if (verification && verification.verified) {
          return {
            ...result,
            verified: true,
            currentStatus: verification.status || result.status,
            verifiedAt: verification.verifiedAt,
          };
        }

        return result;
      });
    } catch (error) {
      logger.error({ err: error }, 'USPTO verification failed');
      return results;
    }
  }

  /**
   * Sort results by risk level and similarity
   */
  private sortResults(results: TrademarkConflict[]): TrademarkConflict[] {
    const riskOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };

    return [...results].sort((a, b) => {
      const riskDiff = riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      if (riskDiff !== 0) return riskDiff;
      return b.similarityScore - a.similarityScore;
    });
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(results: TrademarkConflict[]): SearchSummary {
    const highRisk = results.filter(r => r.riskLevel === 'high').length;
    const mediumRisk = results.filter(r => r.riskLevel === 'medium').length;
    const lowRisk = results.filter(r => r.riskLevel === 'low').length;
    const verifiedCount = results.filter(r => r.verified).length;

    let overallRisk: 'low' | 'medium' | 'high' = 'low';
    if (highRisk > 0) {
      overallRisk = 'high';
    } else if (mediumRisk > 2) {
      overallRisk = 'high';
    } else if (mediumRisk > 0) {
      overallRisk = 'medium';
    }

    return {
      totalResults: results.length,
      highRisk,
      mediumRisk,
      lowRisk,
      overallRisk,
      verifiedCount,
    };
  }

  /**
   * Validate search options
   */
  private validateSearchOptions(options: SearchOptions): void {
    if (!options.markText || options.markText.trim().length < 2) {
      throw new InvalidSearchQueryError('Mark text must be at least 2 characters');
    }

    if (!options.niceClasses || options.niceClasses.length === 0) {
      throw new InvalidSearchQueryError('At least one Nice class must be specified');
    }
  }

  /**
   * Get cached result
   */
  private async getCachedResult(options: SearchOptions): Promise<SearchResult | null> {
    const cacheKey = this.buildCacheKey(options);
    return await this.cacheManager.get<SearchResult>(cacheKey);
  }

  /**
   * Cache result
   */
  private async cacheResult(options: SearchOptions, result: SearchResult): Promise<void> {
    const cacheKey = this.buildCacheKey(options);
    await this.cacheManager.set(cacheKey, result, 3600); // 1 hour
  }

  /**
   * Build cache key from options
   */
  private buildCacheKey(options: SearchOptions): string {
    const normalized = options.markText.toLowerCase().replace(/\s+/g, '');
    const classes = [...options.niceClasses].sort().join(',');
    return `search:${normalized}:${classes}`;
  }

  /**
   * Get list of data sources used
   */
  private getSourcesList(options: SearchOptions): string[] {
    const sources = ['USPTO federal marks (text/soundex/class)'];
    if (options.includeUSPTOVerification) sources.push('USPTO TSDR live verification');
    return sources;
  }
}