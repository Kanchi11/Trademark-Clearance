import postgres from 'postgres';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const sql = postgres(process.env.DATABASE_URL!, {
  max: 1,
  ssl: 'require'
});

async function reorganizeForHashTable() {
  try {
    console.log('Step 1: Counting existing hashes before dropping column...');
    const hashCount = await sql`
      SELECT COUNT(*) as count 
      FROM uspto_trademarks 
      WHERE logo_hash IS NOT NULL AND logo_hash != ''
    `;
    console.log(`  Found ${hashCount[0].count} existing hashes\n`);
    
    console.log('Step 2: Dropping logo_hash column from main table to free space...');
    await sql`ALTER TABLE uspto_trademarks DROP COLUMN IF EXISTS logo_hash`;
    console.log('  ✅ Column dropped\n');
    
    console.log('Step 3: Checking freed space...');
   const afterDrop = await sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size,
             pg_database_size(current_database()) as bytes
    `;
    console.log(`  Database size: ${afterDrop[0].size}`);
    console.log(`  Used: ${((parseInt(afterDrop[0].bytes) / 536870912) * 100).toFixed(1)}%\n`);
    
    console.log('Step 4: Creating new trademark_logo_hashes table...');
    await sql`
      CREATE TABLE IF NOT EXISTS trademark_logo_hashes (
        serial_number VARCHAR(20) PRIMARY KEY,
        logo_hash VARCHAR(64) NOT NULL,
        computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('  ✅ Table created\n');
    
    console.log('Step 5: Creating index on logo_hash...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_logo_hash_lookup 
      ON trademark_logo_hashes(logo_hash)
    `;
    console.log('  ✅ Index created\n');
    
    console.log('Step 6: Final storage check...');
    const final = await sql`
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename IN ('uspto_trademarks', 'trademark_logo_hashes')
      ORDER BY tablename
    `;
    
    final.forEach((t: any) => {
      console.log(`  ${t.tablename}: ${t.size}`);
    });
    
    const totalSize = await sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    console.log(`\n📦 Total database: ${totalSize[0].size}`);
    console.log('\n✅ Ready for hash computation!');
    console.log('   Hashes will be stored in trademark_logo_hashes table');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

reorganizeForHashTable();
