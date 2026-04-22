/**
 * Run database migration to add logo_hash column
 */

import '@/src/core/setup';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('🔄 Running database migration: Add logo_hash column\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'migrations', '001_add_logo_hash.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Migration SQL:');
    console.log('─'.repeat(60));
    console.log(migrationSQL);
    console.log('─'.repeat(60));
    console.log();

    // Split by statement separator and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      try {
        await db.execute(sql.raw(statement));
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.message?.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('═'.repeat(60));
    console.log();
    console.log('Next steps:');
    console.log('  1. Run: npm run db:populate-hashes');
    console.log('  2. Wait 2-4 hours for hash computation');
    console.log('  3. Logo similarity will then search ALL logos efficiently!');
    console.log();

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
