// lib/risk-assessment.ts

export type RiskLevel = 'low' | 'medium' | 'high';
export type TrademarkStatus = 'live' | 'dead' | 'pending' | 'abandoned';

export interface SimilarityBreakdown {
  overallScore: number;
  exact: number;
  visual: number;
  phonetic: number;
  fuzzy: number;
}

export interface RiskFactors {
  similarityScore: number;
  similarityBreakdown?: SimilarityBreakdown;
  sameClass: boolean;
  status: TrademarkStatus;
}

/**
 * Calculate risk level using industry-standard multi-factor rule-based approach.
 * Inspired by CompuMark, Corsearch, and USPTO examination guidelines.
 *
 * Key principle: We examine each similarity metric independently rather than
 * relying solely on weighted averages. This is how USPTO examiners actually
 * assess likelihood of confusion.
 */
export function calculateRiskLevel(factors: RiskFactors): RiskLevel {
  const { similarityBreakdown, sameClass, status } = factors;

  // If no breakdown provided, fall back to simple scoring
  if (!similarityBreakdown) {
    return calculateRiskLevelSimple(factors);
  }

  const { exact, visual, phonetic, fuzzy } = similarityBreakdown;

  // Dead/abandoned marks are lower risk (unless exact match)
  if (status === 'dead' || status === 'abandoned') {
    if (exact >= 95) return 'medium';
    return 'low';
  }

  // NOT in same class = much lower risk threshold
  if (!sameClass) {
    // Even different class can be risky if marks are identical
    if (exact >= 90) return 'high';
    if (exact >= 75 || (phonetic >= 90 && visual >= 70)) return 'medium';
    return 'low';
  }

  // SAME CLASS - use multi-factor rules based on USPTO examination practice
  const isLive = status === 'live';

  // RULE 1: Exact match (highest priority - nearly identical text)
  if (exact >= 85) return 'high';
  if (exact >= 65) return isLive ? 'high' : 'medium';
  if (exact >= 50) return 'medium';

  // RULE 2: Phonetic similarity (sounds alike - critical for USPTO)
  // "AppleInc" vs "Apple Inn" should trigger here
  if (phonetic >= 90 && visual >= 60) {
    // Sounds identical AND looks similar
    return isLive ? 'high' : 'medium';
  }
  if (phonetic >= 85 && visual >= 50) {
    return 'medium';
  }
  if (phonetic >= 80) {
    // Sounds very similar even if looks different
    return 'medium';
  }

  // RULE 3: Visual similarity (looks alike)
  if (visual >= 85 && phonetic >= 50) {
    return isLive ? 'high' : 'medium';
  }
  if (visual >= 75) {
    return 'medium';
  }

  // RULE 4: Multiple moderate factors (cumulative risk)
  // If 3+ metrics are moderate-high, it's risky
  const highFactors = [exact, visual, phonetic, fuzzy].filter(s => s >= 60).length;
  if (highFactors >= 3) return 'medium';

  // If 2+ metrics are high, check if any are very high
  if (highFactors >= 2) {
    const maxScore = Math.max(exact, visual, phonetic, fuzzy);
    if (maxScore >= 70) return 'medium';
  }

  // RULE 5: Any single factor very high
  const maxScore = Math.max(exact, visual, phonetic, fuzzy);
  if (maxScore >= 75) return 'medium';

  // RULE 6: Fuzzy matching edge case
  if (fuzzy >= 85 && (visual >= 55 || phonetic >= 55)) {
    return 'medium';
  }

  return 'low';
}

/**
 * Simple fallback when breakdown not available (legacy support)
 */
function calculateRiskLevelSimple(factors: RiskFactors): RiskLevel {
  const { similarityScore, sameClass, status } = factors;

  if (status === 'dead' || status === 'abandoned') {
    if (similarityScore > 95) return 'medium';
    return 'low';
  }

  if (status === 'live' && sameClass) {
    if (similarityScore >= 75) return 'high';
    if (similarityScore >= 50) return 'medium';
    return 'low';
  }

  if (status === 'live' && !sameClass) {
    if (similarityScore >= 80) return 'high';
    if (similarityScore >= 65) return 'medium';
    return 'low';
  }

  if (status === 'pending' && sameClass) {
    if (similarityScore >= 70) return 'high';
    if (similarityScore >= 45) return 'medium';
    return 'low';
  }

  if (status === 'pending' && !sameClass) {
    if (similarityScore >= 75) return 'high';
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
 * Get risk explanation with details about which factors triggered the risk assessment
 */
export function getRiskExplanation(factors: RiskFactors): string {
  const { similarityScore, similarityBreakdown, sameClass, status } = factors;
  const riskLevel = calculateRiskLevel(factors);

  // Build explanation with key triggering factors
  let explanation = '';

  if (riskLevel === 'high') {
    explanation = `HIGH RISK: ${Math.round(similarityScore)}% similar, ${status} trademark${sameClass ? ' in same class' : ''}. Strong likelihood of rejection.`;

    // Add specific trigger reason
    if (similarityBreakdown) {
      if (similarityBreakdown.exact >= 85) {
        explanation += ' Nearly identical text.';
      } else if (similarityBreakdown.phonetic >= 90 && similarityBreakdown.visual >= 60) {
        explanation += ' Sounds identical and looks similar.';
      } else if (similarityBreakdown.visual >= 85) {
        explanation += ' Visually nearly identical.';
      }
    }
  } else if (riskLevel === 'medium') {
    explanation = `MEDIUM RISK: ${Math.round(similarityScore)}% similar, ${status} trademark${sameClass ? ' in same class' : ''}. Proceed with caution.`;

    // Add specific trigger reason
    if (similarityBreakdown) {
      const { exact, visual, phonetic, fuzzy } = similarityBreakdown;

      if (phonetic >= 80) {
        explanation += ' Marks sound very similar.';
      } else if (visual >= 75) {
        explanation += ' Marks look similar.';
      } else if (exact >= 50) {
        explanation += ' Partial exact match.';
      } else {
        const highCount = [exact, visual, phonetic, fuzzy].filter(s => s >= 60).length;
        if (highCount >= 2) {
          explanation += ' Multiple similarity factors elevated.';
        }
      }
    }
  } else {
    explanation = `LOW RISK: ${Math.round(similarityScore)}% similar, ${status} trademark${!sameClass ? ' in different class' : ''}.`;
  }

  return explanation;
}