/**
 * Test if we can execute even a single UPDATE statement
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import postgres from 'postgres';

async function testSingleUpdate() {
  console.log('Testing single UPDATE statement execution...');
  console.log('');

  try {
    const sql = postgres(process.env.DATABASE_URL!, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 60, // Very long timeout
    });

    console.log('Attempting connection (60s timeout)...');

    // Try a single, simple UPDATE
    const result = await sql`
      UPDATE uspto_trademarks
      SET status = 'abandoned'
      WHERE serial_number = '60000001'
    `;

    console.log('✅ UPDATE successful!');
    console.log(`   Rows affected: ${result.count}`);
    console.log('');
    console.log('✅ Database is accessible - automated approach can work!');

    await sql.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Single UPDATE failed:', error.message);
    console.error('');
    console.error('🔍 Diagnosis:');

    if (error.code === 'CONNECT_TIMEOUT') {
      console.error('   Supabase is NOT accepting connections');
      console.error('   This is a Supabase-level issue, not our code');
      console.error('');
      console.error('📋 Recommended Action:');
      console.error('   1. Wait 30-60 minutes for Supabase to recover');
      console.error('   2. OR use Supabase Dashboard SQL Editor (manual)');
    } else {
      console.error('   Unexpected error:', error);
    }

    process.exit(1);
  }
}

testSingleUpdate();
