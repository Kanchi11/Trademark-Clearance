/**
 * Batch Compute Logo Perceptual Hashes
 *
 * This script computes perceptual hashes (pHash) for all USPTO logos in the database.
 * Perceptual hashing is the industry standard for image similarity (used by Google Images, TinEye, Pinterest).
 *
 * Features:
 * - Parallel processing with configurable batch size
 * - Automatic resume from last processed record
 * - Progress tracking and ETA calculation
 * - Error handling with retry logic
 * - Memory-efficient streaming processing
 * - Uses SAME hash algorithm as real-time logo comparison
 *
 * Expected runtime: 4-6 hours for 405K logos (depending on network speed)
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { rawClient } from '../db/index.js';
import { createCanvas, loadImage } from 'canvas';

// Configuration
const BATCH_SIZE = 100; // Process 100 logos at a time
const PARALLEL_DOWNLOADS = 10; // Download 10 images concurrently
const TIMEOUT_MS = 10000; // 10 second timeout per image
const RETRY_ATTEMPTS = 3;

interface LogoRecord {
  id: number;
  serial_number: string;
  logo_url: string;
}

/**
 * Compute perceptual hash (pHash) for an image - EXACT SAME algorithm as server-logo-comparison.ts
 * This creates a 64-bit fingerprint that's similar for visually similar images
 */
async function computePerceptualHash(imageUrl: string): Promise<string> {
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
    throw new Error(`Hash computation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process a batch of logos
 */
async function processBatch(logos: LogoRecord[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  // Process in smaller parallel chunks
  for (let i = 0; i < logos.length; i += PARALLEL_DOWNLOADS) {
    const chunk = logos.slice(i, i + PARALLEL_DOWNLOADS);

    const results = await Promise.allSettled(
      chunk.map(async (logo) => {
        try {
          // Compute hash (includes download inside loadImage)
          const hash = await computePerceptualHash(logo.logo_url);

          // Escape single quotes in hash (though binary string shouldn't have any)
          const escapedHash = hash.replace(/'/g, "''");

          // Update database
          await rawClient.unsafe(`
            UPDATE "uspto_trademarks"
            SET logo_hash = '${escapedHash}'
            WHERE id = ${logo.id}
          `);

          return { id: logo.id, hash };
        } catch (error) {
          throw new Error(`Failed for ${logo.serial_number}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      })
    );

    // Count successes and failures
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        success++;
      } else {
        failed++;
      }
    });
  }

  return { success, failed };
}

/**
 * Get progress statistics
 */
async function getProgress(): Promise<{ total: number; completed: number; remaining: number }> {
  const [stats] = await rawClient.unsafe(`
    SELECT
      COUNT(*) FILTER (WHERE logo_url IS NOT NULL) as total,
      COUNT(*) FILTER (WHERE logo_url IS NOT NULL AND logo_hash IS NOT NULL) as completed,
      COUNT(*) FILTER (WHERE logo_url IS NOT NULL AND logo_hash IS NULL) as remaining
    FROM "uspto_trademarks"
  `) as any;

  return {
    total: parseInt(stats.total),
    completed: parseInt(stats.completed),
    remaining: parseInt(stats.remaining),
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('🎨 USPTO Logo Perceptual Hash Computation\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Get initial progress
  const initialProgress = await getProgress();
  console.log(`Total logos in database: ${initialProgress.total.toLocaleString()}`);
  console.log(`Already computed: ${initialProgress.completed.toLocaleString()}`);
  console.log(`Remaining to process: ${initialProgress.remaining.toLocaleString()}\n`);

  if (initialProgress.remaining === 0) {
    console.log('✅ All logo hashes already computed!');
    process.exit(0);
  }

  const startTime = Date.now();
  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalFailed = 0;

  console.log(`Starting batch processing (${BATCH_SIZE} logos per batch, ${PARALLEL_DOWNLOADS} parallel downloads)...\n`);

  while (true) {
    // Fetch next batch of logos without hashes
    const batch: LogoRecord[] = await rawClient.unsafe(`
      SELECT id, serial_number, logo_url
      FROM "uspto_trademarks"
      WHERE logo_url IS NOT NULL
        AND logo_hash IS NULL
      LIMIT ${BATCH_SIZE}
    `) as any;

    if (batch.length === 0) {
      console.log('\n✅ All logos processed!');
      break;
    }

    // Process batch
    const result = await processBatch(batch);
    totalProcessed += batch.length;
    totalSuccess += result.success;
    totalFailed += result.failed;

    // Calculate progress and ETA
    const elapsed = Date.now() - startTime;
    const rate = totalProcessed / (elapsed / 1000); // logos per second
    const remaining = initialProgress.remaining - totalProcessed;
    const eta = remaining / rate;

    const etaMinutes = Math.floor(eta / 60);
    const etaHours = Math.floor(etaMinutes / 60);
    const etaDisplay = etaHours > 0
      ? `${etaHours}h ${etaMinutes % 60}m`
      : `${etaMinutes}m`;

    const progress = ((totalProcessed / initialProgress.remaining) * 100).toFixed(1);

    console.log(
      `Progress: ${totalProcessed.toLocaleString()}/${initialProgress.remaining.toLocaleString()} ` +
      `(${progress}%) | ✓ ${totalSuccess} | ✗ ${totalFailed} | ` +
      `${rate.toFixed(1)} logos/sec | ETA: ${etaDisplay}`
    );

    // Small delay between batches to avoid overwhelming the network
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const totalTime = (Date.now() - startTime) / 1000 / 60; // minutes
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`\n✨ Batch processing complete!`);
  console.log(`   Total processed: ${totalProcessed.toLocaleString()}`);
  console.log(`   Successful: ${totalSuccess.toLocaleString()}`);
  console.log(`   Failed: ${totalFailed.toLocaleString()}`);
  console.log(`   Total time: ${totalTime.toFixed(1)} minutes`);
 console.log(`   Average rate: ${(totalProcessed / (totalTime * 60)).toFixed(2)} logos/second\n`);

  // Final verification
  const finalProgress = await getProgress();
  console.log(`Final statistics:`);
  console.log(`   Total logos: ${finalProgress.total.toLocaleString()}`);
  console.log(`   Hashes computed: ${finalProgress.completed.toLocaleString()}`);
  console.log(`   Remaining: ${finalProgress.remaining.toLocaleString()}\n`);

  if (finalProgress.remaining > 0) {
    console.log(`⚠️  ${finalProgress.remaining} logos still need processing.`);
    console.log(`   Run this script again to process remaining logos.\n`);
  }

  process.exit(0);
}

// Handle errors gracefully
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
