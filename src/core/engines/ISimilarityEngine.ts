export interface SimilarityBreakdown {
    overallScore: number;
    exact: number;
    visual: number;
    phonetic: number;
    fuzzy: number;
  }
  
  export interface ISimilarityEngine {
    calculateSimilarity(mark1: string, mark2: string): SimilarityBreakdown;
  }