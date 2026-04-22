import { config } from 'dotenv';
import postgres from 'postgres';

// Load environment variables
config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

console.log('Testing direct connection...');
console.log('Connection string:', connectionString?.substring(0, 50) + '...');

// Create a client with no pooling, just 1 connection
const sql = postgres(connectionString!, {
  max: 1,
  idle_timeout: 5,
  connect_timeout: 5,
  prepare: false,
  transform: {
    undefined: null,
  }
});

async function test() {
  try {
    console.log('Executing simple query...');
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Connection successful!', result);
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error);
    await sql.end();
    process.exit(1);
  }
}

test();
