// lib/risk-assessment.ts

export type RiskLevel = 'low' | 'medium' | 'high';
export type TrademarkStatus = 'live' | 'dead' | 'pending' | 'abandoned';

export interface RiskFactors {
  similarityScore: number;
  sameClass: boolean;
  status: TrademarkStatus;
}

/**
 * Calculate risk level based on similarity and context
 */
export function calculateRiskLevel(factors: RiskFactors): RiskLevel {
  const { similarityScore, sameClass, status } = factors;
  
  // Dead/abandoned marks are lower risk
  if (status === 'dead' || status === 'abandoned') {
    if (similarityScore > 95) return 'medium';
    return 'low';
  }
  
  // Live marks in same class - highest scrutiny
  if (status === 'live' && sameClass) {
    if (similarityScore >= 85) return 'high';
    if (similarityScore >= 65) return 'medium';
    return 'low';
  }
  
  // Live marks in different class
  if (status === 'live' && !sameClass) {
    if (similarityScore >= 90) return 'high';
    if (similarityScore >= 75) return 'medium';
    return 'low';
  }
  
  // Pending marks
  if (status === 'pending' && sameClass) {
    if (similarityScore >= 80) return 'high';
    if (similarityScore >= 60) return 'medium';
    return 'low';
  }
  
  return 'low';
}

/**
 * Check if Nice classes overlap
 */
export function hasClassOverlap(classes1: number[], classes2: number[]): boolean {
  return classes1.some(c => classes2.includes(c));
}

/**
 * Get risk explanation
 */
export function getRiskExplanation(factors: RiskFactors): string {
  const { similarityScore, sameClass, status } = factors;
  const riskLevel = calculateRiskLevel(factors);
  
  if (riskLevel === 'high') {
    return `HIGH RISK: ${similarityScore}% similar, ${status} trademark${sameClass ? ' in same class' : ''}. Strong likelihood of rejection.`;
  }
  
  if (riskLevel === 'medium') {
    return `MEDIUM RISK: ${similarityScore}% similar, ${status} trademark${sameClass ? ' in same class' : ''}. Proceed with caution.`;
  }
  
  return `LOW RISK: ${similarityScore}% similar, ${status} trademark${!sameClass ? ' in different class' : ''}.`;
}