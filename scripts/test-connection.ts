/**
 * Test basic database connectivity
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import postgres from 'postgres';

async function testConnection() {
  console.log('Testing database connection...');
  console.log('');

  try {
    const sql = postgres(process.env.DATABASE_URL!, {
      max: 1,
      connect_timeout: 10,
    });

    console.log('Attempting to connect...');
    const result = await sql`SELECT COUNT(*) as count FROM uspto_trademarks LIMIT 1`;
    console.log('✅ Connection successful!');
    console.log(`   Total trademarks: ${result[0].count}`);

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  }
}

testConnection();
