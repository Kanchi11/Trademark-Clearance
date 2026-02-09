import { db } from '../db';
import { sql } from 'drizzle-orm';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('✅ Connection successful!');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
}

testConnection().then(() => process.exit(0));