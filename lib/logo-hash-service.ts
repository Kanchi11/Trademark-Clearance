/**
 * FREE Logo Similarity Service - Uses JSON file instead of database
 *
 * Benefits:
 * - No database storage (saves 35+ MB)
 * - Fast in-memory lookups (<10ms)
 * - Works on free Supabase tier
 * - Easy to update/maintain
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// In-memory hash storage
let logoHashMap: Record<number, string> = {};
let initialized = false;

/**
 * Load logo hashes from JSON file into memory
 */
export function initializeLogoHashes(): void {
  if (initialized) return;

  try {
    const hashFilePath = join(process.cwd(), 'public', 'logo-hashes.json');
    const data = readFileSync(hashFilePath, 'utf-8');
    logoHashMap = JSON.parse(data);
    initialized = true;
    console.log(`✅ Loaded ${Object.keys(logoHashMap).length.toLocaleString()} logo hashes into memory`);
  } catch (error) {
    console.warn('⚠️  Logo hash file not found - logo similarity disabled');
    logoHashMap = {};
    initialized = true;
  }
}

/**
 * Get hash for a trademark ID
 */
export function getLogoHash(trademarkId: number): string | null {
  if (!initialized) initializeLogoHashes();
  return logoHashMap[trademarkId] || null;
}

/**
 * Calculate Hamming distance between two hashes
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return 64; // Max distance

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
}

/**
 * Calculate similarity percentage (0-100)
 */
export function calculateSimilarity(hash1: string, hash2: string): number {
  const distance = hammingDistance(hash1, hash2);
  const maxDistance = hash1.length;
  return Math.round(((maxDistance - distance) / maxDistance) * 100);
}

/**
 * Find similar logos using in-memory hash comparison
 *
 * @param userHash - Hash of user's uploaded logo
 * @param trademarkIds - List of trademark IDs to check against
 * @param threshold - Minimum similarity percentage (default 75)
 */
export function findSimilarLogos(
  userHash: string,
  trademarkIds: number[],
  threshold: number = 75
): Array<{ trademarkId: number; similarity: number }> {
  if (!initialized) initializeLogoHashes();

  const results: Array<{ trademarkId: number; similarity: number }> = [];

  for (const id of trademarkIds) {
    const logoHash = logoHashMap[id];
    if (!logoHash) continue;

    const similarity = calculateSimilarity(userHash, logoHash);
    if (similarity >= threshold) {
      results.push({ trademarkId: id, similarity });
    }
  }

  // Sort by similarity (highest first)
  return results.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Check if logo hashes are available
 */
export function areLogoHashesAvailable(): boolean {
  if (!initialized) initializeLogoHashes();
  return Object.keys(logoHashMap).length > 0;
}

/**
 * Get statistics about loaded hashes
 */
export function getHashStats() {
  if (!initialized) initializeLogoHashes();

  return {
    total: Object.keys(logoHashMap).length,
    initialized,
    memorySize: JSON.stringify(logoHashMap).length,
  };
}
