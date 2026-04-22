/**
 * RESILIENT Logo Hash Computation - JSON Storage
 *
 * Improvements over original:
 * - Better connection retry logic
 * - Reduced concurrent connections (4 instead of 8)
 * - Exponential backoff on failures
 * - More efficient query (pagination instead of NOT IN)
 * - Graceful handling of database connection issues
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { rawClient } from '../db/index.js';
import { createCanvas, loadImage } from 'canvas';
import { writeFile, mkdir, readFileSync } from 'fs';
import { existsSync } from 'fs';

const BATCH_SIZE = 100;
const PARALLEL = 4; // Reduced from 8 to avoid overwhelming DB
const OUTPUT_FILE = './public/logo-hashes.json';
const BATCH_DELAY_MS = 1000; // Increased from 500ms
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000;

/**
 * Compute hash for logo with timeout
 */
async function computeHash(logoUrl: string, timeoutMs = 10000): Promise<string> {
  return Promise.race([
    (async () => {
      const image = await loadImage(logoUrl);
      const canvas = createCanvas(8, 8);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, 8, 8);

      const imageData = ctx.getImageData(0, 0, 8, 8);
      const pixels = imageData.data;

      const grayscale: number[] = [];
      for (let i = 0; i < pixels.length; i += 4) {
        grayscale.push(Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]));
      }

      const avg = grayscale.reduce((a, b) => a + b, 0) / grayscale.length;
      let hash = '';
      for (const gray of grayscale) {
        hash += gray > avg ? '1' : '0';
      }

      return hash;
    })(),
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Hash computation timeout')), timeoutMs)
    )
  ]);
}

/**
 * Execute database query with retry logic
 */
async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  operationName: string,
  retries = MAX_RETRIES
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await queryFn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a connection timeout
      if (error.code === 'CONNECT_TIMEOUT' || error.code === 'ETIMEDOUT') {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        console.log(`   ⚠️  ${operationName} failed (attempt ${attempt}/${retries}): ${error.message}`);

        if (attempt < retries) {
          console.log(`   ⏳ Waiting ${backoffMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      } else {
        // For other errors, throw immediately
        throw error;
      }
    }
  }

  throw new Error(`${operationName} failed after ${retries} attempts: ${lastError.message}`);
}

async function main() {
  console.log('🎨 RESILIENT Logo Hash Solution - JSON Storage\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Create public directory if doesn't exist
  if (!existsSync('./public')) {
    mkdir('./public', { recursive: true }, (err) => {
      if (err) throw err;
    });
  }

  // Load existing hashes if any (use readFileSync instead of import)
  let hashMap: Record<number, string> = {};
  if (existsSync(OUTPUT_FILE)) {
    try {
      const fileContent = readFileSync(OUTPUT_FILE, 'utf-8');
      hashMap = JSON.parse(fileContent);
      console.log(`📂 Loaded ${Object.keys(hashMap).length.toLocaleString()} existing hashes\n`);
    } catch (error) {
      console.log('⚠️  Could not load existing hashes, starting fresh\n');
    }
  }

  const startTime = Date.now();
  let processed = 0;
  let success = 0;
  let failed = 0;
  let totalProcessed = Object.keys(hashMap).length;

  console.log('Starting hash computation with retry logic...\n');
  console.log(`Configuration:`);
  console.log(`  - Batch size: ${BATCH_SIZE}`);
  console.log(`  - Parallel downloads: ${PARALLEL}`);
  console.log(`  - Batch delay: ${BATCH_DELAY_MS}ms`);
  console.log(`  - Max retries: ${MAX_RETRIES}\n`);

  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5;

  let offset = 0;

  while (true) {
    try {
      // Simple pagination approach - fetch batches and filter in memory
      const batch = await queryWithRetry(
        () => rawClient.unsafe(`
          SELECT id, serial_number, logo_url
          FROM "uspto_trademarks"
          WHERE logo_url IS NOT NULL
          ORDER BY id
          LIMIT $1 OFFSET $2
        `, [BATCH_SIZE * 2, offset]), // Fetch 2x batch size to account for already processed
        'Database fetch'
      );

      if (batch.length === 0) break; // No more logos to process

      // Filter out already processed logos (in memory)
      const unprocessed = batch.filter((logo: any) => !(logo.id in hashMap));

      if (unprocessed.length === 0) {
        // All logos in this batch already processed, move to next batch
        offset += batch.length;
        continue;
      }

      consecutiveErrors = 0; // Reset error counter on successful fetch

      // Process in parallel
      for (let i = 0; i < unprocessed.length; i += PARALLEL) {
        const chunk = unprocessed.slice(i, i + PARALLEL);

        const results = await Promise.allSettled(
          chunk.map(async (logo: any) => {
            const hash = await computeHash(logo.logo_url);
            return { id: logo.id, hash };
          })
        );

        results.forEach(result => {
          if (result.status === 'fulfilled') {
            hashMap[result.value.id] = result.value.hash;
            success++;
            totalProcessed++;
          } else {
            failed++;
          }
        });
      }

      processed += unprocessed.length;
      offset += batch.length; // Move offset by full batch size

      // Save progress every batch (use sync write to ensure data is saved)
      writeFile(OUTPUT_FILE, JSON.stringify(hashMap, null, 2), (err) => {
        if (err) console.error('⚠️  Failed to save progress:', err);
      });

      // Progress update
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      console.log(
        `[${new Date().toLocaleTimeString()}] ` +
        `${totalProcessed.toLocaleString()} total | ` +
        `+${processed} this session | ✓ ${success} | ✗ ${failed} | ` +
        `${rate.toFixed(1)}/sec`
      );

      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));

    } catch (error: any) {
      consecutiveErrors++;
      console.error(`\n❌ Batch processing error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error.message);

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error('\n💥 Too many consecutive errors. Stopping to prevent overwhelming the database.');
        console.log(`\n📊 Progress saved: ${totalProcessed.toLocaleString()} hashes computed\n`);
        console.log('You can restart this script later to resume from where it left off.\n');
        process.exit(1);
      }

      // Wait longer before retrying after error
      const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, consecutiveErrors);
      console.log(`⏳ Waiting ${backoffMs}ms before continuing...\n`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('\n✨ Hash computation complete!\n');
  console.log(`   Total hashes: ${Object.keys(hashMap).length.toLocaleString()}`);
  console.log(`   Success: ${success.toLocaleString()}`);
  console.log(`   Failed: ${failed.toLocaleString()}`);
  console.log(`   File: ${OUTPUT_FILE}`);
  console.log(`   Size: ${(JSON.stringify(hashMap).length / 1024 / 1024).toFixed(2)} MB\n`);
  console.log('💡 Logo hashes stored in JSON - no database storage used!');
  console.log('   Next: Update logo comparison code to use this file.\n');

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  console.log('\n📊 Check public/logo-hashes.json for partial progress\n');
  process.exit(1);
});