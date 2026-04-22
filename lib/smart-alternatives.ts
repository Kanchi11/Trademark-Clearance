/**
 * Smart Alternative Trademark Generator
 * Generates alternatives that are PRE-VERIFIED against USPTO database
 * Unlike the old system, this actually checks each alternative for conflicts
 */

import { TrademarkSearchService } from '@/src/core/services/TrademarkSearchService';
import { calculateRiskLevel } from './risk-assessment';

export interface VerifiedAlternative {
  text: string;
  strategy: string;
  riskLevel: 'low' | 'medium' | 'high';
  conflictCount: number;
  topConflictScore: number;
  reason: string;
}

/**
 * Generate candidate alternatives (variations to test)
 */
function generateCandidates(mark: string): Array<{ text: string; strategy: string; reason: string }> {
  const candidates: Array<{ text: string; strategy: string; reason: string }> = [];
  const lowerMark = mark.toLowerCase();

  // 1. Prefix variations (high success rate)
  const prefixes = ['Get', 'My', 'Go', 'The', 'Hi', 'One', 'All', 'True', 'Real', 'New'];
  prefixes.forEach(prefix => {
    candidates.push({
      text: prefix + mark,
      strategy: 'prefix',
      reason: `Adds "${prefix}" prefix for differentiation`,
    });
  });

  // 2. Suffix variations (high success rate)
  const suffixes = ['io', 'ly', 'ify', 'lab', 'hub', 'kit', 'go', 'now', 'pro', 'plus'];
  suffixes.forEach(suffix => {
    candidates.push({
      text: mark + suffix,
      strategy: 'suffix',
      reason: `Adds "${suffix}" suffix for distinction`,
    });
  });

  // 3. Strategic character changes (moderate success)
  // Replace last vowel
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  for (let i = mark.length - 1; i >= 0; i--) {
    if (vowels.includes(lowerMark[i])) {
      vowels.forEach(v => {
        if (v !== lowerMark[i]) {
          const variant = mark.substring(0, i) + v + mark.substring(i + 1);
          candidates.push({
            text: variant,
            strategy: 'vowel_swap',
            reason: `Changed vowel for phonetic variation`,
          });
        }
      });
      break; // Only change last vowel
    }
  }

  // 4. Spelling variations (creative)
  const spellingVariations: { [key: string]: string } = {
    'c': 'k',
    'k': 'c',
    's': 'z',
    'z': 's',
    'ph': 'f',
    'f': 'ph',
  };

  for (const [from, to] of Object.entries(spellingVariations)) {
    if (lowerMark.includes(from)) {
      const variant = mark.replace(new RegExp(from, 'i'), to);
      if (variant.toLowerCase() !== lowerMark) {
        candidates.push({
          text: variant,
          strategy: 'spelling',
          reason: `Alternate spelling: ${from} → ${to}`,
        });
      }
    }
  }

  // 5. Doubled letters (creative distinction)
  for (let i = 0; i < mark.length - 1; i++) {
    if (mark[i] === mark[i + 1]) continue; // Already doubled
    const variant = mark.substring(0, i + 1) + mark[i] + mark.substring(i + 1);
    candidates.push({
      text: variant,
      strategy: 'doubling',
      reason: `Doubled letter for distinction`,
    });
  }

  // Remove duplicates
  const unique = Array.from(
    new Map(candidates.map(c => [c.text.toLowerCase(), c])).values()
  ).filter(c => c.text.length >= 2 && c.text.length <= 30);

  return unique;
}

/**
 * Test an alternative against USPTO database and calculate risk
 */
