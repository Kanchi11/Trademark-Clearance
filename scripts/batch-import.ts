/**
 * Batch import all ZIP files from downloads folder
 * Usage: npm run import:batch
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const DATABASE_URL = process.env.DATABASE_URL;
const DOWNLOAD_DIR = './downloads';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env.local');
  process.exit(1);
}

(async () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Batch Import - All ZIP Files from ./downloads/           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  if (!fs.existsSync(DOWNLOAD_DIR)) {
    console.error(`❌ Downloads directory not found: ${DOWNLOAD_DIR}`);
    console.error();
    console.error('Create it and add ZIP files:');
    console.error('  mkdir ./downloads');
    console.error('  # Download ZIP files from https://data.uspto.gov/bulkdata/datasets');
    console.error('  # Save to ./downloads/');
    process.exit(1);
  }

  const files = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.endsWith('.zip'));

  if (files.length === 0) {
    console.error(`❌ No ZIP files found in ${DOWNLOAD_DIR}`);
    console.error();
    console.error('Steps:');
    console.error('  1. Go to: https://data.uspto.gov/bulkdata/datasets');
    console.error('  2. Download ZIP files');
    console.error('  3. Save to: ./downloads/');
    process.exit(1);
  }

  console.log(`📂 Found ${files.length} ZIP file(s) to import:`);
  files.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));
  console.log();

  let imported = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filepath = path.join(DOWNLOAD_DIR, file);

    console.log(`[${i + 1}/${files.length}] Importing: ${file}...`);

    try {
      execSync(`npm run data:import -- --file "${filepath}"`, {
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL },
      });
      console.log(`       ✅ Success`);
      imported++;
    } catch (error) {
      console.log(`       ❌ Failed: ${error.message}`);
      failed++;
    }

    console.log();
  }

  // Show summary
  const count = execSync(
    `psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM uspto_trademarks;"`,
    {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, DATABASE_URL },
    }
  ).trim();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Import Summary                                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`✅ Imported: ${imported} files`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed} files`);
  }
  console.log(`📊 Total trademarks in database: ${parseInt(count).toLocaleString()}`);
  console.log();

  if (failed === 0 && imported > 0) {
    console.log('🎉 All files imported successfully!');
    console.log();
    console.log('Next steps:');
    console.log('  1. Start dev server: npm run dev');
    console.log('  2. Visit: http://localhost:3000/search');
    console.log('  3. Try searching: NIKE, APPLE, GOOGLE');
  }

  process.exit(failed > 0 ? 1 : 0);
})();
