import postgres from 'postgres';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const sql = postgres(process.env.DATABASE_URL!, {
  max: 1,
  ssl: 'require'
});

async function vacuumDatabase() {
  try {
    console.log('Running VACUUM FULL on uspto_trademarks to reclaim space...');
    console.log('⏱️  This may take a few minutes...\n');
    
    // VACUUM FULL can't run in a transaction, so we need to use unsafe mode
    await sql.unsafe('VACUUM FULL uspto_trademarks');
    
    console.log('✅ VACUUM FULL completed\n');
    
    console.log(' Checking freed space...');
    const afterVacuum = await sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size,
             pg_database_size(current_database()) as bytes,
             pg_size_pretty(pg_total_relation_size('public.uspto_trademarks')) as table_size
    `;
    console.log(`  Database: ${afterVacuum[0].size}`);
    console.log(`  uspto_trademarks: ${afterVacuum[0].table_size}`);
    console.log(`  Used: ${((parseInt(afterVacuum[0].bytes) / 536870912) * 100).toFixed(1)}%\n`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

vacuumDatabase();
