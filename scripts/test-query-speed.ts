import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../db/index.js';
import { usptoTrademarks } from '../db/schema.js';
import { sql, or, ilike } from 'drizzle-orm';

async function testSearchSpeed() {
  console.log('Testing USPTO database search speed...\n');

  const markText = 'TestBrand';
  const niceClasses = [9];

  const start = Date.now();

  const results = await db
    .select()
    .from(usptoTrademarks)
    .where(
      sql`${usptoTrademarks.niceClasses} && ARRAY[${sql.raw(niceClasses.join(','))}]::integer[]`
    )
    .limit(50);

  const duration = Date.now() - start;

  console.log(`✅ Query completed in ${duration}ms`);
  console.log(`   Found ${results.length} results`);
  console.log(`   First result: ${results[0]?.markText || 'none'}`);

  process.exit(0);
}

testSearchSpeed();
