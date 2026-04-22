/**
 * Enhanced logo comparison with color histogram and aspect ratio
 * Provides faster pre-filtering and better accuracy
 */
import { createCanvas, loadImage } from 'canvas';
import { calculateImageHash, compareImageHashes } from './server-logo-comparison';

/**
 * Calculate color histogram for an image
 * Returns a compact representation of color distribution
 */
export async function calculateColorHistogram(imageUrl: string): Promise<string> {
  try {
    const image = await loadImage(imageUrl);

    // Create canvas
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const pixels = imageData.data;

    // Create color histogram (8 bins for R, G, B = 512 total bins, but we simplify)
    // We use 16 bins per channel (4 bits) = 4096 combinations
    // But we simplify to dominant colors

    const colorCounts: Record<string, number> = {};

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      // Skip透明pixels
      if (a < 128) continue;

      // Quantize to 16 levels per channel (reduce from 256)
      const rBin = Math.floor(r / 16);
      const gBin = Math.floor(g / 16);
      const bBin = Math.floor(b / 16);

      const colorKey = `${rBin},${gBin},${bBin}`;
      colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
    }

    // Get top 10 dominant colors
    const sortedColors = Object.entries(colorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([color, count]) => ({
        color,
        percentage: Math.round((count / (pixels.length / 4)) * 100)
      }));

    // Return as JSON string
    return JSON.stringify(sortedColors);
  } catch (error) {
    console.error('Error calculating color histogram:', error);
    throw error;
  }
}

/**
 * Calculate aspect ratio of an image
 * Returns as "width:height" string (e.g., "16:9", "1:1", "3:2")
 */
export async function calculateAspectRatio(imageUrl: string): Promise<string> {
  try {
    const image = await loadImage(imageUrl);
    const width = image.width;
    const height = image.height;

    // Find GCD to simplify ratio
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(width, height);

    const ratioW = width / divisor;
    const ratioH = height / divisor;

    // If ratio is too complex, round to common ratios
    if (ratioW > 20 || ratioH > 20) {
      // Classify into common aspect ratios
      const decimal = width / height;

      if (Math.abs(decimal - 1.0) < 0.1) return '1:1'; // Square
      if (Math.abs(decimal - 1.33) < 0.1) return '4:3';
      if (Math.abs(decimal - 1.5) < 0.1) return '3:2';
      if (Math.abs(decimal - 1.78) < 0.1) return '16:9';
      if (Math.abs(decimal - 2.0) < 0.1) return '2:1';
      if (Math.abs(decimal - 0.75) < 0.1) return '3:4'; // Portrait
      if (Math.abs(decimal - 0.67) < 0.1) return '2:3'; // Portrait

      // Return simplified ratio
      return decimal > 1 ? `${Math.round(decimal * 2)}:2` : `2:${Math.round(2 / decimal)}`;
    }

    return `${ratioW}:${ratioH}`;
  } catch (error) {
    console.error('Error calculating aspect ratio:', error);
    throw error;
  }
}

/**
 * Compare color histograms for similarity
 * Returns 0-100 score
 */
export function compareColorHistograms(hist1: string, hist2: string): number {
  try {
    const colors1 = JSON.parse(hist1) as Array<{ color: string; percentage: number }>;
    const colors2 = JSON.parse(hist2) as Array<{ color: string; percentage: number }>;

    // Create color maps
    const map1 = new Map(colors1.map(c => [c.color, c.percentage]));
    const map2 = new Map(colors2.map(c => [c.color, c.percentage]));

    // Calculate intersection
    let intersection = 0;
    for (const [color, pct1] of map1) {
      const pct2 = map2.get(color);
      if (pct2) {
        intersection += Math.min(pct1, pct2);
      }
    }

    // Similarity is the intersection percentage
    return Math.round(intersection);
  } catch (error) {
    console.error('Error comparing color histograms:', error);
    return 0;
  }
}

/**
 * Check if aspect ratios are similar
 * Returns true if within 10% of each other
 */
export function aspectRatiosSimilar(ratio1: string, ratio2: string): boolean {
  try {
    const [w1, h1] = ratio1.split(':').map(Number);
    const [w2, h2] = ratio2.split(':').map(Number);

    const decimal1 = w1 / h1;
    const decimal2 = w2 / h2;

    const diff = Math.abs(decimal1 - decimal2);
    const avg = (decimal1 + decimal2) / 2;

    // Within 15% tolerance
    return (diff / avg) < 0.15;
  } catch (error) {
    return false;
  }
}

/**
 * Enhanced logo matching with color and aspect ratio pre-filtering
 */
export interface EnhancedLogoMatch {
  serialNumber: string;
  markText: string;
  logoUrl: string;
  similarity: number;
  breakdown: {
    pHashSimilarity: number;
    colorSimilarity: number;
    aspectRatioMatch: boolean;
  };
}

/**
 * Calculate comprehensive logo similarity with multiple factors
 */
export async function calculateEnhancedLogoSimilarity(
  userLogoUrl: string,
  candidateLogoUrl: string,
  userColorHist?: string,
  candidateColorHist?: string,
  userAspectRatio?: string,
  candidateAspectRatio?: string
): Promise<{similarity: number; breakdown: any}> {

  // 1. Calculate pHash similarity (primary method - 70% weight)
  const userHash = await calculateImageHash(userLogoUrl);
  const candidateHash = await calculateImageHash(candidateLogoUrl);
  const pHashSimilarity = compareImageHashes(userHash, candidateHash);

  // 2. Color similarity (20% weight) - if histograms available
  let colorSimilarity = 50; // neutral score if not available
  if (userColorHist && candidateColorHist) {
    colorSimilarity = compareColorHistograms(userColorHist, candidateColorHist);
  }

  // 3. Aspect ratio match (10% weight) - bonus for matching shapes
  let aspectRatioBonus = 50; // neutral
  if (userAspectRatio && candidateAspectRatio) {
    aspectRatioBonus = aspectRatiosSimilar(userAspectRatio, candidateAspectRatio) ? 100 : 0;
  }

  // Weighted combination
  const overallSimilarity = Math.round(
    pHashSimilarity * 0.70 +
    colorSimilarity * 0.20 +
    aspectRatioBonus * 0.10
  );

  return {
    similarity: overallSimilarity,
    breakdown: {
      pHashSimilarity,
      colorSimilarity,
      aspectRatioMatch: aspectRatioBonus === 100
    }
  };
}

/**
 * Pre-filter logos based on aspect ratio before expensive comparison
 * Saves processing time by skipping logos with very different shapes
 */
export function shouldCompareLogos(
  userAspectRatio: string,
  candidateAspectRatio: string
): boolean {
  // If we don't have aspect ratios, allow comparison
  if (!userAspectRatio || !candidateAspectRatio) return true;

  // Allow comparison if aspect ratios are similar
  return aspectRatiosSimilar(userAspectRatio, candidateAspectRatio);
}
