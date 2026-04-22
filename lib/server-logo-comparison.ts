/**
 * Server-side logo similarity comparison using perceptual hashing
 * Uses node-canvas for server-side image processing
 */
import { createCanvas, loadImage, Canvas } from 'canvas';
import { initializeLogoHashesFromJSONL, getAllLogoHashes } from './logo-hash-jsonl-service';

/**
 * Calculate perceptual hash (pHash) for an image
 * Returns a 64-bit binary hash as a string
 */
export async function calculateImageHash(imageUrl: string): Promise<string> {
  try {
    // Load image from URL
    const image = await loadImage(imageUrl);

    // Create 8x8 canvas for hash calculation
    const canvas = createCanvas(8, 8);
    const ctx = canvas.getContext('2d');

    // Draw image scaled to 8x8
    ctx.drawImage(image, 0, 0, 8, 8);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, 8, 8);
    const pixels = imageData.data;

    // Convert to grayscale
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

    return hash;
  } catch (error) {
    console.error('Error calculating image hash:', error);
    throw error;
  }
}

/**
 * Calculate Hamming distance between two hashes
 * Returns number of differing bits
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error('Hashes must be the same length');
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
 * Compare two image hashes and return similarity percentage
 * Returns 0-100 (100 = identical, 0 = completely different)
 */
export function compareImageHashes(hash1: string, hash2: string): number {
  const distance = hammingDistance(hash1, hash2);
  const maxDistance = hash1.length; // 64 for our 8x8 hash
  const similarity = ((maxDistance - distance) / maxDistance) * 100;
  return Math.round(similarity);
}

/**
 * Compare user's logo against a list of USPTO logos
 * Returns conflicts with similarity >= threshold (default 75%)
 */
export async function compareLogoAgainstUSPTO(
  userLogoUrl: string,
  usptoLogos: Array<{ serialNumber: string; markText: string; logoUrl: string }>,
  threshold: number = 75
): Promise<Array<{ serialNumber: string; markText: string; logoUrl: string; similarity: number }>> {
  console.log(`\n🔍 [Logo Comparison] Starting comparison`);
  console.log(`   User logo: ${userLogoUrl.substring(0, 50)}...`);
  console.log(`   USPTO logos to check: ${usptoLogos.length}`);
  console.log(`   Threshold: ${threshold}%`);

  try {
    // Calculate hash for user's logo
    console.log(`   Calculating hash for user's logo...`);
    const userHash = await calculateImageHash(userLogoUrl);
    console.log(`   ✓ User logo hash: ${userHash}`);

    const conflicts: Array<{ serialNumber: string; markText: string; logoUrl: string; similarity: number }> = [];
    let successCount = 0;
    let failCount = 0;

    // Compare against each USPTO logo
    for (const usptoLogo of usptoLogos) {
      try {
        const usptoHash = await calculateImageHash(usptoLogo.logoUrl);
        const similarity = compareImageHashes(userHash, usptoHash);

        successCount++;

        if (similarity >= threshold) {
          console.log(`   ✅ MATCH: ${usptoLogo.markText} (${usptoLogo.serialNumber}) - ${similarity}%`);
          conflicts.push({
            serialNumber: usptoLogo.serialNumber,
            markText: usptoLogo.markText,
            logoUrl: usptoLogo.logoUrl,
            similarity,
          });
        } else if (similarity >= threshold - 10) {
          console.log(`   ⚠️  Near: ${usptoLogo.markText} - ${similarity}% (need ${threshold}%)`);
        }
      } catch (error) {
        failCount++;
        if (failCount <= 3) {
          console.error(`   ❌ Failed ${usptoLogo.serialNumber}:`, (error as Error).message);
        }
      }
    }

    console.log(`\n📊 [Logo Comparison] Results:`);
    console.log(`   Successfully compared: ${successCount}/${usptoLogos.length}`);
    console.log(`   Failed to load: ${failCount}`);
    console.log(`   Conflicts found: ${conflicts.length}`);

    if (conflicts.length > 0) {
      console.log(`   Top matches:`);
      conflicts.slice(0, 3).forEach(c => {
        console.log(`     - ${c.markText}: ${c.similarity}%`);
      });
    } else {
      console.log(`   ℹ️  No matches above ${threshold}% threshold`);
    }

    // Sort by similarity (highest first)
    return conflicts.sort((a, b) => b.similarity - a.similarity);
  } catch (error) {
    console.error('❌ [Logo Comparison] Fatal error:', error);
    return [];
  }
}

/**
 * Check if a logo URL is accessible and valid
 */
export async function isLogoAccessible(logoUrl: string): Promise<boolean> {
  try {
    const response = await fetch(logoUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * EFFICIENT: Find similar logos using pre-computed hashes from database
 * Optimized for speed with exact match detection and early termination
 */

export async function findSimilarLogosEfficient(
  userLogoUrl: string,
  niceClasses: number[],
  threshold: number = 75
): Promise<Array<{ serialNumber: string; markText: string; logoUrl: string; similarity: number }>> {
  // Use JSONL hash file for similarity
  initializeLogoHashesFromJSONL();
  console.log(`\n🚀 [Efficient Logo Search: JSONL]`);
  console.log(`   User logo: ${userLogoUrl.substring(0, 50)}...`);
  console.log(`   Nice classes: [${niceClasses.join(', ')}]`);
  console.log(`   Threshold: ${threshold}%`);

  try {
    // STEP 1: Calculate hash for user's logo
    const userHash = await calculateImageHash(userLogoUrl);
    console.log(`   ✓ User logo hash: ${userHash}`);

    // STEP 2: Compare against all loaded hashes
    const allLogoHashes = getAllLogoHashes();
    const results: Array<{ serialNumber: string; markText: string; logoUrl: string; similarity: number }> = [];

    for (const entry of allLogoHashes) {
      const similarity = compareImageHashes(userHash, entry.logoHash);
      if (similarity >= threshold) {
        results.push({
          serialNumber: entry.serialNumber,
          markText: '', // markText not available in JSONL, can be fetched if needed
          logoUrl: '',  // logoUrl not available in JSONL, can be fetched if needed
          similarity,
        });
      }
    }

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);
    // Limit to top 50
    return results.slice(0, 50);
  } catch (error) {
    console.error('❌ [Efficient Logo Search: JSONL] Error:', error);
    return [];
  }
}

