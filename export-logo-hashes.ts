import postgres from 'postgres';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const sql = postgres(process.env.DATABASE_URL!, { max: 1, ssl: 'require' });

async function exportLogoHashes() {
  const outFile = `logo-hashes-${new Date().toISOString().slice(0,10)}.jsonl`;
  const out = createWriteStream(outFile);
  let offset = 0;
  const batchSize = 5000;
  let total = 0;

  console.log(`Exporting logo hashes to ${outFile} ...`);

  while (true) {
    const rows = await sql`
      SELECT serial_number, logo_hash
      FROM trademark_logo_hashes
      ORDER BY serial_number
      OFFSET ${offset}
      LIMIT ${batchSize}
    `;
    if (rows.length === 0) break;
    for (const row of rows) {
      out.write(JSON.stringify(row) + '\n');
      total++;
    }
    offset += rows.length;
    process.stdout.write(`\rExported: ${total}`);
  }
  out.end();
  await new Promise(r => out.on('finish', r));
  await sql.end();
  console.log(`\n✅ Export complete. Total hashes: ${total}`);
  console.log(`File: ${outFile}`);
}

exportLogoHashes();
