/**
 * Phonetic matching utilities for trademark text similarity
 * Uses Soundex and Double Metaphone algorithms
 */
import natural from 'natural';
import { doubleMetaphone } from 'double-metaphone';

/**
 * Generate Soundex code for a word
 * Soundex groups similar-sounding words together
 *
 * Examples:
 * - "Nike" → "N200"
 * - "Nikes" → "N220"
 * - "Night" → "N230"
 */
export function calculateSoundex(text: string): string {
  if (!text) return '';

  // Clean the text - remove special characters, keep only letters
  const cleaned = text.replace(/[^a-zA-Z\s]/g, '').trim();
  if (!cleaned) return '';

  // Take the first word for single-word trademarks
  const firstWord = cleaned.split(/\s+/)[0];

  // Use manual soundex implementation (reliable)
  return manualSoundex(firstWord);
}

/**
 * Manual Soundex implementation (fallback)
 */
function manualSoundex(str: string): string {
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
 * Generate Double Metaphone code for a word
 * More accurate than Soundex, especially for non-English names
 *
 * Examples:
 * - "Nike" → "NK"
 * - "Night" → "NT"
 * - "Apple" → "APL"
 */
export function calculateMetaphone(text: string): string {
  if (!text) return '';

  // Clean the text - remove special characters, keep only letters
  const cleaned = text.replace(/[^a-zA-Z\s]/g, '').trim();
  if (!cleaned) return '';

  // Take the first word for single-word trademarks
  const firstWord = cleaned.split(/\s+/)[0];

  try {
    // Double metaphone returns an array [primary, secondary]
    // We use the primary encoding
    const result = doubleMetaphone(firstWord);
    return result[0] || '';
  } catch (error) {
    console.error('Metaphone error:', error);
    return '';
  }
}

/**
 * Check if two words sound alike using both Soundex and Metaphone
 * Returns true if either algorithm matches
 */
export function soundsLike(word1: string, word2: string): boolean {
  if (!word1 || !word2) return false;

  const soundex1 = calculateSoundex(word1);
  const soundex2 = calculateSoundex(word2);

  const metaphone1 = calculateMetaphone(word1);
  const metaphone2 = calculateMetaphone(word2);

  return !!(soundex1 && soundex1 === soundex2) ||
         !!(metaphone1 && metaphone1 === metaphone2);
}

/**
 * Calculate phonetic similarity score (0-100)
 * Combines Soundex and Metaphone for best accuracy
 */
export function calculatePhoneticSimilarity(word1: string, word2: string): number {
  if (!word1 || !word2) return 0;

  // Exact match
  if (word1.toLowerCase() === word2.toLowerCase()) return 100;

  const soundex1 = calculateSoundex(word1);
  const soundex2 = calculateSoundex(word2);

  const metaphone1 = calculateMetaphone(word1);
  const metaphone2 = calculateMetaphone(word2);

  let score = 0;

  // Soundex match (40 points)
  if (soundex1 && soundex2 && soundex1 === soundex2) {
    score += 40;
  }

  // Metaphone match (60 points - more accurate)
  if (metaphone1 && metaphone2 && metaphone1 === metaphone2) {
    score += 60;
  }

  return score;
}

/**
 * Check for visual character similarity
 * Detects common character substitutions that look similar
 */
export function calculateVisualSimilarity(word1: string, word2: string): number {
  if (!word1 || !word2) return 0;

  const lower1 = word1.toLowerCase();
  const lower2 = word2.toLowerCase();

  // Exact match
  if (lower1 === lower2) return 100;

  // Character substitution map (what looks like what)
  const visualSubstitutions: Record<string, string[]> = {
    'o': ['0', 'ο', 'о'], // letter O vs zero vs Greek omicron vs Cyrillic o
    '0': ['o', 'ο', 'о'],
    'i': ['1', 'l', '!', 'ι'], // letter I vs one vs lowercase L vs Greek iota
    '1': ['i', 'l', '!', 'ι'],
    'l': ['i', '1', '!', 'ι'],
    's': ['5', '$', 'ѕ'], // S vs 5 vs dollar vs Cyrillic s
    '5': ['s', '$', 'ѕ'],
    'a': ['4', '@', 'α'], // A vs 4 vs at vs Greek alpha
    '4': ['a', '@', 'α'],
    'e': ['3', 'є'], // E vs 3 vs Cyrillic ye
    '3': ['e', 'є'],
    'b': ['8', 'в'], // B vs 8 vs Cyrillic v
    '8': ['b', 'в'],
    'g': ['9', 'q'],
    'z': ['2'],
    'c': ['ϲ', 'с'], // C vs Greek lunate sigma vs Cyrillic s
  };

  // Normalize both strings by replacing visual equivalents
  function normalizeVisual(str: string): string {
    let normalized = str.toLowerCase();

    // Replace all visual substitutions with their base character
    for (const [base, substitutes] of Object.entries(visualSubstitutions)) {
      for (const sub of substitutes) {
        normalized = normalized.replace(new RegExp(sub, 'g'), base);
      }
    }

    return normalized;
  }

  const norm1 = normalizeVisual(lower1);
  const norm2 = normalizeVisual(lower2);

  // If normalized versions match, return high score
  if (norm1 === norm2) return 95;

  // Calculate Levenshtein distance on normalized strings
  const distance = levenshteinDistance(norm1, norm2);
  const maxLen = Math.max(norm1.length, norm2.length);

  if (maxLen === 0) return 0;

  const similarity = ((maxLen - distance) / maxLen) * 90;
  return Math.round(similarity);
}

/**
 * Levenshtein distance (edit distance) calculation
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Combined text similarity score using multiple algorithms
 * This is what professional trademark search systems use
 */
export interface TextSimilarityResult {
  overallScore: number; // 0-100
  breakdown: {
    exact: number;
    phonetic: number;
    visual: number;
    editDistance: number;
  };
  matched: boolean; // true if overallScore >= 70
}

export function calculateTextSimilarity(
  text1: string,
  text2: string,
  threshold: number = 70
): TextSimilarityResult {
  if (!text1 || !text2) {
    return {
      overallScore: 0,
      breakdown: { exact: 0, phonetic: 0, visual: 0, editDistance: 0 },
      matched: false
    };
  }

  const lower1 = text1.toLowerCase().trim();
  const lower2 = text2.toLowerCase().trim();

  // 1. EXACT MATCH (Weight: 35%)
  const exactScore = lower1 === lower2 ? 100 : 0;

  // 2. PHONETIC SIMILARITY (Weight: 30%)
  const phoneticScore = calculatePhoneticSimilarity(text1, text2);

  // 3. VISUAL SIMILARITY (Weight: 20%)
  const visualScore = calculateVisualSimilarity(text1, text2);

  // 4. EDIT DISTANCE (Weight: 15%)
  const distance = levenshteinDistance(lower1, lower2);
  const maxLen = Math.max(lower1.length, lower2.length);
  const editScore = maxLen > 0 ? ((maxLen - distance) / maxLen) * 100 : 0;

  // WEIGHTED COMBINATION
  const overallScore = Math.round(
    exactScore * 0.35 +
    phoneticScore * 0.30 +
    visualScore * 0.20 +
    editScore * 0.15
  );

  return {
    overallScore,
    breakdown: {
      exact: exactScore,
      phonetic: phoneticScore,
      visual: visualScore,
      editDistance: Math.round(editScore)
    },
    matched: overallScore >= threshold
  };
}
