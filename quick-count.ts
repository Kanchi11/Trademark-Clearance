import postgres from 'postgres';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '.env.local') });

const sql = postgres(process.env.DATABASE_URL!, { max: 1, ssl: 'require' });

(async () => {
  const result = await sql`SELECT COUNT(*) as count FROM uspto_trademarks`;
  console.log(`Total: ${result[0].count}`);
  await sql.end();
})();
