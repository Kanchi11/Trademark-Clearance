/**
 * USPTO API Downloader - Official API approach
 * Uses USPTO's official datasets API for reliable downloads
 *
 * Setup:
 *   1. Get free API key: https://open.data.internalservices.com/
 *   2. Save to: .env.local as USPTO_API_KEY
 *
 * Usage:
 *   npm run api:download -- --daily     # Download yesterday
 *   npm run api:download -- --days 7    # Download last 7 days
 *   npm run api:download -- --annual    # Download all (1884-2024)
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
const API_KEY = process.env.USPTO_API_KEY;
const DOWNLOAD_DIR = './downloads';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env.local');
  process.exit(1);
}

if (!API_KEY) {
  console.error('❌ USPTO_API_KEY not set in .env.local');
  console.error();
  console.error('To get a free API key:');
  console.error('  1. Go to: https://open.data.internalservices.com/');
  console.error('  2. Click "Get API Key" and sign up');
  console.error('  3. Copy your API key');
  console.error('  4. Add to .env.local: USPTO_API_KEY=your_key_here');
  process.exit(1);
}

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

(async () => {
  const args = process.argv.slice(2);
  const daily = args.includes('--daily');
  const annual = args.includes('--annual');
  const daysStr = args.find(a => a.startsWith('--days'));
  const days = daysStr ? parseInt(daysStr.split(' ')[1] || '1') : 1;

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   USPTO API Downloader (Official)                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  try {
    if (annual) {
      await downloadViaAPI('1884-04-07', '2024-12-31', 'annual');
    } else if (daily || days > 0) {
      await downloadRecent(days);
    } else {
      console.log('Usage: npm run api:download -- [--daily|--annual|--days N]');
      process.exit(1);
    }

    console.log();
    console.log('📥 Importing all downloaded files...');
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

async function downloadRecent(days: number) {
  console.log(`📥 Downloading last ${days} day(s)...`);
  console.log();

  const today = new Date();
  const fromDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

  const fromStr = fromDate.toISOString().split('T')[0];
  const toStr = today.toISOString().split('T')[0];

  await downloadViaAPI(fromStr, toStr, `last-${days}-days`);
}

async function downloadViaAPI(
  fromDate: string,
  toDate: string,
  label: string
): Promise<void> {
  console.log(`🔍 Querying USPTO API (${label})...`);
  console.log(
    `   Date range: ${fromDate} to ${toDate}`
  );
  console.log();

  const url = new URL('https://api.uspto.gov/api/v1/datasets/products/trtyrap');
  url.searchParams.append('fileDataFromDate', fromDate);
  url.searchParams.append('fileDataToDate', toDate);
  url.searchParams.append('includeFiles', 'true');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': API_KEY || '',
      },
      timeout: 30000,
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as any;

    if (!data.files || data.files.length === 0) {
      console.log('⚠️  No files found for date range');
      return;
    }

    console.log(`✅ Found ${data.files.length} file(s)`);
    console.log();

    let downloaded = 0;

    // Download each file
    for (let i = 0; i < data.files.length; i++) {
      const file = data.files[i];
      const fileUrl = file.fileUrl;
      const filename = file.fileName || `trademark-${i}.zip`;

      console.log(`[${i + 1}/${data.files.length}] Downloading: ${filename}...`);

      try {
        const fileResponse = await fetch(fileUrl, {
          headers: {
            'x-api-key': API_KEY || '',
          },
          timeout: 120000,
        });

        if (!fileResponse.ok) {
          console.log(`     ⚠️  Failed to download`);
          continue;
        }

        const filepath = path.join(DOWNLOAD_DIR, filename);
        const buffer = await fileResponse.buffer();

        fs.writeFileSync(filepath, buffer);

        console.log(`     ✅ Downloaded (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
        downloaded++;
      } catch (error) {
        console.log(`     ❌ Error: ${error.message}`);
      }
    }

    console.log();
    console.log(`✅ Downloaded ${downloaded} file(s)`);
  } catch (error) {
    throw new Error(`API query failed: ${error.message}`);
  }
}

async function importAllFiles() {
  const files = fs
    .readdirSync(DOWNLOAD_DIR)
    .filter(f => f.endsWith('.zip'))
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
      // Extract ZIP to get XML
      const zip = new AdmZip(filepath);
      const entries = zip.getEntries();

      const xmlEntry = entries.find(e => e.entryName.endsWith('.xml'));
      if (!xmlEntry) {
        console.log(`  ⚠️  No XML file found in ZIP`);
        continue;
      }

      // Extract XML
      const xmlPath = path.join(DOWNLOAD_DIR, xmlEntry.entryName);
      zip.extractEntryTo(xmlEntry, DOWNLOAD_DIR);

      // Import the XML
      execSync(`npm run data:import -- --file "${xmlPath}"`, {
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL },
      });

      console.log(`  ✅ Success`);
      imported++;

      // Clean up
      fs.unlinkSync(xmlPath);
      fs.unlinkSync(filepath);
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
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
}
