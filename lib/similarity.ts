// lib/similarity.ts

import { distance } from 'fastest-levenshtein';
import stringSimilarity from 'string-similarity';
import {
  calculatePhoneticSimilarity,
  calculateVisualSimilarity,
  calculateMetaphone,
  calculateSoundex
} from './phonetic-matching';

/**
 * Legacy Soundex algorithm for backward compatibility
 */
export function soundex(str: string): string {
  return calculateSoundex(str);
}

/**
 * Metaphone - better phonetic algorithm
 */
export function getMetaphone(str: string): string {
  return calculateMetaphone(str);
}

/**
 * Levenshtein distance (edit distance) - now enhanced with visual similarity
 */
export function levenshteinSimilarity(mark1: string, mark2: string): number {
  // Use the enhanced visual similarity which includes character substitution detection
  return calculateVisualSimilarity(mark1, mark2);
}

/**
 * Exact match check
 */
export function exactMatch(mark1: string, mark2: string): boolean {
  return mark1.toLowerCase() === mark2.toLowerCase();
}

/**
 * Phonetic similarity using enhanced double metaphone + soundex
 */
export function phoneticSimilarity(mark1: string, mark2: string): number {
  // Use the improved phonetic similarity from phonetic-matching.ts
  return calculatePhoneticSimilarity(mark1, mark2);
}

/**
 * Dice Coefficient (fuzzy matching)
 */
export function diceCoefficientSimilarity(mark1: string, mark2: string): number {
  const similarity = stringSimilarity.compareTwoStrings(
    mark1.toLowerCase(),
    mark2.toLowerCase()
  );
  return Math.round(similarity * 100);
}

/**
 * MAIN: Calculate overall similarity score
 * Enhanced with better phonetic and visual matching
 */
export function calculateSimilarity(mark1: string, mark2: string): number {
  const exact = exactMatch(mark1, mark2) ? 100 : 0;
  const visual = levenshteinSimilarity(mark1, mark2); // Now includes visual char substitution
  const phonetic = phoneticSimilarity(mark1, mark2); // Now uses double-metaphone
  const fuzzy = diceCoefficientSimilarity(mark1, mark2);

  // Weighted combination (optimized weights)
  const score = (
    exact * 0.35 +      // Exact match (slightly reduced from 40%)
    visual * 0.25 +     // Visual similarity including char substitutions
    phonetic * 0.30 +   // Phonetic (increased from 20% - very important!)
    fuzzy * 0.10        // Fuzzy/trigram matching
  );

  return Math.round(score);
}

/**
 * Detailed similarity breakdown
 */
export interface SimilarityBreakdown {
  overallScore: number;
  exact: number;
  visual: number;
  phonetic: number;
  fuzzy: number;
}

export function calculateSimilarityWithBreakdown(
  mark1: string,
  mark2: string
): SimilarityBreakdown {
  const exact = exactMatch(mark1, mark2) ? 100 : 0;
  const visual = levenshteinSimilarity(mark1, mark2);
  const phonetic = phoneticSimilarity(mark1, mark2);
  const fuzzy = diceCoefficientSimilarity(mark1, mark2);

  const overallScore = Math.round(
    exact * 0.35 +
    visual * 0.25 +
    phonetic * 0.30 +
    fuzzy * 0.10
  );

  return {
    overallScore,
    exact,
    visual,
    phonetic,
    fuzzy,
  };
}