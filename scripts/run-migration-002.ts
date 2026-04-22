/**
 * Run migration to add phonetic and logo metadata columns
 */
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('🔄 Running migration: 002_add_phonetic_and_logo_metadata.sql\n');

  try {
    const migrationPath = path.join(process.cwd(), 'migrations', '002_add_phonetic_and_logo_metadata.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute the migration (db is already the drizzle instance)
    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 New columns added:');
    console.log('   - mark_metaphone: Double metaphone for phonetic matching');
    console.log('   - logo_color_histogram: Color distribution for fast filtering');
    console.log('   - logo_aspect_ratio: Shape-based pre-filtering');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

runMigration().catch(console.error);
