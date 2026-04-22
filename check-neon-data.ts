import postgres from 'postgres';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL || '';
const sql = postgres(DATABASE_URL, { max: 1, ssl: 'require' });

async function checkDatabase() {
  try {
    console.log('📊 Checking Neon database...\n');
    
    const trademarkCount = await sql`SELECT COUNT(*) as count FROM uspto_trademarks`;
    console.log('✅ Total trademarks:', trademarkCount[0].count.toString());
    
    const logoHashCount = await sql`SELECT COUNT(*) as count FROM uspto_trademarks WHERE logo_hash IS NOT NULL`;
    console.log('✅ Trademarks with logo hashes:', logoHashCount[0].count.toString());
    
    const sampleData = await sql`SELECT mark_text, owner_name, status FROM uspto_trademarks LIMIT 5`;
    console.log('\n📝 Sample trademarks:');
    sampleData.forEach((row: any) => {
      console.log(`  - ${row.mark_text} (${row.owner_name || 'Unknown'}) - ${row.status}`);
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkDatabase();
