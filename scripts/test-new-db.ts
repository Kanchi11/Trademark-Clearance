/**
 * Test new database with extended timeout
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import postgres from 'postgres';

async function testNewDB() {
  console.log('Testing NEW database connection...');
  console.log(`Project ID: ${process.env.DATABASE_URL?.match(/postgres\.([^:]+)/)?.[1]}`);
  console.log('');

  try {
    const sql = postgres(process.env.DATABASE_URL!, {
      max: 1,
      connect_timeout: 60, // 60 second timeout for new DB
      idle_timeout: 20,
    });

    console.log('Connecting (60s timeout)...');
    const result = await sql`SELECT version()`;

    console.log('✅ NEW DATABASE IS ACCESSIBLE!');
    console.log(`   PostgreSQL version: ${result[0].version.split(' ')[1]}`);
    console.log('');
    console.log('🎉 Ready to push schema and import data!');

    await sql.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    console.error('');
    console.error('📋 Possible causes:');
    console.error('   1. Database still provisioning (wait 2-3 minutes)');
    console.error('   2. Check Supabase dashboard - is project "ready"?');
    console.error('   3. Verify DATABASE_URL in .env.local is correct');
    process.exit(1);
  }
}

testNewDB();
