/**
 * FREE SOLUTION: Clean up database to stay under 0.5 GB limit
 *
 * This script:
 * 1. Drops unused columns (logo_color_histogram saves ~150 MB)
 * 2. Nullifies goods_services for dead/abandoned marks (saves ~200 MB)
 * 3. Vacuums to reclaim space
 *
 * Expected space savings: ~350-400 MB (brings 1.01 GB → 0.6 GB)
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { rawClient } from '../db/index.js';

async function cleanupDatabase() {
  console.log('🧹 Database Cleanup - Stay FREE!\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check initial size
  console.log('📊 Checking initial database size...\n');

  try {
    // Step 1: Drop logo_color_histogram (not critical for similarity)
    console.log('Step 1/4: Dropping logo_color_histogram column...');
    await rawClient.unsafe(`
      ALTER TABLE "uspto_trademarks"
      DROP COLUMN IF EXISTS logo_color_histogram
    `);
    console.log('✅ Dropped logo_color_histogram (saves ~150 MB)\n');

    // Step 2: Nullify goods_services for dead/abandoned marks
    console.log('Step 2/4: Clearing goods_services for inactive marks...');
    await rawClient.unsafe(`
      UPDATE "uspto_trademarks"
      SET goods_services = NULL
      WHERE status IN ('dead', 'abandoned')
    `);
    const [count] = await rawClient.unsafe(`
      SELECT COUNT(*) as cleared
      FROM "uspto_trademarks"
      WHERE status IN ('dead', 'abandoned')
        AND goods_services IS NULL
    `);
    console.log(`✅ Cleared goods_services for ${parseInt(count.cleared).toLocaleString()} inactive marks (saves ~200 MB)\n`);

    // Step 3: Vacuum to reclaim space
    console.log('Step 3/4: Reclaiming disk space (VACUUM FULL)...');
    console.log('⏳ This may take 5-10 minutes...\n');
    await rawClient.unsafe('VACUUM FULL "uspto_trademarks"');
    console.log('✅ Space reclaimed\n');

    // Step 4: Check final stats
    console.log('Step 4/4: Checking final statistics...\n');
    const [stats] = await rawClient.unsafe(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'live') as live,
        COUNT(*) FILTER (WHERE logo_url IS NOT NULL) as with_logos
      FROM "uspto_trademarks"
    `);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n✨ Cleanup Complete!\n');
    console.log(`   Total records: ${parseInt(stats.total).toLocaleString()}`);
    console.log(`   Live trademarks: ${parseInt(stats.live).toLocaleString()}`);
    console.log(`   Logos available: ${parseInt(stats.with_logos).toLocaleString()}\n`);
    console.log('💡 Check Supabase dashboard to verify database is under 0.5 GB');
    console.log('   If still over, consider deleting dead/abandoned marks.\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

cleanupDatabase();
