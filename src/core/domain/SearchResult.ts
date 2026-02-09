/**
 * Domain Entity: Search Result
 * Represents the complete result of a trademark search
 */

import { Trademark } from './Trademark';

export class SearchResult {
  constructor(
    public readonly query: SearchQuery,
    public readonly conflicts: TrademarkConflict[],
    public readonly summary: SearchSummary,
    public readonly externalChecks: ExternalChecks,
    public readonly metadata: SearchMetadata
  ) {}

  /**
   * Get high risk conflicts only
   */
  getHighRiskConflicts(): TrademarkConflict[] {
    return this.conflicts.filter(c => c.riskLevel === 'high');
  }

  /**
   * Get verified conflicts only
   */
  getVerifiedConflicts(): TrademarkConflict[] {
    return this.conflicts.filter(c => c.verified);
  }

  /**
   * Is this result from cache?
   */
  isCached(): boolean {
    return this.metadata.cached;
  }

  /**
   * Get search duration in seconds
   */
  getDurationSeconds(): number {
    return this.metadata.duration / 1000;
  }

  /**
   * Convert to API response format
   */
  toAPIResponse() {
    return {
      success: true,
      query: this.query.toJSON(),
      results: this.conflicts.map(c => c.toJSON()),
      summary: this.summary,
      externalChecks: this.externalChecks,
      metadata: this.metadata,
    };
  }

  /**
   * Convert to plain object
   */
  toJSON() {
    return {
      query: this.query.toJSON(),
      conflicts: this.conflicts.map(c => c.toJSON()),
      summary: this.summary,
      externalChecks: this.externalChecks,
      metadata: this.metadata,
    };
  }
}

export class TrademarkConflict {
  constructor(
    public readonly trademark: Trademark,
    public readonly similarityScore: number,
    public readonly similarityBreakdown: SimilarityBreakdown,
    public readonly riskLevel: RiskLevel,
    public readonly riskExplanation: string,
    public readonly verified: boolean = false,
    public readonly currentStatus?: string,
    public readonly verifiedAt?: string
  ) {}

  /**
   * Is this a high-risk conflict?
   */
  isHighRisk(): boolean {
    return this.riskLevel === 'high';
  }

  /**
   * Get similarity percentage
   */
  getSimilarityPercentage(): number {
    return Math.round(this.similarityScore);
  }

  /**
   * Convert to plain object
   */
  toJSON() {
    return {
      id: this.trademark.id,
      serialNumber: this.trademark.serialNumber,
      markText: this.trademark.markText,
      ownerName: this.trademark.ownerName,
      status: this.trademark.status,
      filingDate: this.trademark.filingDate,
      niceClasses: this.trademark.niceClasses,
      similarityScore: this.similarityScore,
      similarityBreakdown: this.similarityBreakdown,
      riskLevel: this.riskLevel,
      riskExplanation: this.riskExplanation,
      verified: this.verified,
      currentStatus: this.currentStatus,
      verifiedAt: this.verifiedAt,
    };
  }
}

export interface SimilarityBreakdown {
  overallScore: number;
  exact: number;
  visual: number;
  phonetic: number;
  fuzzy: number;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface SearchSummary {
  totalResults: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  overallRisk: RiskLevel;
  verifiedCount: number;
}

export interface ExternalChecks {
  domains: DomainCheckResult[];
  social: SocialCheckResult[];
  webSearch: WebSearchResult | null;
}

export interface DomainCheckResult {
  domain: string;
  available: boolean;
  price?: number;
  checkedAt: string;
}

export interface SocialCheckResult {
  platform: string;
  handle: string;
  available: boolean;
  url?: string;
}

export interface WebSearchResult {
  summary: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

export interface SearchMetadata {
  searchedAt: string;
  duration: number;
  sources: string[];
  cached: boolean;
  cacheHitRate?: number;
}

// Re-export for convenience
import type { SearchQuery } from './SearchQuery';