/**
 * Use Case: Search Trademark
 * Orchestrates the complete trademark search operation
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/types';
import { SearchQuery } from '../../core/domain/SearchQuery';
import { SearchResult, TrademarkConflict } from '../../core/domain/SearchResult';
import { Trademark } from '../../core/domain/Trademark';
import type { ITrademarkRepository } from '../../core/repositories/ITrademarkRepository';
import type { IUSPTOApiClient } from '../../infrastructure/api/IUSPTOApiClient';
import type { ICacheManager } from '../../infrastructure/cache/ICacheManager';
import type { ISimilarityEngine } from '../../core/engines/ISimilarityEngine';
import type { IRiskAssessmentEngine } from '../../core/engines/IRiskAssessmentEngine';
import { logger } from '../../infrastructure/monitoring/logger';
import { searchCounter, searchDuration } from '../../infrastructure/monitoring/metrics';

@injectable()
export class SearchTrademarkUseCase {
  constructor(
    @inject(TYPES.TrademarkRepository) private repository: ITrademarkRepository,
    @inject(TYPES.USPTOApiClient) private usptoApi: IUSPTOApiClient,
    @inject(TYPES.CacheManager) private cacheManager: ICacheManager,
    @inject(TYPES.SimilarityEngine) private similarityEngine: ISimilarityEngine,
    @inject(TYPES.RiskAssessmentEngine) private riskEngine: IRiskAssessmentEngine
  ) {}

  async execute(query: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    const timer = searchDuration.startTimer();

    logger.info({
      markText: query.markText,
      niceClasses: query.niceClasses,
    }, 'Executing search trademark use case');

    try {
      // Step 1: Check cache
      if (!query.shouldBypassCache()) {
        const cached = await this.getCachedResult(query);
        if (cached) {
          logger.info('Cache hit');
          searchCounter.inc({ status: 'success', source: 'cache' });
          timer({ status: 'success' });
          return cached;
        }
      }

      // Step 2: Search database
      const databaseResults = await this.searchDatabase(query);
      logger.debug({ count: databaseResults.length }, 'Database results retrieved');

      // Step 3: Convert to domain entities
      const trademarks = databaseResults.map(row => Trademark.fromDatabase(row));

      // Step 4: Calculate similarity and assess risk
      const conflicts = this.analyzeConflicts(query, trademarks);

      // Step 5: Filter by similarity threshold
      const filteredConflicts = conflicts.filter(c => c.similarityScore >= 40);

      // Step 6: USPTO verification (if enabled)
      let verifiedConflicts = filteredConflicts;
      if (query.shouldVerifyWithUSPTO()) {
        verifiedConflicts = await this.verifyConflicts(filteredConflicts);
      }

      // Step 7: Sort and limit results
      const sortedConflicts = this.sortConflicts(verifiedConflicts);
      const limitedConflicts = sortedConflicts.slice(0, query.options.maxResults || 50);

      // Step 8: Build result
      const result = this.buildSearchResult(query, limitedConflicts, startTime);

      // Step 9: Cache result
      await this.cacheResult(query, result);

      // Step 10: Record metrics
      searchCounter.inc({ status: 'success', source: 'database' });
      timer({ status: 'success' });

      logger.info({
        duration: result.metadata.duration,
        resultsCount: result.conflicts.length,
      }, 'Search completed successfully');

      return result;

    } catch (error) {
      searchCounter.inc({ status: 'error', source: 'unknown' });
      timer({ status: 'error' });
      
      logger.error({ err: error }, 'Search failed');
      throw error;
    }
  }

  private async searchDatabase(query: SearchQuery): Promise<any[]> {
    return await this.repository.searchByMark(query.markText, query.niceClasses);
  }

  private analyzeConflicts(query: SearchQuery, trademarks: Trademark[]): TrademarkConflict[] {
    return trademarks.map(trademark => {
      const similarity = this.similarityEngine.calculateSimilarity(
        query.markText,
        trademark.markText
      );

      const risk = this.riskEngine.assessRisk({
        similarityScore: similarity.overallScore,
        queryClasses: query.niceClasses,
        resultClasses: trademark.niceClasses,
        status: trademark.status,
      });

      return new TrademarkConflict(
        trademark,
        similarity.overallScore,
        similarity,
        risk.level,
        risk.explanation,
        false
      );
    });
  }

  private async verifyConflicts(conflicts: TrademarkConflict[]): Promise<TrademarkConflict[]> {
    const topConflicts = conflicts.slice(0, 10);
    const serialNumbers = topConflicts.map(c => c.trademark.serialNumber);

    try {
      const verifications = await this.usptoApi.verifyBatch(serialNumbers);

      return conflicts.map(conflict => {
        const verification = verifications.get(conflict.trademark.serialNumber);

        if (verification && verification.verified) {
          return new TrademarkConflict(
            conflict.trademark,
            conflict.similarityScore,
            conflict.similarityBreakdown,
            conflict.riskLevel,
            conflict.riskExplanation,
            true,
            verification.status,
            verification.verifiedAt
          );
        }

        return conflict;
      });
    } catch (error) {
      logger.error({ err: error }, 'USPTO verification failed');
      return conflicts;
    }
  }

  private sortConflicts(conflicts: TrademarkConflict[]): TrademarkConflict[] {
    const riskOrder = { high: 3, medium: 2, low: 1 };

    return [...conflicts].sort((a, b) => {
      const riskDiff = riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      if (riskDiff !== 0) return riskDiff;
      return b.similarityScore - a.similarityScore;
    });
  }

  private buildSearchResult(
    query: SearchQuery,
    conflicts: TrademarkConflict[],
    startTime: number
  ): SearchResult {
    const summary = this.generateSummary(conflicts);
    const metadata = {
      searchedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
      sources: this.getSourcesList(query),
      cached: false,
    };

    return new SearchResult(query, conflicts, summary, { domains: [], social: [], webSearch: null }, metadata);
  }

  private generateSummary(conflicts: TrademarkConflict[]) {
    const highRisk = conflicts.filter(c => c.riskLevel === 'high').length;
    const mediumRisk = conflicts.filter(c => c.riskLevel === 'medium').length;
    const lowRisk = conflicts.filter(c => c.riskLevel === 'low').length;
    const verifiedCount = conflicts.filter(c => c.verified).length;

    let overallRisk: 'low' | 'medium' | 'high' = 'low';
    if (highRisk > 0) overallRisk = 'high';
    else if (mediumRisk > 2) overallRisk = 'high';
    else if (mediumRisk > 0) overallRisk = 'medium';

    return {
      totalResults: conflicts.length,
      highRisk,
      mediumRisk,
      lowRisk,
      overallRisk,
      verifiedCount,
    };
  }

  private getSourcesList(query: SearchQuery): string[] {
    const sources = ['USPTO Database'];
    if (query.shouldVerifyWithUSPTO()) sources.push('USPTO Live Verification');
    return sources;
  }

  private async getCachedResult(query: SearchQuery): Promise<SearchResult | null> {
    return await this.cacheManager.get<SearchResult>(query.getCacheKey());
  }

  private async cacheResult(query: SearchQuery, result: SearchResult): Promise<void> {
    await this.cacheManager.set(query.getCacheKey(), result, 3600);
  }
}