import postgres from 'postgres';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const sql = postgres(process.env.DATABASE_URL!, {
  max: 1,
  ssl: 'require'
});

async function createHashTable() {
  try {
    console.log('Creating trademark_logo_hashes table...');
    await sql`
      CREATE TABLE IF NOT EXISTS trademark_logo_hashes (
        serial_number VARCHAR(20) PRIMARY KEY,
        logo_hash VARCHAR(64) NOT NULL,
        computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (serial_number) REFERENCES uspto_trademarks(serial_number) ON DELETE CASCADE
      )
    `;
    console.log('✅ Table created\n');
    
    console.log('Creating index on logo_hash column...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_logo_hash_lookup 
      ON trademark_logo_hashes(logo_hash)
    `;
    console.log('✅ Index created\n');
    
    console.log('Final database layout:');
    const tables = await sql`
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename IN ('uspto_trademarks', 'trademark_logo_hashes')
      ORDER BY tablename
    `;
    
    tables.forEach((t: any) => {
      console.log(`  ${t.tablename}: ${t.size}`);
    });
    
    const totalSize = await sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size,
             pg_database_size(current_database()) as bytes
    `;
    console.log(`\n📦 Total: ${totalSize[0].size} (${((parseInt(totalSize[0].bytes) / 536870912) * 100).toFixed(1)}% of 512 MB)`);
    console.log('\n✅ Ready for hash computation!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

createHashTable();
