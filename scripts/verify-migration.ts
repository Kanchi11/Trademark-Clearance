/**
 * Verify logo_hash column was added successfully
 */

import '@/src/core/setup';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function verifyMigration() {
  console.log('🔍 Verifying migration...\n');

  try {
    // Check if logo_hash column exists
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'uspto_trademarks'
      AND column_name IN ('logo_url', 'logo_hash')
      ORDER BY column_name;
    `);

    console.log('Columns in uspto_trademarks table:');
    console.log('─'.repeat(60));
    const columns = result as any[];
    if (columns && columns.length > 0) {
      columns.forEach((row: any) => {
        console.log(`  ${row.column_name.padEnd(20)} | ${row.data_type.padEnd(15)} | nullable: ${row.is_nullable}`);
      });
    }
    console.log('─'.repeat(60));
    console.log();

    // Check indexes
    const indexes = await db.execute(sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'uspto_trademarks'
      AND indexname LIKE '%logo%';
    `);

    console.log('Logo-related indexes:');
    console.log('─'.repeat(60));
    const indexList = indexes as any[];
    if (indexList && indexList.length > 0) {
      indexList.forEach((row: any) => {
        console.log(`  ${row.indexname}`);
      });
    }
    console.log('─'.repeat(60));
    console.log();

    // Check current hash coverage
    const stats = await db.execute(sql`
      SELECT
        COUNT(*) as total_logos,
        COUNT(logo_hash) as hashes_computed,
        COUNT(*) - COUNT(logo_hash) as hashes_pending
      FROM uspto_trademarks
      WHERE logo_url IS NOT NULL;
    `);

    const statsList = stats as any[];
    const stat = statsList && statsList.length > 0 ? statsList[0] : null;

    if (stat) {
      console.log('Logo hash coverage:');
      console.log('─'.repeat(60));
      console.log(`  Total logos in DB:    ${Number(stat.total_logos).toLocaleString()}`);
      console.log(`  Hashes computed:      ${Number(stat.hashes_computed).toLocaleString()}`);
      console.log(`  Hashes pending:       ${Number(stat.hashes_pending).toLocaleString()}`);
      console.log('─'.repeat(60));
      console.log();

      if (Number(stat.hashes_pending) > 0) {
        console.log('⚠️  Hashes not computed yet. Run: npm run db:populate-hashes');
      } else {
        console.log('✅ All logos have hashes computed!');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyMigration();
