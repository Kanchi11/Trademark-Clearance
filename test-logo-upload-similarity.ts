/**
 * Logo Similarity Test Harness
 * Usage: npx tsx test-logo-upload-similarity.ts <imagePathOrUrl>
 *
 * - Accepts a local file path or URL for the uploaded logo
 * - Computes perceptual hash
 * - Compares to all hashes in public/logo-hashes.json
 * - Prints top 5 most similar logos
 */

import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';
import { initializeLogoHashes, getLogoHash } from './lib/logo-hash-service';

// Hamming distance and similarity
function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return 64;
  let dist = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) dist++;
  }
  return dist;
}
function similarity(hash1: string, hash2: string): number {
  const dist = hammingDistance(hash1, hash2);
  return Math.round(((hash1.length - dist) / hash1.length) * 100);
}

// Compute perceptual hash for local file or URL
async function computeImageHash(imagePathOrUrl: string): Promise<string> {
  let img;
  if (/^https?:\/\//.test(imagePathOrUrl)) {
    img = await loadImage(imagePathOrUrl);
  } else {
    const absPath = path.resolve(imagePathOrUrl);
    if (!fs.existsSync(absPath)) throw new Error('File not found: ' + absPath);
    img = await loadImage(absPath);
  }
  const canvas = createCanvas(8, 8);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, 8, 8);
  const imageData = ctx.getImageData(0, 0, 8, 8);
  const pixels = imageData.data;
  const grayscale: number[] = [];
  for (let i = 0; i < pixels.length; i += 4) {
    grayscale.push(Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]));
  }
  const avg = grayscale.reduce((a, b) => a + b, 0) / grayscale.length;
  let hash = '';
  for (const gray of grayscale) hash += gray > avg ? '1' : '0';
  return hash;
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: npx tsx test-logo-upload-similarity.ts <imagePathOrUrl>');
    process.exit(1);
  }
  console.log('Computing hash for uploaded logo...');
  const userHash = await computeImageHash(arg);
  console.log('User logo hash:', userHash);

  // Load all hashes from JSON
  initializeLogoHashes();
  const logoHashMap = require('./public/logo-hashes.json');

  // Compare to all
  const results: Array<{ id: string; hash: string; sim: number }> = [];
  for (const [id, hash] of Object.entries(logoHashMap)) {
    results.push({ id, hash: hash as string, sim: similarity(userHash, hash as string) });
  }
  results.sort((a, b) => b.sim - a.sim);

  console.log('\nTop 5 most similar logos:');
  results.slice(0, 5).forEach((r, i) => {
    console.log(`${i + 1}. ID: ${r.id}, Similarity: ${r.sim}%`);
  });
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
