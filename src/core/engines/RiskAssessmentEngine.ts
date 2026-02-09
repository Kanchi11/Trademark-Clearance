import { injectable } from 'inversify';
import { IRiskAssessmentEngine, RiskAssessmentInput, RiskAssessmentResult } from './IRiskAssessmentEngine';
import { calculateRiskLevel, getRiskExplanation } from '../../../lib/risk-assessment';

@injectable()
export class RiskAssessmentEngine implements IRiskAssessmentEngine {
  
  assessRisk(input: RiskAssessmentInput): RiskAssessmentResult {
    const hasClassOverlap = input.queryClasses.some(qc => 
      input.resultClasses.includes(qc)
    );

    const level = calculateRiskLevel({
      similarityScore: input.similarityScore,
      sameClass: hasClassOverlap,
      status: input.status,
    });

    const explanation = getRiskExplanation({
      similarityScore: input.similarityScore,
      sameClass: hasClassOverlap,
      status: input.status,
    });

    return { level, explanation };
  }
}