async function testAlternative(
  alternativeText: string,
  niceClasses: number[],
  searchService: TrademarkSearchService
): Promise<{ riskLevel: 'low' | 'medium' | 'high'; conflictCount: number; topConflictScore: number }> {
  try {
    // Perform actual USPTO search for this alternative
    const result = await searchService.performSearch({
      markText: alternativeText,
      niceClasses,
      includeUSPTOVerification: false, // DB search is sufficient
      forceRefresh: true, // Don't use cache
    });

    // Analyze conflicts
    const conflicts = result.conflicts || [];
    const highRiskConflicts = conflicts.filter(c => c.riskLevel === 'high').length;
    const mediumRiskConflicts = conflicts.filter(c => c.riskLevel === 'medium').length;

    // Calculate top conflict score
    const topConflictScore = conflicts.length > 0
      ? Math.max(...conflicts.map(c => c.similarityBreakdown.overallScore))
      : 0;

    // Determine overall risk for this alternative
    let riskLevel: 'low' | 'medium' | 'high';
    if (highRiskConflicts > 0 || topConflictScore >= 70) {
      // ANY high-risk conflict = not suitable as alternative
      riskLevel = 'high';
    } else if (mediumRiskConflicts >= 3 || topConflictScore >= 60) {
      // Multiple medium conflicts = still risky
      riskLevel = 'medium';
    } else if (conflicts.length >= 8 && topConflictScore >= 50) {
      // Many conflicts even if low similarity = medium risk
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    return {
      riskLevel,
      conflictCount: conflicts.length,
      topConflictScore,
    };
  } catch (error) {
    console.error(`Error testing alternative "${alternativeText}":`, error);
    // On error, assume medium risk (conservative)
    return {
      riskLevel: 'medium',
      conflictCount: 999,
      topConflictScore: 50,
    };
  }
}

/**
 * Generate smart alternatives that are VERIFIED to have low risk
 * This is computationally expensive but produces reliable results
 */
export async function generateSmartAlternatives(
  markText: string,
  niceClasses: number[],
  searchService: TrademarkSearchService,
  maxResults: number = 5
): Promise<VerifiedAlternative[]> {
  console.log(`🔍 [Smart Alternatives] Generating verified alternatives for "${markText}"...`);

  // 1. Generate candidates
  const candidates = generateCandidates(markText);
  console.log(`📋 [Smart Alternatives] Generated ${candidates.length} candidates to test`);

  // 2. Test each candidate (in batches to avoid overload)
  const verifiedAlternatives: VerifiedAlternative[] = [];
  const batchSize = 3; // Test 3 at a time

  for (let i = 0; i < candidates.length && verifiedAlternatives.length < maxResults * 3; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (candidate) => {
        const testResult = await testAlternative(candidate.text, niceClasses, searchService);

        return {
          text: candidate.text,
          strategy: candidate.strategy,
          riskLevel: testResult.riskLevel,
          conflictCount: testResult.conflictCount,
          topConflictScore: testResult.topConflictScore,
          reason: candidate.reason,
        };
      })
    );

    verifiedAlternatives.push(...batchResults);

    // Stop early if we have enough LOW risk alternatives
    const lowRiskCount = verifiedAlternatives.filter(a => a.riskLevel === 'low').length;
    if (lowRiskCount >= maxResults) {
      console.log(`✅ [Smart Alternatives] Found ${lowRiskCount} low-risk alternatives, stopping early`);
      break;
    }
  }

  // 3. Sort: Low risk first, then by conflict count ascending
  const sorted = verifiedAlternatives.sort((a, b) => {
    // Risk level priority: low > medium > high
    const riskOrder = { low: 3, medium: 2, high: 1 };
    if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
      return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
    }
    // Then by conflict count (fewer is better)
    if (a.conflictCount !== b.conflictCount) {
      return a.conflictCount - b.conflictCount;
    }
    // Then by top conflict score (lower is better)
    return a.topConflictScore - b.topConflictScore;
  });

  // 4. Return ONLY LOW risk alternatives - never suggest medium/high risk
  const lowRiskAlternatives = sorted.filter(a => a.riskLevel === 'low').slice(0, maxResults);

  console.log(`✅ [Smart Alternatives] Returning ${lowRiskAlternatives.length} verified LOW risk alternatives (strict filtering)`);

  // How professional trademark search companies do this:
  // - CompuMark, Corsearch, TrademarkNow: Use linguistic algorithms + manual attorney review
  // - They check phonetic similarity (Soundex), visual similarity (edit distance), conceptual similarity (synonyms)
  // - We replicate this with: prefix/suffix variations, vowel swaps, spelling variations
  // - Each alternative is VERIFIED against USPTO database before suggesting (not just generated)
  // - We ONLY suggest LOW risk to maintain professional credibility

  return lowRiskAlternatives;
}

/**
 * Simple alternatives (for backwards compatibility - NOT RECOMMENDED)
 * Use generateSmartAlternatives instead for verified suggestions
 */
export function generateSimpleAlternatives(markText: string, limit: number = 5): string[] {
  const candidates = generateCandidates(markText);
  return candidates.slice(0, limit).map(c => c.text);
}
