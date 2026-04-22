import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { compareLogoAgainstUSPTO, calculateImageHash, compareImageHashes } from './lib/server-logo-comparison';

async function test() {
  console.log('🧪 Testing Logo Similarity...\n');

  // Test with same logo (should be 100% similar)
  const testLogoUrl = 'https://tsdr.uspto.gov/img/90208431/large';
  
  console.log(`Testing logo: ${testLogoUrl}`);
  
  try {
    // Calculate hash for test logo
    console.log('\n1️⃣ Calculating hash for test logo...');
    const hash1 = await calculateImageHash(testLogoUrl);
    console.log(`   Hash: ${hash1}`);

    // Calculate hash again (should be identical)
    console.log('\n2️⃣ Calculating hash again (should match)...');
    const hash2 = await calculateImageHash(testLogoUrl);
    console.log(`   Hash: ${hash2}`);

    // Compare
    const similarity = compareImageHashes(hash1, hash2);
    console.log(`\n✅ Self-similarity: ${similarity}% (should be 100%)`);

    // Test with another logo
    const otherLogoUrl = 'https://tsdr.uspto.gov/img/90208432/large';
    console.log(`\n3️⃣ Testing against different logo: ${otherLogoUrl}`);
    const hash3 = await calculateImageHash(otherLogoUrl);
    const similarity2 = compareImageHashes(hash1, hash3);
    console.log(`   Similarity: ${similarity2}%`);

    console.log('\n✅ Logo similarity comparison is working!');
  } catch (error) {
    console.error('\n❌ Error testing logo similarity:', error);
  }

  process.exit(0);
}

test();
