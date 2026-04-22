/**
 * Test DIRECT database connection (bypasses connection pool)
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import postgres from 'postgres';

async function testDirectConnection() {
  console.log('Testing DIRECT database connection (bypassing pool)...');
  console.log('');

  // Convert pooled URL to direct connection
  const pooledUrl = process.env.DATABASE_URL!;
  const directUrl = pooledUrl
    .replace(':6543', ':5432')  // Use direct port instead of pooler
    .replace('?pgbouncer=true', '');  // Remove pgbouncer flag

  console.log('Pooled (unhealthy):  ...pooler.supabase.com:6543');
  console.log('Direct (trying):     ...pooler.supabase.com:5432');
  console.log('');

  try {
    const sql = postgres(directUrl, {
      max: 1,
      connect_timeout: 30,
    });

    console.log('Attempting direct connection...');
    const result = await sql`SELECT COUNT(*) as count FROM uspto_trademarks LIMIT 1`;
    console.log('✅ DIRECT CONNECTION SUCCESSFUL!');
    console.log(`   Total trademarks: ${result[0].count}`);
    console.log('');
    console.log('🎉 We can bypass the unhealthy pool and run updates!');

    await sql.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Direct connection also failed:', error.message);
    console.error('');
    console.error('📋 You need to manually use Supabase SQL Editor:');
    console.error('   1. Go to Supabase Dashboard → SQL Editor');
    console.error('   2. Run the QUICK_TEST.sql file');
    console.error('   3. Then run chunks manually or wait for pool to recover');
    process.exit(1);
  }
}

testDirectConnection();
