import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, {
  max: 1,
  connect_timeout: 10,
  prepare: false,
});

async function checkIndexes() {
  try {
    console.log('Checking database indexes...\n');
    
    const result = await sql`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'uspto_trademarks'
      ORDER BY indexname;
    `;
    
    console.log(`Found ${result.length} indexes on uspto_trademarks table:\n`);
    result.forEach((row, i) => {
      console.log(`${i + 1}. ${row.indexname}`);
    });
    
    const criticalIndexes = [
      'idx_nice_classes_gin',
      'idx_mark_soundex',
      'idx_mark_normalized_classes',
      'idx_logo_hash',
      'idx_status'
    ];
    
    console.log('\n---Critical Index Status---');
    criticalIndexes.forEach(idx => {
      const exists = result.some(r => r.indexname === idx);
      console.log(`${exists ? '✅' : '❌'} ${idx}`);
    });
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkIndexes();
