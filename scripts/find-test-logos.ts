import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function findTestLogos() {
  console.log('🔍 Finding trademarks with logos for testing...\n');

  const result = await db.execute(sql`
    SELECT serial_number, mark_text, logo_url, nice_classes
    FROM uspto_trademarks
    WHERE logo_url IS NOT NULL
    LIMIT 10
  `);

  console.log('Sample trademarks WITH logos:\n');
  result.forEach((row: any, idx: number) => {
    console.log(`${idx + 1}. ${row.mark_text}`);
    console.log(`   Serial: ${row.serial_number}`);
    console.log(`   Classes: ${row.nice_classes}`);
    console.log(`   Logo: ${row.logo_url}\n`);
  });

  process.exit(0);
}

findTestLogos().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
