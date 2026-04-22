import postgres from 'postgres';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(process.cwd(), '.env.local') });

const sql = postgres(process.env.DATABASE_URL!, { max: 1, ssl: 'require' });

(async () => {
  // Check if 31684328 is an ID or serial number
  const byId = await sql`SELECT id, serial_number, mark_text FROM uspto_trademarks WHERE id = 31684328 LIMIT 1`;
  const bySerial = await sql`SELECT id, serial_number, mark_text FROM uspto_trademarks WHERE serial_number = '31684328' LIMIT 1`;
  
  console.log('Check by ID 31684328:', byId);
  console.log('Check by serial_number "31684328":', bySerial);
  
  await sql.end();
})();
