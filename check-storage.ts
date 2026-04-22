import postgres from 'postgres';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const sql = postgres(process.env.DATABASE_URL!, {
  max: 1,
  ssl: 'require'
});

async function checkStorage() {
  try {
    // Get table sizes
    console.log('📊 Table Storage Usage:\n');
    const tables = await sql`
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS total_size,
        pg_size_pretty(pg_relation_size('public.'||tablename)) AS table_size,
        pg_size_pretty(pg_total_relation_size('public.'||tablename) - pg_relation_size('public.'||tablename)) AS indexes_size
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size('public.'||tablename) DESC
    `;
    
    tables.forEach((t: any) => {
      console.log(`${t.tablename}:`);
      console.log(`  Total: ${t.total_size} (Table: ${t.table_size}, Indexes: ${t.indexes_size})`);
    });
    
    // Total database size
    const dbSize = await sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size,
             pg_database_size(current_database()) as bytes
    `;
    console.log(`\n📦 Total Database: ${dbSize[0].size} (${dbSize[0].bytes} bytes)`);
    console.log(`⚠️  Free tier limit: 512 MB (536,870,912 bytes)`);
    console.log(`📈 Used: ${((parseInt(dbSize[0].bytes) / 536870912) * 100).toFixed(1)}%`);
    
    // Count records
    const counts = await sql`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE logo_hash IS NOT NULL) as with_hash
      FROM trademarks
    `;
    console.log(`\n📊 Trademarks: ${counts[0].total} total, ${counts[0].with_hash} with hashes`);
    
  } catch (error:any) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkStorage();
