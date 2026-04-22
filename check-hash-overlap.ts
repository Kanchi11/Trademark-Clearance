import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

config({ path: join(process.cwd(), '.env.local') });

const sql = postgres(process.env.DATABASE_URL!, { max: 1, ssl: 'require' });

(async () => {
  // Load hash file
  const hashesPath = join(process.cwd(), 'public', 'logo-hashes.json');
  const hashes: Record<string, string> = JSON.parse(readFileSync(hashesPath, 'utf-8'));
  
  // Get first 10 keys
  const sampleKeys = Object.keys(hashes).slice(0, 10);
  console.log('Sample keys from JSON:', sampleKeys);
  
  // Check how many exist in Neon
  let found = 0;
  for (const key of sampleKeys) {
    const result = await sql`SELECT serial_number FROM uspto_trademarks WHERE serial_number = ${key} LIMIT 1`;
    if (result.length > 0) {
      found++;
      console.log(`  ✓ Found: ${key}`);
    }
  }
  
  console.log(`\n${found} out of 10 sample keys found in Neon database`);
  
  // Get total count in Neon
  const total = await sql`SELECT COUNT(*) as count FROM uspto_trademarks`;
  console.log(`Total trademarks in Neon: ${total[0].count}`);
  
  await sql.end();
})();
