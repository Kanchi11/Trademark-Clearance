/**
 * Unified Trademark Data Agent
 * Handles COMPLETE pipeline: Download → Extract → Parse → Import → Ready for Use
 *
 * Supports both annual backfile and daily applications
 *
 * Usage:
 *   npm run agent:trademark -- --annual              # Download annual backfile
 *   npm run agent:trademark -- --daily               # Download yesterday's applications
 *   npm run agent:trademark -- --days 7              # Download last 7 days
 *   npm run agent:trademark -- --file ./path/to.zip  # Use local file instead
 *   npm run agent:trademark -- --folder ./zips       # Batch process folder of ZIPs
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { execSync, spawn } from 'child_process';
import * as fs from 'fs/promises';
import { existsSync, createWriteStream } from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { db } from '../db';
import { usptoTrademarks } from '../db/schema';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads');
const WORK_DIR = path.join(process.cwd(), '.agent-work');

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env.local');
  process.exit(1);
}

interface TradmarkSource {
  type: 'annual' | 'daily' | 'file' | 'folder';
  urls?: string[];
  filePath?: string;
  folderPath?: string;
}

async function ensureDirectories() {
  for (const dir of [DOWNLOAD_DIR, WORK_DIR]) {
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}

async function isValidZipFile(filepath: string): Promise<boolean> {
  try {
    const buffer = await fs.readFile(filepath);
    // ZIP files start with PK (0x50, 0x4B)
    return buffer[0] === 0x50 && buffer[1] === 0x4b;
  } catch {
    return false;
  }
}

async function downloadFile(url: string, filename: string): Promise<string> {
  const filepath = path.join(DOWNLOAD_DIR, filename);

  process.stdout.write(`  ${filename}... `);

  return new Promise((resolve) => {
    const https = require('https');
    const file = createWriteStream(filepath);
    let hasError = false;

    https.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/zip,application/*',
        },
        timeout: 30000,
      },
      async (response: any) => {
        if (response.statusCode !== 200) {
          process.stdout.write(`⏭️ (HTTP ${response.statusCode})\n`);
          await fs.unlink(filepath).catch(() => {});
          resolve('');
          return;
        }

        // Check content type
        const contentType = response.headers['content-type'] || '';
        if (!contentType.includes('zip') && !contentType.includes('application/octet-stream')) {
          process.stdout.write(`⏭️ (Wrong type: ${contentType})\n`);
          file.close();
          await fs.unlink(filepath).catch(() => {});
          resolve('');
          return;
        }

        response.pipe(file);

        file.on('finish', async () => {
          file.close();

          // Validate it's actually a ZIP file
          if (await isValidZipFile(filepath)) {
            process.stdout.write(`✅\n`);
            resolve(filepath);
          } else {
            process.stdout.write(`❌ (Invalid ZIP)\n`);
            await fs.unlink(filepath).catch(() => {});
            resolve('');
          }
        });

        file.on('error', async () => {
          hasError = true;
          process.stdout.write(`❌\n`);
          await fs.unlink(filepath).catch(() => {});
          resolve('');
        });
      }
    )
      .on('error', async () => {
        if (!hasError) {
          process.stdout.write(`❌\n`);
        }
        await fs.unlink(filepath).catch(() => {});
        resolve('');
      })
      .on('timeout', async () => {
        process.stdout.write(`⏭️ (Timeout)\n`);
        await fs.unlink(filepath).catch(() => {});
        resolve('');
      });
  });
}

async function getDailyUrls(days: number): Promise<string[]> {
  const urls: string[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateStr = yy + mm + dd;

    // Try multiple URL patterns for daily files
    urls.push(
      `https://data.uspto.gov/bulkdata/trademark/dailyxml/TRTDXFAP/apc${dateStr}.zip`,
      `https://data.uspto.gov/bulkdata/trademark/dailyxml/applications/apc${dateStr}.zip`,
      `https://bulkdata.uspto.gov/servlet/download/apc${dateStr}.zip`
    );
  }

  return urls;
}

async function getAnnualUrl(): Promise<string[]> {
  // Multiple sources for annual backfile
  return [
    'https://data.uspto.gov/bulkdata/trademark/xmlfull/apc18840407-20241231-86.zip',
    'https://data.uspto.gov/bulkdata/trademark/full/apc18840407-20241231-86.zip',
  ];
}

async function importZipFile(zipPath: string): Promise<boolean> {
  if (!zipPath) return false;

  try {
    execSync(`npm run data:import -- --file "${zipPath}"`, {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL },
    });
    return true;
  } catch (e) {
    return false;
  }
}

async function processSource(source: TradmarkSource): Promise<{ downloaded: number; imported: number; failed: number }> {
  const results = { downloaded: 0, imported: 0, failed: 0 };

  console.log('\n📥 Starting Trademark Data Agent\n');

  let urlsToTry: { name: string; urls: string[] }[] = [];

  if (source.type === 'annual') {
    console.log('📦 Mode: Annual Backfile (Full History 1884-2024)\n');
    const annualUrls = await getAnnualUrl();
    urlsToTry.push({ name: 'Annual Backfile', urls: annualUrls });
  } else if (source.type === 'daily') {
    console.log('📅 Mode: Daily Applications (Yesterday)\n');
    const dailyUrls = await getDailyUrls(1);
    urlsToTry.push({ name: 'Daily', urls: dailyUrls });
  } else if (source.type === 'file') {
    console.log('📄 Mode: Local File\n');
    if (source.filePath && existsSync(source.filePath)) {
      const filesToProcess = [source.filePath];
      return await processFiles(filesToProcess);
    } else {
      console.error('❌ File not found:', source.filePath);
      return results;
    }
  } else if (source.type === 'folder') {
    console.log('📁 Mode: Batch Process Folder\n');
    if (source.folderPath && existsSync(source.folderPath)) {
      const files = await fs.readdir(source.folderPath);
      const zipFiles = files
        .filter((f) => f.endsWith('.zip'))
        .map((f) => path.join(source.folderPath!, f));
      return await processFiles(zipFiles);
    }
    return results;
  }

  // Download and process files
  for (const urlGroup of urlsToTry) {
    console.log(`🔗 Trying ${urlGroup.name}...\n`);

    let downloaded = false;
    let downloadedPath = '';

    for (const url of urlGroup.urls) {
      const filename = url.split('/').pop() || 'file.zip';
      downloadedPath = await downloadFile(url, filename);

      if (downloadedPath) {
        downloaded = true;
        results.downloaded++;
        break; // Success, stop trying other URLs
      }
    }

    if (downloaded && downloadedPath) {
      console.log('\n🔄 Importing...\n');
      if (await importZipFile(downloadedPath)) {
        results.imported++;
        console.log('✅ Imported successfully');
      } else {
        results.failed++;
        console.log('❌ Import failed');
      }
    } else {
      console.log('⚠️  Could not download from any source\n');
    }
  }

  return results;
}

async function processFiles(filesToProcess: string[]): Promise<{ downloaded: number; imported: number; failed: number }> {
  const results = { downloaded: 0, imported: 0, failed: 0 };

  console.log(`📊 Files to process: ${filesToProcess.length}\n`);
  console.log('🔄 Importing...\n');

  for (const filepath of filesToProcess) {
    const filename = path.basename(filepath);
    process.stdout.write(`  ${filename}... `);

    if (await importZipFile(filepath)) {
      process.stdout.write(`✅\n`);
      results.imported++;
      results.downloaded++;
    } else {
      process.stdout.write(`❌\n`);
      results.failed++;
    }
  }

  return results;
}

async function getRecordCount(): Promise<number> {
  try {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(usptoTrademarks)
      .execute()
      .then((r) => (r[0]?.count ? Number(r[0].count) : 0));
    return result;
  } catch (e) {
    return 0;
  }
}

async function main() {
  const args = process.argv.slice(2);
  let source: TradmarkSource;

  if (args.includes('--annual')) {
    source = { type: 'annual' };
  } else if (args.includes('--daily')) {
    source = { type: 'daily' };
  } else if (args.includes('--days')) {
    const daysIdx = args.indexOf('--days');
    const days = parseInt(args[daysIdx + 1], 10) || 7;
    source = { type: 'daily', urls: await getDailyUrls(days) };
  } else if (args.includes('--file')) {
    const fileIdx = args.indexOf('--file');
    source = { type: 'file', filePath: args[fileIdx + 1] };
  } else if (args.includes('--folder')) {
    const folderIdx = args.indexOf('--folder');
    source = { type: 'folder', folderPath: args[folderIdx + 1] };
  } else {
    console.log('Usage: npm run agent:trademark -- [--annual|--daily|--days N|--file PATH|--folder PATH]');
    process.exit(1);
  }

  try {
    await ensureDirectories();
    const before = await getRecordCount();
    const results = await processSource(source);
    const after = await getRecordCount();

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('📊 Agent Complete\n');
    console.log(`  Downloaded: ${results.downloaded}`);
    console.log(`  Imported:   ${results.imported}`);
    console.log(`  Failed:     ${results.failed}`);
    console.log(`\n  Records before: ${before}`);
    console.log(`  Records after:  ${after}`);
    console.log(`  Added: ${after - before}\n`);

    if (results.imported > 0) {
      console.log('✅ Trademark data updated successfully!');
      console.log('   Ready for search and clearance checks\n');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Agent error:', error.message);
    process.exit(1);
  }
}

main();
