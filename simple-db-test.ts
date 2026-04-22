/**
 * Simple test - bypass all the DI complexity
 */
import 'dotenv/config';
import { db } from '@/db';
import { usptoTrademarks } from '@/db/schema';
import { sql } from 'drizzle-orm';

async function simpleTest() {
  console.log('\n🧪 Simple Database Test\n');
  
  try {
    console.log('Connecting to database...');
    
    // Simple count query
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(usptoTrademarks)
      .limit(1);
    
    console.log(`✅ Database connected! Total trademarks: ${result[0].count}`);
    
    // Simple search
    console.log('\nTesting simple search for "APPLE"...');
    const appleResults = await db
      .select({
        serial_number: usptoTrademarks.serialNumber,
        mark_text: usptoTrademarks.markText,
        status: usptoTrademarks.status,
      })
      .from(usptoTrademarks)
      .where(sql`LOWER(mark_text) = 'apple'`)
      .limit(5);
    
    console.log(`Found ${appleResults.length} exact matches:`);
    appleResults.forEach(r => {
      console.log(`  - ${r.mark_text} (${r.serial_number}) - ${r.status}`);
    });
    
    console.log('\n✅ Database is working correctly!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Database error:', error);
    process.exit(1);
  }
}

simpleTest();
