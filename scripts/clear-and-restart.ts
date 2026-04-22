import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function clearAndRestart() {
  console.log('🗑️  Clearing partial import data...\n');

  // Truncate the table
  await db.execute(sql`TRUNCATE TABLE uspto_trademarks`);

  console.log('✅ Database cleared!');
  console.log('');
  console.log('📊 Ready to restart import with COMPLETE data fields:');
  console.log('   ✅ Text search (mark_text, mark_text_normalized)');
  console.log('   ✅ Phonetic search (soundex + metaphone)');
  console.log('   ✅ Status filtering (live/abandoned/pending)');
  console.log('   ✅ Goods/services descriptions');
  console.log('   ✅ Owner, dates, classification');
  console.log('   ✅ Logo URLs');
  console.log('');
  console.log('Starting import now...');

  process.exit(0);
}

clearAndRestart();
