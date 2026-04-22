/**
 * Basic Logo/Image Similarity using Perceptual Hashing
 * Industry-standard approach: pHash algorithm (simplified for browser)
 * Used by TinEye, Google Images, and trademark search tools
 */

/**
 * Calculate perceptual hash of an image
 * This creates a "fingerprint" that's resistant to minor changes
 * Returns a hash string that can be compared for similarity
 */
export async function calculateImageHash(imageDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // Create canvas and resize to 8x8 for hash (industry standard)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Resize to 8x8 (removes high-frequency patterns, keeps structure)
        canvas.width = 8;
        canvas.height = 8;

        // Draw grayscale image
        ctx.drawImage(img, 0, 0, 8, 8);
        const imageData = ctx.getImageData(0, 0, 8, 8);
        const pixels = imageData.data;

        // Convert to grayscale and calculate average
        const grayscale: number[] = [];
        for (let i = 0; i < pixels.length; i += 4) {
          const gray = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
          grayscale.push(gray);
        }

        // Calculate average grayscale value
        const avg = grayscale.reduce((a, b) => a + b, 0) / grayscale.length;

        // Create hash: 1 if above average, 0 if below
        let hash = '';
        for (const gray of grayscale) {
          hash += gray > avg ? '1' : '0';
        }

        resolve(hash);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

/**
 * Calculate Hamming distance between two hashes
 * Returns similarity percentage (0-100)
 * 0 = completely different, 100 = identical
 */
export function compareImageHashes(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error('Hashes must be the same length');
  }

  let differences = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      differences++;
    }
  }

  // Calculate similarity percentage
  const similarity = ((hash1.length - differences) / hash1.length) * 100;
  return Math.round(similarity);
}

/**
 * Determine if two images are visually similar
 * Using industry thresholds:
 * - >= 90%: Near-identical (likely infringement)
 * - 80-89%: Very similar (high risk)
 * - 70-79%: Similar (medium risk)
 * - < 70%: Different (low risk)
 */
export function assessLogoSimilarity(similarity: number): {
  score: number;
  riskLevel: 'high' | 'medium' | 'low';
  explanation: string;
} {
  if (similarity >= 90) {
    return {
      score: similarity,
      riskLevel: 'high',
      explanation: 'Near-identical logo. Strong likelihood of visual confusion.',
    };
  } else if (similarity >= 80) {
    return {
      score: similarity,
      riskLevel: 'high',
      explanation: 'Very similar logo. High risk of confusion.',
    };
  } else if (similarity >= 70) {
    return {
      score: similarity,
      riskLevel: 'medium',
      explanation: 'Logos share visual elements. Moderate risk.',
    };
  } else {
    return {
      score: similarity,
      riskLevel: 'low',
      explanation: 'Logos are visually distinct.',
    };
  }
}

/**
 * Extract dominant colors from image (additional similarity metric)
 * Returns top N colors in the image
 */
export async function extractDominantColors(
  imageDataUrl: string,
  numColors: number = 5
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Sample at reduced size for performance
        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);

        const imageData = ctx.getImageData(0, 0, 50, 50);
        const pixels = imageData.data;

        // Count color frequencies (simplified - group similar colors)
        const colorCounts: { [key: string]: number } = {};

        for (let i = 0; i < pixels.length; i += 4 * 10) { // Sample every 10th pixel for speed
          const r = Math.round(pixels[i] / 32) * 32; // Quantize to reduce similar colors
          const g = Math.round(pixels[i + 1] / 32) * 32;
          const b = Math.round(pixels[i + 2] / 32) * 32;

          const colorKey = `rgb(${r},${g},${b})`;
          colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
        }

        // Get top N colors
        const sortedColors = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, numColors)
          .map(([color]) => color);

        resolve(sortedColors);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}
