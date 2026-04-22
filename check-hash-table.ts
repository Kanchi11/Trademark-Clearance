import postgres from 'postgres';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  ssl: 'require'
});

async function checkHashTable() {
  const count = await sql`SELECT COUNT(*) as count FROM trademark_logo_hashes`;
  console.log(`✅ Hashes in trademark_logo_hashes table: ${count[0].count}`);
  
  const sample = await sql`
    SELECT serial_number, LEFT(logo_hash, 16) || '...' as hash_preview, computed_at
    FROM trademark_logo_hashes
    ORDER BY computed_at DESC
    LIMIT 5
  `;
  
  if (sample.length > 0) {
    console.log('\n📝 Latest hashes:');
    sample.forEach((row: any) => {
      console.log(`  ${row.serial_number}: ${row.hash_preview} (${row.computed_at})`);
    });
  }
  
  await sql.end();
}

checkHashTable();
