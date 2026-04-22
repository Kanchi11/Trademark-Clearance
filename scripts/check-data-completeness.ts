import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function checkDataCompleteness() {
  console.log('🔍 Checking Data Completeness for Trademark Clearance App');
  console.log('=========================================================\n');

  // Get sample records
  const sample = await db.execute(sql`
    SELECT * FROM uspto_trademarks
    WHERE serial_number IS NOT NULL
    LIMIT 5
  `);

  const results = (sample as any).rows || sample;

  if (results.length === 0) {
    console.log('❌ No data found in database yet');
    process.exit(1);
  }

  console.log('📊 Sample Record Analysis:\n');

  const firstRow = results[0];
  const fields = Object.keys(firstRow);

  console.log('Fields being populated:');
  console.log('----------------------\n');

  for (const key of fields) {
    const value = firstRow[key];
    const hasValue = value !== null && value !== undefined && value !== '';
    const status = hasValue ? '✅' : '❌';
    const preview = hasValue ? String(value).substring(0, 60) : '(null/empty)';
    console.log(`${status} ${key.padEnd(30)} ${preview}${String(value).length > 60 ? '...' : ''}`);
  }

  console.log('\n\n🎯 Critical Fields for Trademark Clearance:\n');
  console.log('-------------------------------------------\n');

  // Check critical fields
  const criticalFields = {
    'serial_number': 'Unique identifier',
    'mark_identification': 'Text for similarity search',
    'status': 'Live/Dead filtering',
    'mark_metaphone': 'Phonetic search',
    'logo_hash': 'Image similarity',
    'owner_name': 'Display in results',
    'goods_services': 'Context/class info',
    'filing_date': 'Timeline info',
    'registration_date': 'Registration status'
  };

  let missingCriticalFields = 0;

  for (const [field, purpose] of Object.entries(criticalFields)) {
    const value = firstRow[field];
    const hasValue = value !== null && value !== undefined && value !== '';
    const status = hasValue ? '✅' : '⚠️';

    console.log(`${status} ${field.padEnd(25)} - ${purpose}`);
    if (!hasValue) {
      missingCriticalFields++;
      console.log(`   ${!hasValue ? '→ NOT POPULATED' : ''}`);
    }
  }

  console.log('\n\n📈 Data Population Summary:\n');

  // Count non-null values for critical fields
  for (const [field, purpose] of Object.entries(criticalFields)) {
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total,
             COUNT(${sql.raw(field)}) as populated
      FROM uspto_trademarks
    `);

    const row = ((countResult as any).rows || countResult)[0];
    const total = Number(row.total);
    const populated = Number(row.populated);
    const percentage = total > 0 ? ((populated / total) * 100).toFixed(1) : 0;

    console.log(`${field.padEnd(25)}: ${populated.toLocaleString().padStart(8)} / ${total.toLocaleString()} (${percentage}%)`);
  }

  console.log('\n✅ Data check complete!\n');

  process.exit(0);
}

checkDataCompleteness();
