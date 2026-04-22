/**
 * SAFE Batch Compute Logo Perceptual Hashes
 *
 * This version uses batched UPDATE queries to avoid overwhelming the database.
 * Instead of 446K individual UPDATEs, we batch them into groups.
 *
 * Safety features:
 * - Dedicated connection pool (separate from app)
 * - Batched UPDATEs (100 at a time in single query)
 * - Configurable delays between batches
 * - Connection limit handling
 * - Graceful error recovery
 *
 * Expected runtime: 8-18 hours for 446K logos
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import postgres from 'postgres';
import { createCanvas, loadImage } from 'canvas';

// SAFE Configuration
const FETCH_BATCH_SIZE = 100; // Fetch 100 logos at a time
const UPDATE_BATCH_SIZE = 100; // Update 100 in single query
const PARALLEL_DOWNLOADS = 8; // Reduced from 10 to be safer
const BATCH_DELAY_MS = 500; // Wait 500ms between batches to avoid rate limits
const MAX_RETRIES = 3;

// Create DEDICATED connection pool (separate from app)
const connectionString = process.env.DATABASE_URL!;
const dedicatedClient = postgres(connectionString, {
  max: 3, // Only use 3 connections (leaves 2+ for dev server)
  idle_timeout: 20,
  connect_timeout: 30,
});

interface LogoRecord {
  id: number;
  serial_number: string;
  logo_url: string;
}

interface ProcessedLogo {
  id: number;
  serial_number: string;
  hash: string;
}

/**
 * Compute perceptual hash - same algorithm as server-logo-comparison.ts
 */
async function computePerceptualHash(imageUrl: string): Promise<string> {
  try {
    const image = await loadImage(imageUrl);
    const canvas = createCanvas(8, 8);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, 8, 8);

    const imageData = ctx.getImageData(0, 0, 8, 8);
    const pixels = imageData.data;

    const grayscale: number[] = [];
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
      grayscale.push(gray);
    }

    const avg = grayscale.reduce((a, b) => a + b, 0) / grayscale.length;

    let hash = '';
    for (const gray of grayscale) {
      hash += gray > avg ? '1' : '0';
    }

    return hash;
  } catch (error) {
    throw new Error(`Hash failed: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

/**
 * Process logos and compute hashes (doesn't update DB yet)
 */
async function processBatchHashes(logos: LogoRecord[]): Promise<ProcessedLogo[]> {
  const processed: ProcessedLogo[] = [];

  // Process in smaller parallel chunks
  for (let i = 0; i < logos.length; i += PARALLEL_DOWNLOADS) {
    const chunk = logos.slice(i, i + PARALLEL_DOWNLOADS);

    const results = await Promise.allSettled(
      chunk.map(async (logo) => {
        const hash = await computePerceptualHash(logo.logo_url);
        return { id: logo.id, serial_number: logo.serial_number, hash };
      })
    );

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        processed.push(result.value);
      }
    });
  }

  return processed;
}

/**
 * BATCHED INSERT - Insert hashes into separate trademark_logo_hashes table
 * This is more storage-efficient than updating the main table
 */
async function batchUpdateHashes(processed: ProcessedLogo[]): Promise<void> {
  if (processed.length === 0) return;

  // Build multi-row INSERT with ON CONFLICT
  // Serial number now comes directly from ProcessedLogo
  const values = processed
    .map(p => `('${p.serial_number}', '${p.hash.replace(/'/g, "''")}')`)
    .join(',\n    ');

  if (!values) return;

  const query = `
    INSERT INTO trademark_logo_hashes (serial_number, logo_hash)
    VALUES ${values}
    ON CONFLICT (serial_number) DO UPDATE
    SET logo_hash = EXCLUDED.logo_hash,
        computed_at = CURRENT_TIMESTAMP
  `;

  await dedicatedClient.unsafe(query);
}

/**
 * Get progress statistics from the new hash table
 */
