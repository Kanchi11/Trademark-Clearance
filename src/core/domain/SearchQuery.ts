/**
 * Domain Entity: Search Query
 * Represents a trademark search request
 */

export class SearchQuery {
    constructor(
      public readonly markText: string,
      public readonly niceClasses: number[],
      public readonly options: SearchOptions
    ) {
      this.validate();
    }
  
    /**
     * Validate the search query
     */
    private validate(): void {
      if (!this.markText || this.markText.trim().length < 2) {
        throw new Error('Mark text must be at least 2 characters');
      }
  
      if (!this.niceClasses || this.niceClasses.length === 0) {
        throw new Error('At least one Nice class must be specified');
      }
  
      if (this.niceClasses.some(c => c < 1 || c > 45)) {
        throw new Error('Nice classes must be between 1 and 45');
      }
    }
  
    /**
     * Get normalized mark text for searching
     */
    getNormalizedMarkText(): string {
      return this.markText.toLowerCase().replace(/\s+/g, '');
    }
  
    /**
     * Generate cache key for this query
     */
    getCacheKey(): string {
      const normalized = this.getNormalizedMarkText();
      const classes = [...this.niceClasses].sort().join(',');
      return `search:${normalized}:${classes}`;
    }
  
    /**
     * Should we include USPTO verification?
     */
    shouldVerifyWithUSPTO(): boolean {
      return this.options.includeUSPTOVerification ?? true;
    }
  
    /**
     * Should we bypass cache?
     */
    shouldBypassCache(): boolean {
      return this.options.forceRefresh ?? false;
    }
  
    /**
     * Convert to plain object
     */
    toJSON() {
      return {
        markText: this.markText,
        niceClasses: this.niceClasses,
        options: this.options,
      };
    }
  }
  
  export interface SearchOptions {
    includeUSPTOVerification?: boolean;
    includeDomainCheck?: boolean;
    includeSocialCheck?: boolean;
    includeWebSearch?: boolean;
    forceRefresh?: boolean;
    maxResults?: number;
  }