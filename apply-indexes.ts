import { config } from 'dotenv';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, {
  max: 1,
  connect_timeout: 30,
  idle_timeout: 60,
  prepare: false,
});

async function applyIndexes() {
  try {
    console.log('📊 Applying critical indexes for search performance...\n');
    
    const migrationPath = path.join(__dirname, 'migrations', '004_add_critical_indexes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration SQL...');
    await sql.unsafe(migrationSQL);
    
    console.log('\n✅ Indexes created successfully!');
    console.log('\nIndexes added:');
    console.log('  - idx_nice_classes_gin: Fast array searches on nice_classes');
    console.log('  - idx_mark_soundex: Fast Soundex phonetic matching');
    console.log('  - idx_mark_normalized_classes: Composite index for exact matches');
    console.log('  - idx_logo_hash: Fast logo similarity lookups');
    console.log('  - idx_status: Filter by trademark status');
    
    console.log('\n🚀 Your searches should now be MUCH faster!');
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error applying indexes:', error);
    await sql.end();
    process.exit(1);
  }
}

applyIndexes();
