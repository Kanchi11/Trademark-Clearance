import { db } from '@/db';
import { usptoTrademarks } from '@/db/schema';
import { sql, ilike, or } from 'drizzle-orm';
import { soundex } from '@/lib/similarity';
import Levenshtein from 'fastest-levenshtein';

export interface TrademarkMatch {
  serialNumber: string;
  markText: string;
  status: string;
  ownerName: string | null;
  niceClasses: number[];
  similarityScore: number;
  matchType: 'exact' | 'visual' | 'phonetic' | 'partial';
  riskLevel: 'high' | 'medium' | 'low';
}

export interface SearchResult {
  query: string;
  niceClasses?: number[];
  matches: TrademarkMatch[];
  summary: {
    total: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
  };
}

/**
 * Calculate similarity score between two strings (0-100)
 * Uses multiple algorithms for accuracy
 */
function calculateSimilarity(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  // Exact match
  if (q === t) return 100;

  // Levenshtein distance (edit distance)
  const maxLen = Math.max(q.length, t.length);
  const distance = Levenshtein.distance(q, t);
  const levenshteinScore = Math.max(0, 100 - (distance / maxLen) * 100);

  // Jaro-Winkler approach: check prefixes
  let prefixScore = 0;
  const maxPrefix = Math.min(4, Math.min(q.length, t.length));
  for (let i = 0; i < maxPrefix; i++) {
    if (q[i] === t[i]) prefixScore += 25; // Each of 4 chars = 25 points
  }

  // Soundex matching (phonetic)
  const qSoundex = soundex(q);
  const tSoundex = soundex(t);
  const soundexScore = qSoundex === tSoundex ? 75 : 0;

  // Substring matching
  let substringScore = 0;
  if (q.length > 3) {
    for (let i = 0; i <= q.length - 3; i++) {
      if (t.includes(q.substring(i, i + 3))) {
        substringScore = 60;
        break;
      }
    }
  }

  // Weighted average
  const score =
    levenshteinScore * 0.4 +
    prefixScore * 0.2 +
    soundexScore * 0.2 +
    substringScore * 0.2;

  return Math.round(Math.min(100, score));
}

/**
 * Assess risk level based on similarity score and other factors
 */
function assessRiskLevel(
  similarityScore: number,
  queryStatus: string,
  targetStatus: string
): 'high' | 'medium' | 'low' {
  // Dead/abandoned marks don't pose risk
  if (targetStatus === 'dead' || targetStatus === 'abandoned') {
    return 'low';
  }

  // High similarity to live/registered marks = high risk
  if (similarityScore >= 75 && (targetStatus === 'live' || targetStatus === 'registered')) {
    return 'high';
  }

  // Medium similarity to live marks = medium risk
  if (similarityScore >= 60 && targetStatus === 'live') {
    return 'medium';
  }

  // Pending applications with high similarity = medium risk (could still register)
  if (similarityScore >= 60 && targetStatus === 'pending') {
    return 'medium';
  }

  return 'low';
}

/**
 * Main search function - finds similar trademarks
 */
export async function searchTrademarks(
  markText: string,
  niceClasses?: number[]
): Promise<SearchResult> {
  if (!markText || markText.trim().length === 0) {
    return {
      query: markText,
      matches: [],
      summary: { total: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0 },
    };
  }

  try {
    // Get all trademarks (or filter by nice class if provided)
    let query = db.select().from(usptoTrademarks);

    if (niceClasses && niceClasses.length > 0) {
      // Filter by nice classes (stored as array)
      query = query.where(
        sql`${usptoTrademarks.niceClasses} && ARRAY[${niceClasses.join(',')}]`
      );
    }

    const allMarks = await query.execute();

    // Calculate similarity for each trademark
    const scored = allMarks
      .map((mark) => ({
        ...mark,
        similarityScore: calculateSimilarity(markText, mark.markText),
      }))
      .filter((mark) => mark.similarityScore >= 50) // Only keep >= 50% similar
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 50); // Top 50 results

    // Classify matches
    const matches: TrademarkMatch[] = scored.map((mark) => {
      let matchType: 'exact' | 'visual' | 'phonetic' | 'partial' = 'partial';

      if (mark.similarityScore >= 95) {
        matchType = 'exact';
      } else if (
        soundex(markText.toLowerCase()) ===
        soundex(mark.markText.toLowerCase())
      ) {
        matchType = 'phonetic';
      } else if (mark.similarityScore >= 75) {
        matchType = 'visual';
      }

      const riskLevel = assessRiskLevel(
        mark.similarityScore,
        'pending', // We don't have query status, assume pending
        mark.status
      );

      return {
        serialNumber: mark.serialNumber,
        markText: mark.markText,
        status: mark.status,
        ownerName: mark.ownerName,
        niceClasses: mark.niceClasses,
        similarityScore: mark.similarityScore,
        matchType,
        riskLevel,
      };
    });

    // Calculate summary
    const summary = {
      total: matches.length,
      highRisk: matches.filter((m) => m.riskLevel === 'high').length,
      mediumRisk: matches.filter((m) => m.riskLevel === 'medium').length,
      lowRisk: matches.filter((m) => m.riskLevel === 'low').length,
    };

    return {
      query: markText,
      niceClasses,
      matches,
      summary,
    };
  } catch (error) {
    console.error('Search error:', error);
    return {
      query: markText,
      matches: [],
      summary: { total: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0 },
    };
  }
}

/**
 * Get trademark details for a specific serial number
 */
export async function getTrademarkDetails(serialNumber: string) {
  return await db
    .select()
    .from(usptoTrademarks)
    .where(sql`${usptoTrademarks.serialNumber} = ${serialNumber}`)
    .limit(1)
    .execute()
    .then((results) => results[0] || null);
}
