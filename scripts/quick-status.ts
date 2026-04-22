import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function quickCheck() {
  const total = await db.execute(sql`SELECT COUNT(*) as count FROM uspto_trademarks`);
  const totalCount = total[0]?.count || (total as any).rows?.[0]?.count || 0;
  console.log('Total in database:', Number(totalCount).toLocaleString());

  const statuses = await db.execute(sql`
    SELECT status, COUNT(*) as count
    FROM uspto_trademarks
    GROUP BY status
    ORDER BY count DESC
  `);

  console.log('\nStatus breakdown:');
  const results = (statuses as any).rows || statuses;
  for (const row of results) {
    console.log(`  ${row.status}: ${Number(row.count).toLocaleString()}`);
  }

  process.exit(0);
}

quickCheck();
