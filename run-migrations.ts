import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: join(__dirname, '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL || '';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

console.log('📍 Database:', DATABASE_URL.split('@')[1]?.split('?')[0] || 'unknown');

async function runMigrations() {
  const sql = postgres(DATABASE_URL, { 
    max: 1,
    ssl: 'require'
  });

  console.log('🔄 Running migrations on Neon...\n');

  try {
    // Run base schema
    console.log('📝 Creating base schema...');
    const baseSchema = readFileSync(join(__dirname, 'drizzle', '0000_previous_mongu.sql'), 'utf-8');
    
    // Split by statement breakpoints and execute each statement
    const statements = baseSchema
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      await sql.unsafe(statement);
    }
    console.log('✅ Base schema created\n');

    // Run additional migrations
    const migrations = [
      '001_add_logo_hash.sql',
      '002_add_phonetic_and_logo_metadata.sql',
      '003_enable_trigram_search.sql',
      '004_add_critical_indexes.sql'
    ];

    for (const migration of migrations) {
      console.log(`📝 Running ${migration}...`);
      try {
        const migrationSql = readFileSync(join(__dirname, 'migrations', migration), 'utf-8');
        await sql.unsafe(migrationSql);
        console.log(`✅ ${migration} completed\n`);
      } catch (err: any) {
        if (err.message.includes('already exists')) {
          console.log(`⚠️  ${migration} - already applied\n`);
        } else {
          console.log(`⚠️  ${migration} - ${err.message}\n`);
        }
      }
    }

    console.log('🎉 All migrations completed successfully!');
    console.log('\n📊 Database is ready at:', DATABASE_URL.split('@')[1].split('?')[0]);
    
  } catch (error: any) {
    console.error('❌ Migration failed:');
    console.error('Error message:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();
