// lib/similarity.ts

import { distance } from 'fastest-levenshtein';
import stringSimilarity from 'string-similarity';

const metaphone = require('metaphone');

/**
 * Soundex algorithm for phonetic matching
 */
export function soundex(str: string): string {
  const a = str.toUpperCase().split('');
  const firstLetter = a.shift();
  
  if (!firstLetter) return '';
  
  const codes: Record<string, string> = {
    A: '', E: '', I: '', O: '', U: '', H: '', W: '', Y: '',
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6'
  };
  
  const coded = a
    .map(letter => codes[letter] || '')
    .filter((code, index, array) => code !== '' && code !== array[index - 1]);
  
  return (firstLetter + coded.join('') + '000').slice(0, 4);
}

/**
 * Metaphone - better phonetic algorithm
 */
export function getMetaphone(str: string): string {
  try {
    return metaphone(str) || str.substring(0, 4).toUpperCase();
  } catch {
    return str.substring(0, 4).toUpperCase();
  }
}

/**
 * Levenshtein distance (edit distance)
 */
export function levenshteinSimilarity(mark1: string, mark2: string): number {
  const str1 = mark1.toLowerCase();
  const str2 = mark2.toLowerCase();
  
  const dist = distance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  
  if (maxLength === 0) return 100;
  
  const similarity = ((maxLength - dist) / maxLength) * 100;
  return Math.round(similarity);
}

/**
 * Exact match check
 */
export function exactMatch(mark1: string, mark2: string): boolean {
  return mark1.toLowerCase() === mark2.toLowerCase();
}

/**
 * Phonetic similarity using both Soundex and Metaphone
 */
export function phoneticSimilarity(mark1: string, mark2: string): number {
  const soundexMatch = soundex(mark1) === soundex(mark2);
  const metaphoneMatch = getMetaphone(mark1) === getMetaphone(mark2);
  
  return (soundexMatch || metaphoneMatch) ? 100 : 0;
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
 */
export function calculateSimilarity(mark1: string, mark2: string): number {
  const exact = exactMatch(mark1, mark2) ? 100 : 0;
  const visual = levenshteinSimilarity(mark1, mark2);
  const phonetic = phoneticSimilarity(mark1, mark2);
  const fuzzy = diceCoefficientSimilarity(mark1, mark2);
  
  // Weighted combination
  const score = (
    exact * 0.40 +
    visual * 0.30 +
    phonetic * 0.20 +
    fuzzy * 0.10
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
    exact * 0.40 +
    visual * 0.30 +
    phonetic * 0.20 +
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