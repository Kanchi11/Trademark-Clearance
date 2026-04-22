/**
 * Logo Similarity Demo - Shows real-world usage
 */

import '@/src/core/setup';
import { db } from '@/db';
import { usptoTrademarks } from '@/db/schema';
import { sql, and, isNotNull } from 'drizzle-orm';
import { findSimilarLogosEfficient } from '@/lib/server-logo-comparison';

async function demoLogoSimilarity() {
  console.log('\n🎨 Logo Similarity Feature Demo\n');
  console.log('═'.repeat(70));

  // Step 1: Pick a real trademark with a logo
  console.log('\n[Step 1] Finding a sample trademark with logo...\n');

  const sampleTrademark = await db
    .select({
      id: usptoTrademarks.id,
      serial_number: usptoTrademarks.serialNumber,
      mark_text: usptoTrademarks.markText,
      logo_url: usptoTrademarks.logoUrl,
      logo_hash: usptoTrademarks.logoHash,
      nice_classes: usptoTrademarks.niceClasses,
    })
    .from(usptoTrademarks)
    .where(
      and(
        isNotNull(usptoTrademarks.logoUrl),
        isNotNull(usptoTrademarks.logoHash)
      )
    )
    .limit(1);

  if (sampleTrademark.length === 0) {
    console.log('❌ No trademarks with logo hashes found');
    console.log('   Run: npm run db:populate-hashes to generate logo hashes');
    return;
  }

  const sample = sampleTrademark[0];
  console.log(`📋 Sample Trademark:`);
  console.log(`   Name: ${sample.mark_text}`);
  console.log(`   Serial: ${sample.serial_number}`);
  console.log(`   Nice Classes: [${sample.nice_classes?.join(', ')}]`);
  console.log(`   Logo: ${sample.logo_url?.substring(0, 60)}...`);
  console.log(`   Hash: ${sample.logo_hash?.substring(0, 30)}...`);

  // Step 2: Simulate a user search with this logo
  console.log('\n[Step 2] Simulating user upload of this logo...\n');
  console.log(`🔍 Searching for similar logos in classes [${sample.nice_classes?.slice(0, 3).join(', ')}]`);
  console.log(`   Using threshold: 75% similarity\n`);

  const niceClasses = sample.nice_classes?.slice(0, 3) || [9, 35, 42];

  // Step 3: Run the efficient logo search
  const startTime = Date.now();
  
  const similarLogos = await findSimilarLogosEfficient(
    sample.logo_url!,
    niceClasses,
    75 // 75% similarity threshold
  );

  const duration = Date.now() - startTime;

  // Step 4: Display results
  console.log('\n[Step 3] Results:\n');
  console.log(`⏱️  Search completed in ${duration}ms`);
  console.log(`🎯 Found ${similarLogos.length} similar logo(s)\n`);

  if (similarLogos.length > 0) {
    console.log('📊 Top Matches:');
    similarLogos.slice(0, 10).forEach((match, idx) => {
      console.log(`\n   ${idx + 1}. ${match.markText}`);
      console.log(`      Serial: ${match.serialNumber}`);
      console.log(`      Similarity: ${match.similarity}%`);
      console.log(`      Logo: ${match.logoUrl.substring(0, 60)}...`);
    });
  } else {
    console.log('   ℹ️  No similar logos found above 75% threshold');
  }

  // Step 5: Show how it works
  console.log('\n' + '═'.repeat(70));
  console.log('\n💡 How Logo Similarity Works:\n');
  console.log('   1️⃣  Image Processing:');
  console.log('      • Resize logo to 8x8 pixels (removes detail, keeps structure)');
  console.log('      • Convert to grayscale');
  console.log('      • Calculate average brightness\n');
  
  console.log('   2️⃣  Hash Generation:');
  console.log('      • For each pixel: 1 if brighter than average, 0 if darker');
  console.log('      • Results in 64-bit binary hash (perceptual fingerprint)');
  console.log('      • Example: "1111111110111111000000010000100100001000..."\n');
  
  console.log('   3️⃣  Similarity Comparison:');
  console.log('      • Calculate Hamming distance (count different bits)');
  console.log('      • Convert to percentage: (64 - differences) / 64 * 100');
  console.log('      • 0 differences = 100% identical');
  console.log('      • 2-5 differences = 92-97% similar (likely conflict)');
  console.log('      • 16+ differences = <75% (likely safe)\n');

  console.log('   4️⃣  Optimization:');
  console.log('      • Pre-computed hashes for 52K+ logos (stored in JSON)');
  console.log('      • Database has logo_hash column for fast lookup');
  console.log('      • Batch processing: 2000 logos at a time');
  console.log('      • Early termination: stops after finding 50+ matches');
  console.log('      • Performance: ~2-5 seconds for full search\n');

  console.log('   5️⃣  Industry Standard:');
  console.log('      • 75%+ similarity = potential conflict');
  console.log('      • 85%+ similarity = high risk');
  console.log('      • 95%+ similarity = very likely rejection');
  console.log('      • 100% similarity = identical (exact match)\n');

  console.log('═'.repeat(70));
  console.log('\n✅ Demo complete!\n');
}

demoLogoSimilarity()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  });
