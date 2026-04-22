/**
 * Run migration 003: Enable trigram fuzzy search
 */
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('🔄 Running migration: 003_enable_trigram_search.sql\n');

  try {
    const migrationPath = path.join(process.cwd(), 'migrations', '003_enable_trigram_search.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Enabled features:');
    console.log('   - pg_trgm extension: Fuzzy text similarity');
    console.log('   - Trigram index on mark_text_normalized: Fast fuzzy search');
    console.log('   - Metaphone index: Fast phonetic matching');
    console.log('\n💡 This enables professional-grade text similarity!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

runMigration().catch(console.error);
