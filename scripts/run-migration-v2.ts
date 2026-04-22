/**
 * Run database migration to add logo_hash column - ROBUST VERSION
 */

import '@/src/core/setup';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('🔄 Running database migration: Add logo_hash column\n');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  // Create direct postgres connection
  const sql = postgres(databaseUrl);

  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'migrations', '001_add_logo_hash.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Migration SQL:');
    console.log('─'.repeat(60));
    console.log(migrationSQL);
    console.log('─'.repeat(60));
    console.log();

    // Execute each SQL statement
    console.log('Step 1: Adding logo_hash column...');
    await sql`
      ALTER TABLE uspto_trademarks
      ADD COLUMN IF NOT EXISTS logo_hash TEXT
    `;
    console.log('✅ Column added');

    console.log('\nStep 2: Creating index on logo_hash...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_uspto_trademarks_logo_hash
      ON uspto_trademarks(logo_hash)
      WHERE logo_hash IS NOT NULL
    `;
    console.log('✅ Index created');

    console.log('\nStep 3: Creating index on logo_url...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_uspto_trademarks_has_logo
      ON uspto_trademarks(logo_url)
      WHERE logo_url IS NOT NULL
    `;
    console.log('✅ Index created');

    // Verify the column was added
    console.log('\n📋 Verification:');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'uspto_trademarks'
      AND column_name IN ('logo_url', 'logo_hash')
      ORDER BY column_name
    `;

    console.log('─'.repeat(60));
    columns.forEach((row: any) => {
      console.log(`  ${row.column_name.padEnd(20)} | ${row.data_type.padEnd(15)} | nullable: ${row.is_nullable}`);
    });
    console.log('─'.repeat(60));

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('═'.repeat(60));
    console.log();
    console.log('Next steps:');
    console.log('  1. Run: npm run db:populate-hashes');
    console.log('  2. Wait 2-4 hours for hash computation');
    console.log('  3. Logo similarity will then search ALL logos efficiently!');
    console.log();

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await sql.end();
    process.exit(1);
  }
}

runMigration();
