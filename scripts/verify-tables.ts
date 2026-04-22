import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import postgres from 'postgres';

async function verifyTables() {
  const sql = postgres(process.env.DATABASE_URL!);

  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;

  console.log('✅ Tables created in new database:');
  tables.forEach(t => console.log('   ✓', t.table_name));
  console.log('');

  await sql.end();
}

verifyTables();
