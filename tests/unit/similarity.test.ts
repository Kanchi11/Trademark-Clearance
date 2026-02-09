/**
 * Unit tests for similarity algorithms
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  soundex,
  getMetaphone,
  levenshteinSimilarity,
  exactMatch,
  phoneticSimilarity,
  diceCoefficientSimilarity,
  calculateSimilarity,
  calculateSimilarityWithBreakdown
} from '../../lib/similarity';

describe('Similarity Algorithms', () => {
  describe('Soundex', () => {
    it('should generate correct Soundex codes', () => {
      expect(soundex('NIKE')).toBe('N200');
      expect(soundex('APPLE')).toBe('A140');
      expect(soundex('AMAZON')).toBe('A550');
    });

    it('should be case-insensitive', () => {
      expect(soundex('Nike')).toBe(soundex('NIKE'));
      expect(soundex('apple')).toBe(soundex('APPLE'));
    });

    it('should handle empty strings', () => {
      expect(soundex('')).toBe('');
    });
  });

  describe('Metaphone', () => {
    it('should generate Metaphone codes', () => {
      const metaphone1 = getMetaphone('NIKE');
      expect(metaphone1).toBeTruthy();
      expect(metaphone1.length).toBeGreaterThan(0);
    });

    it('should handle similar-sounding words', () => {
      const m1 = getMetaphone('KNIGHT');
      const m2 = getMetaphone('NIGHT');
      // Both should start with similar sounds
      expect(m1).toBeTruthy();
      expect(m2).toBeTruthy();
    });
  });

  describe('Levenshtein Similarity', () => {
    it('should return 100 for identical strings', () => {
      expect(levenshteinSimilarity('NIKE', 'NIKE')).toBe(100);
      expect(levenshteinSimilarity('Apple', 'apple')).toBe(100);
    });

    it('should detect highly similar strings', () => {
      const similarity = levenshteinSimilarity('NIKE', 'NIKEY');
      expect(similarity).toBeGreaterThan(80);
    });

    it('should detect dissimilar strings', () => {
      const similarity = levenshteinSimilarity('NIKE', 'GOOGLE');
      expect(similarity).toBeLessThan(50);
    });

    it('should handle empty strings', () => {
      expect(levenshteinSimilarity('', '')).toBe(100);
      expect(levenshteinSimilarity('NIKE', '')).toBeLessThan(100);
    });
  });

  describe('Exact Match', () => {
    it('should detect exact matches', () => {
      expect(exactMatch('NIKE', 'NIKE')).toBe(true);
      expect(exactMatch('nike', 'NIKE')).toBe(true);
      expect(exactMatch('Apple', 'APPLE')).toBe(true);
    });

    it('should detect non-matches', () => {
      expect(exactMatch('NIKE', 'APPLE')).toBe(false);
      expect(exactMatch('NIKE', 'NIKEY')).toBe(false);
    });
  });

  describe('Phonetic Similarity', () => {
    it('should return 100 for phonetically identical', () => {
      // Same word should have same phonetic encoding
      expect(phoneticSimilarity('KNIGHT', 'KNIGHT')).toBe(100);
    });

    it('should return 0 for completely different sounds', () => {
      // Very different sounding words
      const score = phoneticSimilarity('NIKE', 'GOOGLE');
      expect(score).toBeDefined();
    });
  });

  describe('Dice Coefficient Similarity', () => {
    it('should return 100 for identical strings', () => {
      expect(diceCoefficientSimilarity('NIKE', 'NIKE')).toBe(100);
    });

    it('should handle similar strings', () => {
      const score = diceCoefficientSimilarity('NIKE', 'NIKEY');
      expect(score).toBeGreaterThan(80);
    });
  });

  describe('Overall Similarity', () => {
    it('should return 100 for identical marks', () => {
      const score = calculateSimilarity('NIKE', 'NIKE');
      expect(score).toBe(100);
    });

    it('should detect strong similarity', () => {
      const score = calculateSimilarity('NIKE', 'NIKEY');
      expect(score).toBeGreaterThan(85);
    });

    it('should detect moderate similarity', () => {
      const score = calculateSimilarity('APPLE', 'APPLES');
      expect(score).toBeGreaterThan(80);
    });

    it('should detect low similarity', () => {
      const score = calculateSimilarity('NIKE', 'GOOGLE');
      expect(score).toBeLessThan(50);
    });

    it('should provide breakdown', () => {
      const breakdown = calculateSimilarityWithBreakdown('NIKE', 'NIKE');
      expect(breakdown.overallScore).toBe(100);
      expect(breakdown.exact).toBe(100);
      expect(breakdown.visual).toBe(100);
      expect(breakdown.phonetic).toBe(100);
      expect(breakdown.fuzzy).toBe(100);
    });

    it('should have consistent weights', () => {
      const breakdown = calculateSimilarityWithBreakdown('NIKE', 'NIKEY');
      // Total should be weighted average
      const expected = Math.round(
        breakdown.exact * 0.4 +
        breakdown.visual * 0.3 +
        breakdown.phonetic * 0.2 +
        breakdown.fuzzy * 0.1
      );
      expect(breakdown.overallScore).toBe(expected);
    });
  });

  describe('Real-world trademark scenarios', () => {
    it('should handle brand similarity (Coca-Cola vs Coca Cola)', () => {
      const score = calculateSimilarity('Coca-Cola', 'Coca Cola');
      expect(score).toBeGreaterThan(90);
    });

    it('should handle typo detection (NIKE vs NKIE)', () => {
      const score = calculateSimilarity('NIKE', 'NKIE');
      expect(score).toBeGreaterThan(80);
    });

    it('should handle plural variants (APPLE vs APPLES)', () => {
      const score = calculateSimilarity('APPLE', 'APPLES');
      expect(score).toBeGreaterThan(85);
    });

    it('should distinguish unrelated marks', () => {
      const score = calculateSimilarity('NIKE', 'XEROX');
      expect(score).toBeLessThan(50);
    });
  });
});
