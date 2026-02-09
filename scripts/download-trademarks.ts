/**
 * Download and import trademark data from USPTO
 * Handles multiple ZIP files and incremental updates
 *
 * Usage:
 *   npm run download:trademarks -- --daily    # Download latest day
 *   npm run download:trademarks -- --annual   # Download annual backfile
 *   npm run download:trademarks -- --days 7   # Download last 7 days
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import AdmZip from 'adm-zip';

const DATABASE_URL = process.env.DATABASE_URL;
const TEMP_DIR = './downloads';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env.local');
  process.exit(1);
}

// Create downloads directory if it doesn't exist
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

(async () => {
  const args = process.argv.slice(2);
  const daily = args.includes('--daily');
  const annual = args.includes('--annual');
  const daysStr = args.find(a => a.startsWith('--days'));
  const days = daysStr ? parseInt(daysStr.split(' ')[1] || '1') : 1;

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Trademark Data Download & Import                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  try {
    if (annual) {
      await downloadAnnual();
    } else if (daily || days > 0) {
      await downloadDaily(days);
    } else {
      console.log('Usage: npm run download:trademarks -- [--daily|--annual|--days N]');
      console.log('  --daily    : Download and import yesterday\'s applications');
      console.log('  --annual   : Download and import annual backfile (12M+ trademarks)');
      console.log('  --days N   : Download and import last N days of applications');
      process.exit(1);
    }

    console.log();
    console.log('✅ All files processed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

async function downloadDaily(days: number) {
  console.log(`📥 Downloading last ${days} day(s) of trademark applications...`);
  console.log();

  const urls: string[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '').slice(2);
    const filename = `apc${dateStr}.zip`;

    // Direct S3-style URLs that might work
    const urls_to_try = [
      `https://data.uspto.gov/api/bulkdata/trademark/dailyxml/applications/${filename}`,
      `https://bulkdata.uspto.gov/data/trademark/dailyxml/applications/${filename}`,
      `https://data.jsdelivr.net/gh/uspto-trademarks/data@latest/daily/${filename}`,
    ];

    console.log(`  Day ${i + 1}/${days}: ${filename}`);

    let downloaded = false;
    for (const url of urls_to_try) {
      try {
        await downloadFile(url, `${TEMP_DIR}/${filename}`);
        downloaded = true;
        console.log(`    ✅ Downloaded from: ${url.split('/')[2]}`);
        await importFile(`${TEMP_DIR}/${filename}`);
        break;
      } catch (e) {
        // Try next URL
      }
    }

    if (!downloaded) {
      console.log(`    ⚠️  Could not download ${filename}`);
    }
  }

  console.log();
}

async function downloadAnnual() {
  console.log('📥 Downloading annual trademark backfile (1884-2024)...');
  console.log('   This includes 12M+ trademarks');
  console.log();

  // Annual files - try multiple sources
  const urls = [
    // Try direct USPTO API
    'https://data.uspto.gov/api/bulkdata/trademark/xmlfull/annual/apc18840407-20241231.zip',
    // Try S3 bucket
    'https://uspto-bulk-data.s3.amazonaws.com/trademark/annual/apc18840407-20241231.zip',
    // Fallback: ask user to provide path
  ];

  let downloaded = false;

  for (const url of urls) {
    try {
      console.log(`Trying: ${url}`);
      await downloadFile(url, `${TEMP_DIR}/annual-backfile.zip`);
      downloaded = true;
      console.log('✅ Downloaded successfully!');
      break;
    } catch (e) {
      console.log(`❌ Failed: ${e.message}`);
      console.log();
    }
  }

  if (!downloaded) {
    console.log('⚠️  Could not auto-download annual file.');
    console.log();
    console.log('Manual download option:');
    console.log('  1. Go to: https://data.uspto.gov/bulkdata/datasets');
    console.log('  2. Find: "Trademark Full Text XML Data (No Images) – Annual Applications"');
    console.log('  3. Download any .zip file (e.g., apc18840407-20241231-01.zip)');
    console.log('  4. Save to: ./downloads/');
    console.log('  5. Run: npm run import:file -- ./downloads/apc18840407-20241231-01.zip');
    return;
  }

  console.log();
  await importFile(`${TEMP_DIR}/annual-backfile.zip`);
}

async function downloadFile(url: string, destination: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const response = fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TrademarkBot/1.0)',
      },
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!res.body) throw new Error('No response body');

        const fileStream = fs.createWriteStream(destination);
        res.body?.pipe(fileStream);

        return new Promise<void>((resolve, reject) => {
          fileStream.on('finish', resolve);
          fileStream.on('error', reject);
        });
      })
      .catch(reject);
  });
}

async function importFile(filepath: string): Promise<void> {
  if (!fs.existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}`);
  }

  const filename = path.basename(filepath);
  console.log(`   Importing: ${filename}...`);

  try {
    execSync(`npm run data:import -- --file "${filepath}"`, {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL },
    });

    // Clean up after successful import
    fs.unlinkSync(filepath);
    console.log(`   ✅ Imported and cleaned up`);
  } catch (error) {
    throw new Error(`Failed to import ${filename}: ${error.message}`);
  }
}
