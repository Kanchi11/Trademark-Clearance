/**
 * Comprehensive Logo Similarity Debug Script
 * Tests each component of the logo similarity system
 */

import '@/src/core/setup';
import { db } from '@/db';
import { usptoTrademarks } from '@/db/schema';
import { sql, and, isNotNull } from 'drizzle-orm';
import { calculateImageHash, compareImageHashes, isLogoAccessible } from '@/lib/server-logo-comparison';

console.log('🔍 Logo Similarity Comprehensive Debug Test\n');

async function test1_SqlQuery() {
  console.log('═══════════════════════════════════════════');
  console.log('TEST 1: SQL Query for Random Logos');
  console.log('═══════════════════════════════════════════');

  try {
    const niceClasses = [3, 5, 9, 18, 25, 29, 30, 35, 38, 41, 42, 43, 44];
    console.log(`Testing with Nice classes: [${niceClasses.join(', ')}]`);

    const results = await db
      .select({
        serial_number: usptoTrademarks.serialNumber,
        mark_text: usptoTrademarks.markText,
        logo_url: usptoTrademarks.logoUrl,
        nice_classes: usptoTrademarks.niceClasses,
      })
      .from(usptoTrademarks)
      .where(
        and(
          isNotNull(usptoTrademarks.logoUrl),
          sql`${usptoTrademarks.niceClasses} && ARRAY[${sql.raw(niceClasses.join(','))}]::integer[]`
        )
      )
      .orderBy(sql`RANDOM()`)
      .limit(10);

    console.log(`✅ SQL query successful!`);
    console.log(`   Found ${results.length} trademarks with logos\n`);

    if (results.length > 0) {
      console.log('Sample results:');
      results.slice(0, 3).forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.mark_text} (${r.serial_number})`);
        console.log(`      Classes: [${r.nice_classes?.join(', ')}]`);
        console.log(`      Logo: ${r.logo_url?.substring(0, 60)}...`);
      });
    }

    return { success: true, results };
  } catch (error) {
    console.error('❌ SQL query failed:', error);
    return { success: false, error };
  }
}

async function test2_LogoAccessibility(logoUrls: string[]) {
  console.log('\n═══════════════════════════════════════════');
  console.log('TEST 2: USPTO Logo URL Accessibility');
  console.log('═══════════════════════════════════════════');

  const results = {
    accessible: 0,
    notAccessible: 0,
    errors: [] as string[],
  };

  for (let i = 0; i < Math.min(5, logoUrls.length); i++) {
    const url = logoUrls[i];
    console.log(`\nChecking logo ${i + 1}/${Math.min(5, logoUrls.length)}: ${url.substring(0, 60)}...`);

    try {
      const accessible = await isLogoAccessible(url);
      if (accessible) {
        console.log('   ✅ Accessible');
        results.accessible++;
      } else {
        console.log('   ❌ Not accessible (404 or error)');
        results.notAccessible++;
        results.errors.push(url);
      }
    } catch (error) {
      console.log('   ❌ Error:', (error as Error).message);
      results.notAccessible++;
      results.errors.push(url);
    }
  }

  console.log(`\n📊 Accessibility Results:`);
  console.log(`   Accessible: ${results.accessible}`);
  console.log(`   Not Accessible: ${results.notAccessible}`);

  return results;
}

async function test3_PerceptualHashing(logoUrl: string) {
  console.log('\n═══════════════════════════════════════════');
  console.log('TEST 3: Perceptual Hashing');
  console.log('═══════════════════════════════════════════');

  try {
    console.log(`Testing hash calculation for: ${logoUrl.substring(0, 60)}...`);
    const hash = await calculateImageHash(logoUrl);

    console.log(`✅ Hash calculated successfully`);
    console.log(`   Hash length: ${hash.length} bits`);
    console.log(`   Hash value: ${hash}`);
    console.log(`   Binary distribution: ${hash.split('1').length - 1} ones, ${hash.split('0').length - 1} zeros`);

    return { success: true, hash };
  } catch (error) {
    console.error('❌ Hash calculation failed:', error);
    return { success: false, error };
  }
}

async function test4_SimilarityComparison() {
  console.log('\n═══════════════════════════════════════════');
  console.log('TEST 4: Similarity Comparison Logic');
  console.log('═══════════════════════════════════════════');

  // Test with known hash patterns
  const testCases = [
    {
      name: 'Identical hashes',
      hash1: '1010101010101010101010101010101010101010101010101010101010101010',
      hash2: '1010101010101010101010101010101010101010101010101010101010101010',
      expected: 100,
    },
    {
      name: 'Completely different',
      hash1: '1111111111111111111111111111111111111111111111111111111111111111',
      hash2: '0000000000000000000000000000000000000000000000000000000000000000',
      expected: 0,
    },
    {
      name: 'One bit different (98.4% similar)',
      hash1: '1010101010101010101010101010101010101010101010101010101010101010',
      hash2: '1010101010101010101010101010101010101010101010101010101010101011',
      expected: 98,
    },
    {
      name: '10 bits different (84.4% similar)',
      hash1: '1111111111111111111111111111111111111111111111111111111111111111',
      hash2: '1111111111111111111111111111111111111111111111111111110000000000',
      expected: 84,
    },
  ];

  console.log('Testing similarity calculation with known patterns:\n');

  for (const testCase of testCases) {
    const similarity = compareImageHashes(testCase.hash1, testCase.hash2);
    const passed = similarity === testCase.expected;

    console.log(`${passed ? '✅' : '❌'} ${testCase.name}`);
    console.log(`   Expected: ${testCase.expected}%`);
    console.log(`   Got: ${similarity}%`);
  }

  return { success: true };
}

async function test5_EndToEnd() {
  console.log('\n═══════════════════════════════════════════');
  console.log('TEST 5: End-to-End Logo Comparison');
  console.log('═══════════════════════════════════════════');

  try {
    // Get 2 real USPTO logos
    const logos = await db
      .select({
        serial_number: usptoTrademarks.serialNumber,
        mark_text: usptoTrademarks.markText,
        logo_url: usptoTrademarks.logoUrl,
      })
      .from(usptoTrademarks)
      .where(isNotNull(usptoTrademarks.logoUrl))
      .limit(2);

    if (logos.length < 2) {
      console.log('⚠️  Not enough logos in database for comparison test');
      return { success: false };
    }

    console.log(`\nComparing two USPTO logos:`);
    console.log(`   Logo 1: ${logos[0].mark_text} (${logos[0].serial_number})`);
    console.log(`   Logo 2: ${logos[1].mark_text} (${logos[1].serial_number})`);

    // Calculate hashes
    console.log('\nCalculating hashes...');
    const hash1 = await calculateImageHash(logos[0].logo_url!);
    const hash2 = await calculateImageHash(logos[1].logo_url!);

    console.log(`   Logo 1 hash: ${hash1}`);
    console.log(`   Logo 2 hash: ${hash2}`);

    // Compare
    const similarity = compareImageHashes(hash1, hash2);
    console.log(`\n📊 Similarity: ${similarity}%`);

    if (similarity >= 70) {
      console.log('   ✅ High similarity (would be flagged as conflict)');
    } else if (similarity >= 55) {
      console.log('   ⚠️  Medium similarity (would be flagged with current threshold)');
    } else {
      console.log('   ℹ️  Low similarity (different logos)');
    }

    return { success: true, similarity };
  } catch (error) {
    console.error('❌ End-to-end test failed:', error);
    return { success: false, error };
  }
}

async function runAllTests() {
  console.log('Starting comprehensive logo similarity tests...\n');

  // Test 1: SQL Query
  const test1Result = await test1_SqlQuery();
  if (!test1Result.success) {
    console.log('\n❌ CRITICAL: SQL query failed. Cannot proceed with other tests.');
    process.exit(1);
  }

  const sampleLogos = test1Result.results?.map((r: any) => r.logo_url).filter(Boolean) || [];

  // Test 2: Logo Accessibility
  if (sampleLogos.length > 0) {
    await test2_LogoAccessibility(sampleLogos);
  }

  // Test 3: Perceptual Hashing
  if (sampleLogos.length > 0 && sampleLogos[0]) {
    await test3_PerceptualHashing(sampleLogos[0]);
  }

  // Test 4: Similarity Logic
  await test4_SimilarityComparison();

  // Test 5: End-to-End
  await test5_EndToEnd();

  console.log('\n═══════════════════════════════════════════');
  console.log('🎉 All tests completed!');
  console.log('═══════════════════════════════════════════\n');

  process.exit(0);
}

// Run all tests
runAllTests().catch((error) => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
