/**
 * Check status distribution after import to verify correct mapping
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function checkStatusDistribution() {
  console.log('🔍 Checking Status Distribution');
  console.log('================================');
  console.log('');

  // Get total count
  const totalResult = await db.execute(sql`
    SELECT COUNT(*) as count FROM uspto_trademarks
  `);
  const total = Number(((totalResult as any).rows || totalResult)[0].count);

  console.log(`📊 Total trademarks: ${total.toLocaleString()}`);
  console.log('');

  // Get status distribution
  const statusResult = await db.execute(sql`
    SELECT status, COUNT(*) as count
    FROM uspto_trademarks
    GROUP BY status
    ORDER BY count DESC
  `);

  console.log('Status distribution:');
  console.log('-------------------');

  let abandoned = 0;
  let live = 0;
  let pending = 0;

  const statusRows = (statusResult as any).rows || statusResult;
  for (const row of statusRows) {
    const status = row.status as string;
    const count = Number(row.count);
    const percentage = ((count / total) * 100).toFixed(2);

    console.log(`  ${status.padEnd(10)}: ${count.toLocaleString().padStart(12)} (${percentage}%)`);

    if (status === 'abandoned') abandoned = count;
    if (status === 'live') live = count;
    if (status === 'pending') pending = count;
  }

  console.log('');
  console.log('✅ Status Mapping Verification:');
  console.log('-------------------------------');

  if (abandoned > 0) {
    console.log('  ✅ Abandoned trademarks found (codes 600-699)');
  } else {
    console.log('  ⚠️  No abandoned trademarks - check status mapping');
  }

  if (live > 0) {
    console.log('  ✅ Live trademarks found (codes 1-15)');
  } else {
    console.log('  ⚠️  No live trademarks - check status mapping');
  }

  if (pending > 0) {
    console.log('  ✅ Pending trademarks found (other codes)');
  }

  console.log('');

  // Sample some trademarks to verify
  console.log('📋 Sample trademarks:');
  console.log('--------------------');

  const samples = await db.execute(sql`
    SELECT serial_number, mark_identification, status
    FROM uspto_trademarks
    WHERE status IN ('abandoned', 'live', 'pending')
    ORDER BY status, serial_number
    LIMIT 15
  `);

  const sampleRows = (samples as any).rows || samples;
  for (const row of sampleRows) {
    const serial = row.serial_number;
    const mark = String(row.mark_identification).substring(0, 40);
    const status = row.status;
    console.log(`  ${serial} | ${status.padEnd(10)} | ${mark}`);
  }

  console.log('');
  console.log('✅ Import verification complete!');
  console.log('');

  process.exit(0);
}

checkStatusDistribution().catch((err) => {
  console.error('Error checking status distribution:', err);
  process.exit(1);
});
