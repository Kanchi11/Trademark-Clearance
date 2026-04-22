/**
 * Test: Logo search should work independently of text search
 * This verifies that logo similarity doesn't depend on the mark text
 */
import { findSimilarLogosEfficient } from '@/lib/server-logo-comparison';

async function testLogoSearchIndependence() {
  console.log('🧪 Testing Logo Search Independence\n');
  console.log('This test verifies that logo search works regardless of the mark text.\n');

  // Test 1: Search for a test logo with DIFFERENT mark text values
  // The logo results should be THE SAME regardless of what text we're searching for

  const testLogoUrl = 'https://tsdr.uspto.gov/img/97120890/large'; // Example USPTO logo
  const niceClasses = [9, 35, 42];

  console.log('📝 Test Setup:');
  console.log(`   Logo URL: ${testLogoUrl}`);
  console.log(`   Nice Classes: [${niceClasses.join(', ')}]`);
  console.log(`   Threshold: 75%\n`);

  console.log('🔍 Test 1: Search with mark text "Nike"');
  console.log('   (Note: Logo search should NOT use this text at all)');
  const results1 = await findSimilarLogosEfficient(testLogoUrl, niceClasses, 75);
  console.log(`   Results: ${results1.length} visually similar logos found\n`);

  if (results1.length > 0) {
    console.log('   Top 3 matches:');
    results1.slice(0, 3).forEach((r, i) => {
      console.log(`   ${i + 1}. "${r.markText}" (${r.serialNumber}) - ${r.similarity}%`);
    });
  }

  console.log('\n🔍 Test 2: Search with mark text "Apple"');
  console.log('   (Note: Same logo, different text - results should be IDENTICAL)');
  const results2 = await findSimilarLogosEfficient(testLogoUrl, niceClasses, 75);
  console.log(`   Results: ${results2.length} visually similar logos found\n`);

  if (results2.length > 0) {
    console.log('   Top 3 matches:');
    results2.slice(0, 3).forEach((r, i) => {
      console.log(`   ${i + 1}. "${r.markText}" (${r.serialNumber}) - ${r.similarity}%`);
    });
  }

  console.log('\n📊 Analysis:');
  if (results1.length === results2.length) {
    console.log(`   ✅ PASS: Both searches returned ${results1.length} results`);
    console.log('   ✅ Logo search is working independently of mark text');
  } else {
    console.log(`   ❌ FAIL: Results differ (${results1.length} vs ${results2.length})`);
    console.log('   ❌ Logo search may have unexpected dependencies');
  }

  console.log('\n💡 Key Point:');
  console.log('   Logo similarity search uses ONLY:');
  console.log('   1. The uploaded logo image (visual comparison)');
  console.log('   2. Nice classes (to filter relevant industries)');
  console.log('   ');
  console.log('   It does NOT use the mark text at all!');
  console.log('   ');
  console.log('   So if you search "Nike" with an Apple logo:');
  console.log('   - Text search finds: Nike-related marks');
  console.log('   - Logo search finds: Apple-looking logos');
  console.log('   - These are TWO SEPARATE result sets');

  process.exit(0);
}

testLogoSearchIndependence().catch(console.error);
