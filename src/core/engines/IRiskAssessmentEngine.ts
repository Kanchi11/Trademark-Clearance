export interface SimilarityBreakdown {
  overallScore: number;
  exact: number;
  visual: number;
  phonetic: number;
  fuzzy: number;
}

export interface RiskAssessmentInput {
  similarityScore: number;
  similarityBreakdown?: SimilarityBreakdown;
  queryClasses: number[];
  resultClasses: number[];
  status: 'live' | 'dead' | 'pending' | 'abandoned';
}

export interface RiskAssessmentResult {
  level: 'low' | 'medium' | 'high';
  explanation: string;
}

export interface IRiskAssessmentEngine {
  assessRisk(input: RiskAssessmentInput): RiskAssessmentResult;
}