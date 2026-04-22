/**
 * Fix trademark statuses based on registration dates
 * Registered trademarks with registration dates should be "live", not "pending"
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '@/db';
import { usptoTrademarks } from '@/db/schema';
import { sql, isNotNull, isNull } from 'drizzle-orm';

async function fixStatuses() {
  console.log('🔧 Fixing trademark statuses...\n');

  try {
    // Step 1: Check current status distribution
    console.log('📊 Current status distribution:');
    const current = await db.execute(sql`
      SELECT status, COUNT(*) as count
      FROM uspto_trademarks
      GROUP BY status
      ORDER BY count DESC
    `);

    current.forEach((row: any) => {
      const count = Number(row.count);
      console.log(`  ${row.status}: ${count.toLocaleString()}`);
    });

    // Step 2: Update statuses based on registration dates
    // If a trademark has a registration_date, it's likely "live" (registered)
    console.log('\n🔄 Updating statuses for registered trademarks...');

    const result = await db.execute(sql`
      UPDATE uspto_trademarks
      SET status = 'live'
      WHERE registration_date IS NOT NULL
        AND status = 'pending'
    `);

    console.log(`✅ Updated ${(result as any).rowCount || 0} trademarks to "live" (had registration dates)\n`);

    // Step 3: Check updated distribution
    console.log('📊 Updated status distribution:');
    const updated = await db.execute(sql`
      SELECT status, COUNT(*) as count
      FROM uspto_trademarks
      GROUP BY status
      ORDER BY count DESC
    `);

    updated.forEach((row: any) => {
      const count = Number(row.count);
      console.log(`  ${row.status}: ${count.toLocaleString()}`);
    });

    console.log('\n✅ Status fix complete!');
    console.log('Note: Some marks may still show "pending" if they truly are pending applications.');
    console.log('For more accurate statuses, consider using the USPTO TSDR API verification.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

fixStatuses().catch(console.error);
