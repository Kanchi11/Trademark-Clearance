/**
 * Test: Logo Similarity using JSONL Hashes
 * This script tests the logo similarity function using the precomputed logo-hashes-2026-02-16.jsonl file.
 */

import { calculateImageHash, compareImageHashes, findSimilarLogosEfficient } from './lib/server-logo-comparison';

async function testLogoSimilarityWithJSONL() {
  // Example logo URL (replace with a real logo URL for a real test)
  const userLogoUrl = 'https://upload.wikimedia.org/wikipedia/commons/6/6a/JavaScript-logo.png';
  const niceClasses: number[] = []; // Not used for filtering in JSONL-only mode
  const threshold = 90;

  console.log('\n=== TEST: Logo Similarity using JSONL Hashes ===\n');
  const results = await findSimilarLogosEfficient(userLogoUrl, niceClasses, threshold);

  if (results.length === 0) {
    console.log('No similar logos found above threshold.');
  } else {
    console.log(`Found ${results.length} similar logos above threshold:`);
    results.slice(0, 5).forEach((r, i) => {
      console.log(`${i + 1}. Serial: ${r.serialNumber}, Similarity: ${r.similarity}%`);
    });
  }
  console.log('\n=== END TEST ===\n');
}

testLogoSimilarityWithJSONL().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