async function getProgress(): Promise<{ total: number; completed: number; remaining: number }> {
  const [stats] = await dedicatedClient.unsafe(`
    SELECT
      COUNT(*) FILTER (WHERE logo_url IS NOT NULL) as total,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM trademark_logo_hashes h 
        WHERE h.serial_number = t.serial_number
      )) as completed,
      COUNT(*) FILTER (WHERE logo_url IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM trademark_logo_hashes h 
        WHERE h.serial_number = t.serial_number
      )) as remaining
    FROM uspto_trademarks t
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
  console.log('🎨 SAFE USPTO Logo Hash Computation (Batched Updates)\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Safety features:');
  console.log('  ✓ Dedicated connection pool (3 connections)');
  console.log('  ✓ Batched UPDATEs (100 logos per query)');
  console.log('  ✓ 500ms delay between batches');
  console.log('  ✓ Leaves connections for dev server\n');

  const initialProgress = await getProgress();
  console.log(`Total logos: ${initialProgress.total.toLocaleString()}`);
  console.log(`Already computed: ${initialProgress.completed.toLocaleString()}`);
  console.log(`Remaining: ${initialProgress.remaining.toLocaleString()}\n`);

  if (initialProgress.remaining === 0) {
    console.log('✅ All logo hashes already computed!');
    await dedicatedClient.end();
    process.exit(0);
  }

  const startTime = Date.now();
  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalFailed = 0;

  console.log(`Starting batch processing...\n`);

  while (true) {
    // Fetch next batch - NEWEST FIRST (reverse order) to get valid logos first
    // Older trademarks (1800s-1900s) have broken logo URLs
    const batch: LogoRecord[] = await dedicatedClient.unsafe(`
      SELECT t.id, t.serial_number, t.logo_url
      FROM uspto_trademarks t
      WHERE t.logo_url IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM trademark_logo_hashes h 
          WHERE h.serial_number = t.serial_number
        )
      ORDER BY t.id DESC
      LIMIT ${FETCH_BATCH_SIZE}
    `) as any;

    if (batch.length === 0) {
      console.log('\n✅ All logos processed!');
      break;
    }

    // Process hashes (download + compute)
    const processed = await processBatchHashes(batch);

    // Batched UPDATE (single query for all processed logos)
    if (processed.length > 0) {
      try {
        await batchUpdateHashes(processed);
        totalSuccess += processed.length;
      } catch (error) {
        console.error(`❌ Batch update failed:`, error);
        totalFailed += processed.length;
      }
    }

    totalFailed += (batch.length - processed.length);
    totalProcessed += batch.length;

    // Calculate progress
    const elapsed = Date.now() - startTime;
    const rate = totalProcessed / (elapsed / 1000);
    const remaining = initialProgress.remaining - totalProcessed;
    const eta = remaining / rate;

    const etaMinutes = Math.floor(eta / 60);
    const etaHours = Math.floor(etaMinutes / 60);
    const etaDisplay = etaHours > 0
      ? `${etaHours}h ${etaMinutes % 60}m`
      : `${etaMinutes}m`;

    const progress = ((totalProcessed / initialProgress.remaining) * 100).toFixed(1);

    console.log(
      `[${new Date().toLocaleTimeString()}] ` +
      `${totalProcessed.toLocaleString()}/${initialProgress.remaining.toLocaleString()} ` +
      `(${progress}%) | ✓ ${totalSuccess} | ✗ ${totalFailed} | ` +
      `${rate.toFixed(1)}/sec | ETA: ${etaDisplay}`
    );

    // IMPORTANT: Delay between batches to avoid overwhelming DB
    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
  }

  const totalTime = (Date.now() - startTime) / 1000 / 60;
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`\n✨ Batch processing complete!`);
  console.log(`   Total: ${totalProcessed.toLocaleString()}`);
  console.log(`   Success: ${totalSuccess.toLocaleString()}`);
  console.log(`   Failed: ${totalFailed.toLocaleString()}`);
  console.log(`   Time: ${totalTime.toFixed(1)} minutes`);
  console.log(`   Rate: ${(totalProcessed / (totalTime * 60)).toFixed(2)}/sec\n`);

  // Final stats
  const finalProgress = await getProgress();
  console.log(`Final: ${finalProgress.completed.toLocaleString()}/${finalProgress.total.toLocaleString()} computed\n`);

  // Close dedicated connection
  await dedicatedClient.end();
  process.exit(0);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Interrupted by user - shutting down gracefully...');
  await dedicatedClient.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n⚠️  Terminated - shutting down gracefully...');
  await dedicatedClient.end();
  process.exit(0);
});

main().catch(async (error) => {
  console.error('\n❌ Fatal error:', error);
  await dedicatedClient.end();
  process.exit(1);
});
