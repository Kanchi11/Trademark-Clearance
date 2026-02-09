/**
 * Image/Logo similarity using perceptual hashing (pHash)
 * Features:
 * - DCT-based perceptual hashing (resistant to minor changes)
 * - Hamming distance for hash comparison
 * - Color histogram comparison (as fallback)
 * - Image normalization (resize, grayscale conversion)
 */

import { createCanvas } from 'canvas';

const HASH_SIZE = 8; // 8x8 = 64-bit hash
const FREQ_SIZE = 32; // 32x32 for DCT computation

/**
 * Calculate average value of array
 */
function average(arr: number[]): number {
  const sum = arr.reduce((a, b) => a + b, 0);
  return sum / arr.length;
}

/**
 * Load image from buffer/URL and return pixel data
 */
export async function loadImage(imageBuffer: Buffer): Promise<ImageData> {
  try {
    const canvas = createCanvas(FREQ_SIZE, FREQ_SIZE);
    const ctx = canvas.getContext('2d');

    // Decode image buffer to canvas
    const { Image } = await import('canvas');
    const img = new Image();
    img.src = imageBuffer;

    ctx.drawImage(img, 0, 0, FREQ_SIZE, FREQ_SIZE);
    return ctx.getImageData(0, 0, FREQ_SIZE, FREQ_SIZE);
  } catch (err) {
    throw new Error(`Failed to load image: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Convert image to grayscale
 */
export function toGrayscale(imageData: ImageData): number[] {
  const { data } = imageData;
  const grayscale: number[] = [];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Luminance formula
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    grayscale.push(gray);
  }

  return grayscale;
}

/**
 * Discrete Cosine Transform (1D)
 */
function dct1d(values: number[]): number[] {
  const n = values.length;
  const pi = Math.PI;
  const result: number[] = [];

  for (let u = 0; u < n; u++) {
    let sum = 0;
    const cu = u === 0 ? Math.sqrt(1 / n) : Math.sqrt(2 / n);

    for (let x = 0; x < n; x++) {
      sum += values[x] * Math.cos((pi * (2 * x + 1) * u) / (2 * n));
    }

    result[u] = cu * sum;
  }

  return result;
}

/**
 * 2D DCT transformation
 */
function dct2d(matrix: number[][]): number[][] {
  const n = matrix.length;

  // Apply DCT to rows
  const rowsDct = matrix.map((row) => dct1d(row));

  // Apply DCT to columns
  const result: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let j = 0; j < n; j++) {
    const column = rowsDct.map((row) => row[j]);
    const columnDct = dct1d(column);
    for (let i = 0; i < n; i++) {
      result[i][j] = columnDct[i];
    }
  }

  return result;
}

/**
 * Calculate perceptual hash (pHash) of image
 */
export function calculatePerceptualHash(imageData: ImageData): string {
  // Convert to grayscale
  const grayscale = toGrayscale(imageData);

  // Reshape to 32x32 matrix
  const matrix: number[][] = [];
  for (let i = 0; i < FREQ_SIZE; i++) {
    matrix[i] = grayscale.slice(i * FREQ_SIZE, (i + 1) * FREQ_SIZE);
  }

  // Apply DCT
  const dctMatrix = dct2d(matrix);

  // Extract top-left 8x8 frequencies
  const dctFreq: number[] = [];
  for (let i = 0; i < HASH_SIZE; i++) {
    for (let j = 0; j < HASH_SIZE; j++) {
      dctFreq.push(dctMatrix[i][j]);
    }
  }

  // Calculate average (excluding DC component at [0,0])
  const avgFreq = average(dctFreq.slice(1));

  // Generate hash: 1 if frequency > average, 0 otherwise
  const hash = dctFreq.map((freq) => (freq > avgFreq ? 1 : 0)).join('');

  return hash;
}

/**
 * Calculate Hamming distance between two bit strings
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error('Hash lengths must match');
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }

  return distance;
}

/**
 * Compare two hashes and return similarity score (0-100)
 * Hamming distance of 0 = exact match (100)
 * Hamming distance of 64 = completely different (0)
 */
export function comparePerceptualHashes(hash1: string, hash2: string): number {
  const distance = hammingDistance(hash1, hash2);
  const maxDistance = hash1.length;
  const similarity = ((maxDistance - distance) / maxDistance) * 100;
  return Math.round(similarity);
}

/**
 * Color histogram comparison
 */
export function calculateColorHistogram(imageData: ImageData): number[] {
  const { data } = imageData;
  const histogram = Array(256).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Convert RGB to grayscale for histogram
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    histogram[gray]++;
  }

  return histogram;
}

/**
 * Chi-squared distance between two histograms
 */
export function compareHistograms(hist1: number[], hist2: number[]): number {
  if (hist1.length !== hist2.length) {
    throw new Error('Histogram lengths must match');
  }

  let chiSquared = 0;
  for (let i = 0; i < hist1.length; i++) {
    const bin1 = hist1[i];
    const bin2 = hist2[i];
    const sum = bin1 + bin2;

    if (sum > 0) {
      chiSquared += ((bin1 - bin2) ** 2) / sum;
    }
  }

  // Normalize to 0-100 scale (chi-squared ranges from 0 to very large)
  // Empirically: chi-squared < 500 is similar, > 2000 is very different
  const similarity = Math.max(0, 100 - chiSquared / 20);
  return Math.round(similarity);
}

/**
 * Main image similarity function
 * Combines perceptual hash + histogram for robust matching
 */
export async function calculateImageSimilarity(
  imageBuffer1: Buffer,
  imageBuffer2: Buffer
): Promise<number> {
  try {
    const img1 = await loadImage(imageBuffer1);
    const img2 = await loadImage(imageBuffer2);

    // Calculate perceptual hashes
    const hash1 = calculatePerceptualHash(img1);
    const hash2 = calculatePerceptualHash(img2);
    const hashSimilarity = comparePerceptualHashes(hash1, hash2);

    // Calculate histogram similarity
    const hist1 = calculateColorHistogram(img1);
    const hist2 = calculateColorHistogram(img2);
    const histSimilarity = compareHistograms(hist1, hist2);

    // Combine: 70% perceptual hash, 30% histogram
    const combinedScore = hashSimilarity * 0.7 + histSimilarity * 0.3;

    return Math.round(combinedScore);
  } catch (err) {
    console.error('Error calculating image similarity:', err);
    return 0;
  }
}

/**
 * Validate image buffer (basic checks)
 */
export function validateImageBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length === 0) return false;

  // Check for common image signatures
  const png = buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  const jpeg = buffer.subarray(0, 3).toString('hex') === 'ffd8ff';
  const gif = buffer.subarray(0, 3).toString('ascii') === 'GIF';
  const webp = buffer.subarray(8, 12).toString('ascii') === 'WEBP';

  return png || jpeg || gif || webp;
}
