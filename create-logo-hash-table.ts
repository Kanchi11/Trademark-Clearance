import postgres from 'postgres';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const sql = postgres(process.env.DATABASE_URL!, {
  max: 1,
  ssl: 'require'
});

async function createLogoHashTable() {
  try {
    console.log('Creating trademark_logo_hashes table...');
    
    // Create new table for logo hashes (separate from main trademarks table)
    await sql`
      CREATE TABLE IF NOT EXISTS trademark_logo_hashes (
        serial_number VARCHAR(20) PRIMARY KEY,
        logo_hash VARCHAR(64),
        computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (serial_number) REFERENCES trademarks(serial_number) ON DELETE CASCADE
      )
    `;
    
    console.log('✅ trademark_logo_hashes table created');
    
    // Create index for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_logo_hash_lookup 
      ON trademark_logo_hashes(logo_hash)
    `;
    
    console.log('✅ Index created on logo_hash column');
    
    // Check if we have any existing logo hashes in the main table to migrate
    const existingHashesCount = await sql`
      SELECT COUNT(*) as count 
      FROM trademarks 
      WHERE logo_hash IS NOT NULL AND logo_hash != ''
    `;
    
    console.log(`\n📊 Found ${existingHashesCount[0].count} existing hashes in main table`);
    
    if (parseInt(existingHashesCount[0].count) > 0) {
      console.log('Migrating existing hashes to new table...');
      
      await sql`
        INSERT INTO trademark_logo_hashes (serial_number, logo_hash)
        SELECT serial_number, logo_hash 
        FROM trademarks 
        WHERE logo_hash IS NOT NULL AND logo_hash != ''
        ON CONFLICT (serial_number) DO NOTHING
      `;
      
      console.log('✅ Existing hashes migrated');
    }
    
    // Get final count
    const finalCount = await sql`
      SELECT COUNT(*) as count FROM trademark_logo_hashes
    `;
    
    console.log(`\n✅ Total hashes in new table: ${finalCount[0].count}`);
    
    // Show table sizes
    console.log('\n📊 Database Storage Usage:');
    const sizes = await sql`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        pg_total_relation_size(schemaname||'.'||tablename) AS bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `;
    
    sizes.forEach((row: any) => {
      console.log(`  ${row.tablename}: ${row.size}`);
    });
    
    // Total project size
    const totalSize = await sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    console.log(`\n📦 Total database size: ${totalSize[0].size}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

createLogoHashTable();
