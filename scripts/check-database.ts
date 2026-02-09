import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { db } from '../db';
import { usptoTrademarks } from '../db/schema';
import { sql } from 'drizzle-orm';

async function checkDatabase() {
  try {
    console.log('Checking database...\n');
    
    // Count total records
    const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM uspto_trademarks`);
    console.log('Total records:', countResult[0]);
    
    // Get sample records
    const samples = await db.select().from(usptoTrademarks).limit(10);
    console.log('\nSample records:');
    samples.forEach(r => {
      console.log(`- ${r.markText} (${r.serialNumber}) - Status: ${r.status}`);
    });
    
    // Search for Nike specifically
    const nike = await db.select().from(usptoTrademarks)
      .where(sql`mark_text_normalized LIKE '%nike%'`)
      .limit(5);
    console.log('\nNike-related records:');
    console.log(nike.length > 0 ? nike : 'None found');
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkDatabase();
