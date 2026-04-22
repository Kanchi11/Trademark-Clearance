/**
 * Debug tool: Check why logo isn't matching
 * Tests logo hash calculation and database lookup
 */
import { calculateImageHash } from '@/lib/server-logo-comparison';
import { db } from '@/db';
import { usptoTrademarks } from '@/db/schema';
import { sql, eq } from 'drizzle-orm';

async function debugLogoMatch() {
  console.log('🔍 Logo Match Debugger\n');

  // STEP 1: Get the logo URL you're testing
  const testLogoUrl = process.argv[2];

  if (!testLogoUrl) {
    console.error('❌ Please provide a logo URL as argument');
    console.log('\nUsage:');
    console.log('  npx tsx scripts/debug-logo-match.ts "https://logo-url-here"');
    process.exit(1);
  }

  console.log(`Testing logo: ${testLogoUrl}\n`);

  try {
    // STEP 2: Calculate hash for the logo
    console.log('📊 Step 1: Calculating logo hash...');
    const userHash = await calculateImageHash(testLogoUrl);
    console.log(`   ✓ Logo hash: ${userHash}\n`);

    // STEP 3: Check if this exact hash exists in database
    console.log('🔍 Step 2: Searching database for exact hash match...');
    const exactMatches = await db
      .select({
        serial_number: usptoTrademarks.serialNumber,
        mark_text: usptoTrademarks.markText,
        logo_url: usptoTrademarks.logoUrl,
        logo_hash: usptoTrademarks.logoHash,
        nice_classes: usptoTrademarks.niceClasses,
      })
      .from(usptoTrademarks)
      .where(eq(usptoTrademarks.logoHash, userHash))
      .limit(10);

    if (exactMatches.length > 0) {
      console.log(`   ✅ FOUND ${exactMatches.length} exact match(es)!\n`);
      exactMatches.forEach((match, i) => {
        console.log(`   Match ${i + 1}:`);
        console.log(`      Serial: ${match.serial_number}`);
        console.log(`      Name: ${match.mark_text}`);
        console.log(`      Classes: [${match.nice_classes.join(', ')}]`);
        console.log(`      Logo URL: ${match.logo_url}`);
        console.log('');
      });
    } else {
      console.log('   ❌ NO exact hash match found in database\n');
    }

    // STEP 4: Check if the logo URL exists but with different hash
    console.log('🔍 Step 3: Checking if logo URL exists in database...');
    const logoUrlMatches = await db
      .select({
        serial_number: usptoTrademarks.serialNumber,
        mark_text: usptoTrademarks.markText,
        logo_url: usptoTrademarks.logoUrl,
        logo_hash: usptoTrademarks.logoHash,
        nice_classes: usptoTrademarks.niceClasses,
      })
      .from(usptoTrademarks)
      .where(eq(usptoTrademarks.logoUrl, testLogoUrl))
      .limit(5);

    if (logoUrlMatches.length > 0) {
      console.log(`   ✅ Logo URL exists in database!\n`);
      logoUrlMatches.forEach((match, i) => {
        console.log(`   Record ${i + 1}:`);
        console.log(`      Serial: ${match.serial_number}`);
        console.log(`      Name: ${match.mark_text}`);
        console.log(`      Classes: [${match.nice_classes.join(', ')}]`);
        console.log(`      Hash in DB: ${match.logo_hash || 'NOT COMPUTED'}`);
        console.log(`      Your hash:  ${userHash}`);
        console.log(`      Match: ${match.logo_hash === userHash ? '✅ YES' : '❌ NO'}`);
        console.log('');
      });
    } else {
      console.log('   ℹ️  Logo URL not found in database\n');
    }

    // STEP 5: Check overall hash statistics
    console.log('📊 Step 4: Database hash statistics...');
    const [stats] = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE logo_url IS NOT NULL) as total_logos,
        COUNT(*) FILTER (WHERE logo_hash IS NOT NULL) as hashed_logos,
        ROUND(100.0 * COUNT(*) FILTER (WHERE logo_hash IS NOT NULL) / NULLIF(COUNT(*) FILTER (WHERE logo_url IS NOT NULL), 0), 1) as completion_pct
      FROM uspto_trademarks
    `);

    const result = stats as any;
    console.log(`   Total logos: ${Number(result.total_logos).toLocaleString()}`);
    console.log(`   Hashed: ${Number(result.hashed_logos).toLocaleString()}`);
    console.log(`   Completion: ${result.completion_pct}%\n`);

    // STEP 6: Diagnosis
    console.log('💡 Diagnosis:\n');

    if (exactMatches.length > 0) {
      console.log('   ✅ Your logo SHOULD be found by the search');
      console.log('   ✅ Exact match detection is working correctly');
      console.log('');
      console.log('   If it\'s not showing up in search:');
      console.log('   1. Check that Nice classes match (shown above)');
      console.log('   2. Clear cache and try again');
      console.log('   3. Check server logs for errors');
    } else if (logoUrlMatches.length > 0 && !logoUrlMatches[0].logo_hash) {
      console.log('   ⚠️  Logo exists in DB but hash NOT computed yet');
      console.log('   ⚠️  Wait for hash population script to finish');
      console.log('');
      console.log('   Current workaround:');
      console.log('   - System will use fallback method (random sampling)');
      console.log('   - May not find your logo if not in random sample');
    } else if (logoUrlMatches.length > 0 && logoUrlMatches[0].logo_hash !== userHash) {
      console.log('   ❌ Logo exists but hashes DON\'T MATCH!');
      console.log('   ❌ This could be due to:');
      console.log('   1. Image changed at USPTO (updated/replaced)');
      console.log('   2. Hash calculation inconsistency');
      console.log('   3. Image loading error during hash computation');
      console.log('');
      console.log('   Solution:');
      console.log('   - Re-compute hash for this specific logo');
      console.log('   - Check if USPTO image URL is still valid');
    } else {
      console.log('   ℹ️  This logo is NOT in the database');
      console.log('   ℹ️  This might be a new logo you uploaded');
      console.log('');
      console.log('   Expected behavior:');
      console.log('   - Search will find SIMILAR logos (not exact match)');
      console.log('   - System is working correctly');
    }

  } catch (error) {
    console.error('\n❌ Error during diagnosis:', error);
    process.exit(1);
  }

  process.exit(0);
}

debugLogoMatch().catch(console.error);
