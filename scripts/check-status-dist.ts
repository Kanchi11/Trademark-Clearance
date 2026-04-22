import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function checkStatus() {
  // Check status distribution
  const statusDist = await db.execute(sql`
    SELECT status, COUNT(*) as count
    FROM uspto_trademarks
    GROUP BY status
    ORDER BY count DESC
  `);

  console.log('Status distribution:');
  statusDist.forEach((row: any) => {
    const count = Number(row.count);
    console.log(`  ${row.status}: ${count.toLocaleString()}`);
  });

  // Check sample of actual records
  const samples = await db.execute(sql`
    SELECT serial_number, mark_text, status, registration_date
    FROM uspto_trademarks
    WHERE mark_text ILIKE '%NIKE%'
    LIMIT 5
  `);

  console.log('\nSample NIKE trademarks:');
  samples.forEach((row: any) => {
    console.log(`  ${row.mark_text} - ${row.status} - ${row.serial_number}`);
  });

  process.exit(0);
}

checkStatus().catch(console.error);
