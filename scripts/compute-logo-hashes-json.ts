/**
 * ALTERNATIVE: Store logo hashes in JSON file (not database)
 *
 * FREE Solution Benefits:
 * - No database storage needed (saves 35 MB)
 * - Fast in-memory lookups
 * - Can use free CDN (Vercel/Netlify) for distribution
 * - Easy to backup/version control
 *
 * Storage: Local file system (FREE)
 * Lookup speed: <10ms for 446K hashes
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { rawClient } from '../db/index.js';
import { createCanvas, loadImage } from 'canvas';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';

const BATCH_SIZE = 100;
const PARALLEL = 8;
const OUTPUT_FILE = './public/logo-hashes.json';

interface LogoHash {
  id: number;
  serial_number: string;
  hash: string;
}

/**
 * Compute hash for logo
 */
async function computeHash(logoUrl: string): Promise<string> {
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
}

async function main() {
  console.log('🎨 FREE Logo Hash Solution - JSON Storage\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Create public directory if doesn't exist
  if (!existsSync('./public')) {
    await mkdir('./public', { recursive: true });
  }

  // Load existing hashes if any
  let hashMap: Record<number, string> = {};
  if (existsSync(OUTPUT_FILE)) {
    try {
      const data = readFileSync(OUTPUT_FILE, 'utf-8');
      hashMap = JSON.parse(data);
      console.log(`📂 Loaded ${Object.keys(hashMap).length} existing hashes\n`);
    } catch (err) {
      console.warn('⚠️  Failed to load existing hashes:', err);
    }
  }

  const startTime = Date.now();
  let processed = 0;
  let success = 0;
  let failed = 0;

  console.log('Starting hash computation...\n');

  while (true) {
    // Fetch logos without hashes
    const alreadyProcessedIds = Object.keys(hashMap).join(',') || '0';
    const batch = await rawClient.unsafe(`
      SELECT id, serial_number, logo_url
      FROM "uspto_trademarks"
      WHERE logo_url IS NOT NULL
        AND id NOT IN (${alreadyProcessedIds})
      LIMIT ${BATCH_SIZE}
    `);

    if (batch.length === 0) break;

    // Process in parallel
    for (let i = 0; i < batch.length; i += PARALLEL) {
      const chunk = batch.slice(i, i + PARALLEL);

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
        } else {
          failed++;
        }
      });
    }

    processed += batch.length;

    // Save progress every batch
    await writeFile(OUTPUT_FILE, JSON.stringify(hashMap, null, 2));

    // Progress update
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processed / elapsed;
    console.log(
      `[${new Date().toLocaleTimeString()}] ` +
      `${processed} processed | ✓ ${success} | ✗ ${failed} | ` +
      `${rate.toFixed(1)}/sec`
    );

    await new Promise(resolve => setTimeout(resolve, 500));
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
  console.error('❌ Error:', err);
  process.exit(1);
});
