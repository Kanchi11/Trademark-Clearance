import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, {
  max: 1,
  connect_timeout: 10,
  prepare: false,
});

async function checkData() {
  try {
    const totalResult = await sql`SELECT COUNT(*) as count FROM trademarks`;
    console.log('✅ Total trademarks:', totalResult[0].count);
    
    const class9Result = await sql`SELECT COUNT(*) as count FROM trademarks WHERE nice_classes @> ARRAY[9]`;
    console.log('✅ Class 9 trademarks:', class9Result[0].count);
    
    const appleResult = await sql`SELECT COUNT(*) as count FROM trademarks WHERE serial_number = '74053548'`;
    console.log('✅ APPLE trademark (74053548) exists:', appleResult[0].count);
    
    const testResult = await sql`SELECT serial_number, mark_text FROM trademarks WHERE LOWER(mark_text) LIKE '%apple%' AND nice_classes @> ARRAY[9] LIMIT 3`;
    console.log('✅ Sample APPLE results:', testResult.map(r => ({ serial: r.serial_number, text: r.mark_text })));
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkData();
