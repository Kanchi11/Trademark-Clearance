import postgres from 'postgres';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL || '';
const sql = postgres(DATABASE_URL, { max: 1, ssl: 'require' });

async function addMissingColumns() {
  try {
    console.log('🔧 Adding missing columns...\n');
    
    // Add mark_metaphone column
    try {
      await sql`ALTER TABLE uspto_trademarks ADD COLUMN IF NOT EXISTS mark_metaphone text`;
      console.log('✅ Added mark_metaphone column');
    } catch (e: any) {
      console.log('⚠️  mark_metaphone:', e.message);
    }
    
    // Add logo_url column  
    try {
      await sql`ALTER TABLE uspto_trademarks ADD COLUMN IF NOT EXISTS logo_url text`;
      console.log('✅ Added logo_url column');
    } catch (e: any) {
      console.log('⚠️  logo_url:', e.message);
    }
    
    // Add logo_hash column
    try {
      await sql`ALTER TABLE uspto_trademarks ADD COLUMN IF NOT EXISTS logo_hash text`;
      console.log('✅ Added logo_hash column');
    } catch (e: any) {
      console.log('⚠️  logo_hash:', e.message);
    }
    
    console.log('\n🎉 Schema updated successfully!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

addMissingColumns();
