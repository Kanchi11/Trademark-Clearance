export interface RiskAssessmentInput {
    similarityScore: number;
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