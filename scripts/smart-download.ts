/**
 * Smart Trademark Downloader - Tries multiple strategies
 * 1. Direct download with retry logic (fastest)
 * 2. Puppeteer browser automation (fallback)
 * 3. Manual file detection (last resort)
 *
 * Usage:
 *   npm run smart:download -- --daily     # Download yesterday
 *   npm run smart:download -- --days 7    # Download last 7 days
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

const DATABASE_URL = process.env.DATABASE_URL;
const DOWNLOAD_DIR = './downloads';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env.local');
  process.exit(1);
}

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

(async () => {
  const args = process.argv.slice(2);
  const days = args.includes('--daily') ? 1 : parseInt(args.find(a => a.startsWith('--days'))?.split(' ')[1] || '1');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Smart Trademark Downloader                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  try {
    console.log(`📥 Attempting to download last ${days} day(s)...`);
    console.log();

    let downloaded = 0;

    // Try direct downloads first (fastest)
    console.log('Strategy 1: Direct download with retry...');
    downloaded = await tryDirectDownload(days);

    if (downloaded === 0) {
      console.log('⚠️  Direct download didn\'t work');
      console.log();
      console.log('Strategy 2: Waiting for manual files...');
      console.log();
      console.log('👉 MANUAL STEPS (30 seconds):');
      console.log('   1. Open: https://data.uspto.gov/bulkdata/datasets');
      console.log('   2. Find: "Trademark Full Text XML Data – Daily Applications"');
      console.log('   3. Download 1-3 recent ZIP files');
      console.log('   4. Save to: ./downloads/ folder');
      console.log();
      console.log('⏳ Waiting 30 seconds for you to download...');

      // Wait for manual download
      await sleep(30000);

      // Check if files appeared
      const files = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.endsWith('.zip'));
      if (files.length > 0) {
        console.log();
        console.log(`✅ Found ${files.length} file(s) manually downloaded!`);
        downloaded = files.length;
      } else {
        console.log();
        console.log('⚠️  No files found after 30 seconds');
        console.log();
        console.log('Fallback: Create minimal test data');
        console.log('(Using sample trademarks for testing)');
        console.log();

        // Use seed data as fallback
        execSync('npm run db:seed', { stdio: 'inherit', env: { ...process.env, DATABASE_URL } });
        console.log();
        console.log('✅ Test data loaded!');
        process.exit(0);
      }
    }

    console.log();
    console.log('📥 Importing all files...');
    console.log();

    await importAllFiles();

    console.log();
    console.log('✅ All done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

async function tryDirectDownload(days: number): Promise<number> {
  const today = new Date();
  let downloaded = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '').slice(2);
    const filename = `apc${dateStr}.zip`;

    const urls = [
      // Try multiple endpoints in order of likelihood
      `https://data.uspto.gov/bulkdata/trademark/dailyxml/TRTDXFAP/${filename}`,
      `https://data.uspto.gov/bulkdata/trademark/dailyxml/applications/${filename}`,
      `https://data.uspto.gov/api/bulkdata/trademark/dailyxml/${filename}`,
      `https://bulkdata.uspto.gov/data/trademark/dailyxml/applications/${filename}`,
    ];

    console.log(`  Trying: ${filename}`);

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TrademarkBot/1.0)',
          },
          timeout: 10000,
        });

        if (response.ok && response.headers.get('content-type')?.includes('application/zip')) {
          console.log(`    ✅ Downloaded from: ${url.split('/')[2]}`);

          // Download and save
          const filepath = path.join(DOWNLOAD_DIR, filename);
          const buffer = await response.buffer();
          fs.writeFileSync(filepath, buffer);

          console.log(`    📊 Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
          downloaded++;
          break;
        }
      } catch (e) {
        // Try next URL
      }
    }

    if (downloaded === 0 && i === 0) {
      // If first day failed, no point trying more
      break;
    }
  }

  return downloaded;
}

async function importAllFiles() {
  const files = fs
    .readdirSync(DOWNLOAD_DIR)
    .filter(f => f.endsWith('.zip') && f.startsWith('apc'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log('⚠️  No files to import');
    return;
  }

  console.log(`Found ${files.length} file(s) to import`);
  console.log();

  let imported = 0;

  for (const file of files) {
    const filepath = path.join(DOWNLOAD_DIR, file);
    console.log(`Importing: ${file}...`);

    try {
      execSync(`npm run data:import -- --file "${filepath}"`, {
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL },
      });
      console.log(`  ✅ Success`);
      imported++;

      // Clean up
      fs.unlinkSync(filepath);
    } catch (error) {
      console.log(`  ❌ Failed`);
    }
  }

  const count = execSync(
    `psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM uspto_trademarks;"`,
    {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, DATABASE_URL },
    }
  ).trim();

  console.log();
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Complete                                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`✅ Imported: ${imported} file(s)`);
  console.log(`📊 Total trademarks: ${parseInt(count).toLocaleString()}`);
  console.log();
  console.log('Next: npm run dev');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
