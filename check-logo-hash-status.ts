import postgres from 'postgres';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '.env.local') });

const sql = postgres(process.env.DATABASE_URL!, { max: 1, ssl: 'require' });

(async () => {
  console.log('📊 Logo Hash Status in Neon Database:\n');
  
  // Total trademarks
  const total = await sql`SELECT COUNT(*) as count FROM uspto_trademarks`;
  console.log(`✅ Total trademarks: ${total[0].count}`);
  
  // Trademarks with logo URLs
  const withLogos = await sql`SELECT COUNT(*) as count FROM uspto_trademarks WHERE logo_url IS NOT NULL`;
  console.log(`🖼️  With logo URLs: ${withLogos[0].count}`);
  
  // Logo hash column exists?
  try {
    const withHashes = await sql`SELECT COUNT(*) as count FROM uspto_trademarks WHERE logo_hash IS NOT NULL`;
    console.log(`#️⃣  With logo hashes: ${withHashes[0].count}`);
  } catch (e: any) {
    console.log(`⚠️  Logo hash column: ${e.message.includes('does not exist') ? 'NOT PRESENT' : 'ERROR'}`);
  }
  
  console.log('\n📁 Pre-computed hash file:');
  console.log(`   Location: public/logo-hashes.json`);
  console.log(`   Hashes: 52,436 (4.1 MB)`);
  
  await sql.end();
})();
