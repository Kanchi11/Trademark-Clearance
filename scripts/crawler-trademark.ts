/**
 * Zero-Cost USPTO Crawler
 * Uses Puppeteer to render JavaScript portal and extract real download URLs
 * Then downloads actual USPTO data files
 *
 * Why this works:
 * - Direct HTTP requests → HTML error pages (server blocks)
 * - Puppeteer renders JavaScript → finds real links
 * - Extracts actual download URLs → real ZIP files
 *
 * Usage:
 *   npm run crawler:trademark -- --annual              # Crawl for annual backfile
 *   npm run crawler:trademark -- --daily               # Crawl for yesterday's data
 *   npm run crawler:trademark -- --days 7              # Crawl for last 7 days
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import puppeteer, { Browser, Page } from 'puppeteer';
import { createWriteStream } from 'fs';
import { unlink, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { db } from '../db';
import { usptoTrademarks } from '../db/schema';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads');

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

interface DownloadLink {
  name: string;
  url: string;
  size?: string;
}

async function ensureDir() {
  if (!existsSync(DOWNLOAD_DIR)) {
    await mkdir(DOWNLOAD_DIR, { recursive: true });
  }
}

async function launchBrowser(): Promise<Browser> {
  console.log('🌐 Launching Puppeteer browser...');
  return puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
}

async function downloadFile(url: string, filename: string): Promise<boolean> {
  const filepath = path.join(DOWNLOAD_DIR, filename);
  process.stdout.write(`  ${filename}... `);

  return new Promise((resolve) => {
    const https = require('https');
    const file = createWriteStream(filepath);
    let downloadedBytes = 0;

    https
      .get(url, { timeout: 60000 }, (response: any) => {
        if (response.statusCode !== 200) {
          process.stdout.write(`❌ (HTTP ${response.statusCode})\n`);
          unlink(filepath).catch(() => {});
          resolve(false);
          return;
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);

        response.on('data', (chunk: any) => {
          downloadedBytes += chunk.length;
        });

        response.pipe(file);

        file.on('finish', async () => {
          file.close();

          // Validate it's a real ZIP
          const buffer = require('fs').readFileSync(filepath);
          const isValidZip = buffer[0] === 0x50 && buffer[1] === 0x4b;

          if (isValidZip) {
            const sizeMB = (downloadedBytes / 1024 / 1024).toFixed(2);
            process.stdout.write(`✅ (${sizeMB}MB)\n`);
            resolve(true);
          } else {
            process.stdout.write(`❌ (Invalid)\n`);
            await unlink(filepath).catch(() => {});
            resolve(false);
          }
        });

        file.on('error', async () => {
          process.stdout.write(`❌ (Write error)\n`);
          await unlink(filepath).catch(() => {});
          resolve(false);
        });
      })
      .on('error', async () => {
        process.stdout.write(`❌ (Connection error)\n`);
        await unlink(filepath).catch(() => {});
        resolve(false);
      });
  });
}

async function findAnnualLinks(page: Page): Promise<DownloadLink[]> {
  console.log('\n🔍 Searching USPTO for annual backfile...');

  try {
    // Navigate to USPTO bulk data datasets
    await page.goto('https://data.uspto.gov/bulkdata/datasets', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for content to load
    await page.waitForSelector('a', { timeout: 10000 }).catch(() => {});

    // Find all links that contain trademark data
    const links = await page.evaluate(() => {
      const results: DownloadLink[] = [];

      // Look for annual backfile links
      document.querySelectorAll('a[href*="apc"][href*="zip"]').forEach((el) => {
        const href = el.getAttribute('href');
        const text = el.textContent || '';

        if (href && (text.includes('full') || text.includes('annual') || href.includes('18840407'))) {
          results.push({
            name: text.trim() || path.basename(href),
            url: href.startsWith('http') ? href : new URL(href, window.location.href).href,
            size: el.parentElement?.textContent?.match(/[\d.]+\s*[MG]B/)?.[0],
          });
        }
      });

      return results;
    });

    if (links.length > 0) {
      console.log(`✅ Found ${links.length} annual file(s)\n`);
      links.forEach((l) => console.log(`   • ${l.name} ${l.size ? `(${l.size})` : ''}`));
      return links;
    }

    // Fallback: try direct approach
    console.log('⚠️  No links found via JavaScript, trying direct URLs...');
    return [
      {
        name: 'apc18840407-20241231-86.zip',
        url: 'https://data.uspto.gov/bulkdata/trademark/xmlfull/apc18840407-20241231-86.zip',
      },
    ];
  } catch (error) {
    console.error('⚠️  Error finding links:', (error as Error).message);
    return [
      {
        name: 'apc18840407-20241231-86.zip',
        url: 'https://data.uspto.gov/bulkdata/trademark/xmlfull/apc18840407-20241231-86.zip',
      },
    ];
  }
}

async function findDailyLinks(page: Page, days: number): Promise<DownloadLink[]> {
  console.log(`\n🔍 Searching USPTO for daily applications (last ${days} day(s))...\n`);

  const links: DownloadLink[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateStr = yy + mm + dd;

    try {
      // Try to navigate to the daily page
      const url = `https://data.uspto.gov/bulkdata/trademark/dailyxml/applications/`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});

      // Look for link matching the date
      const dayLink = await page.evaluate((dateStr) => {
        let found: DownloadLink | null = null;

        document.querySelectorAll('a[href*="apc"][href*="zip"]').forEach((el) => {
          const href = el.getAttribute('href') || '';
          if (href.includes(dateStr)) {
            found = {
              name: path.basename(href),
              url: href.startsWith('http') ? href : new URL(href, window.location.href).href,
            };
          }
        });

        return found;
      }, dateStr);

      if (dayLink) {
        links.push(dayLink);
        console.log(`   ✅ ${dateStr}: ${dayLink.name}`);
      } else {
        console.log(`   ⏭️  ${dateStr}: Not available (normal for weekends/holidays)`);
      }
    } catch (error) {
      console.log(`   ⏭️  ${dateStr}: Error fetching`);
    }
  }

  // Fallback: add direct URLs to try
  if (links.length === 0) {
    console.log('\n⚠️  Using direct URL fallback...\n');
    for (let i = 0; i < days; i++) {
      const date = new Date(today.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
      const yy = String(date.getFullYear()).slice(-2);
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const dateStr = yy + mm + dd;

      links.push({
        name: `apc${dateStr}.zip`,
        url: `https://data.uspto.gov/bulkdata/trademark/dailyxml/TRTDXFAP/apc${dateStr}.zip`,
      });
    }
  }

  return links;
}

async function downloadLinks(links: DownloadLink[]): Promise<{ downloaded: string[]; failed: string[] }> {
  const downloaded: string[] = [];
  const failed: string[] = [];

  console.log(`\n📥 Downloading ${links.length} file(s)...\n`);

  for (const link of links) {
    const success = await downloadFile(link.url, link.name);
    if (success) {
      downloaded.push(link.name);
    } else {
      failed.push(link.name);
    }

    // Rate limiting - don't hammer the server
    await new Promise((r) => setTimeout(r, 1000));
  }

  return { downloaded, failed };
}

async function importFiles(filenames: string[]): Promise<{ imported: number; failed: number }> {
  if (filenames.length === 0) return { imported: 0, failed: 0 };

  console.log(`\n📦 Importing ${filenames.length} file(s)...\n`);

  let imported = 0;
  let failed = 0;

  for (const filename of filenames) {
    const filepath = path.join(DOWNLOAD_DIR, filename);
    process.stdout.write(`  ${filename}... `);

    try {
      execSync(`npm run data:import -- --file "${filepath}"`, {
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL },
      });

      process.stdout.write(`✅\n`);
      imported++;

      // Clean up after successful import
      await unlink(filepath).catch(() => {});
    } catch (error) {
      process.stdout.write(`❌\n`);
      failed++;
    }
  }

  return { imported, failed };
}

async function getRecordCount(): Promise<number> {
  try {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(usptoTrademarks)
      .execute()
      .then((r) => (r[0]?.count ? Number(r[0].count) : 0));
    return result;
  } catch {
    return 0;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isAnnual = args.includes('--annual');
  const isDaily = args.includes('--daily');
  const daysIdx = args.indexOf('--days');
  const days = daysIdx >= 0 ? parseInt(args[daysIdx + 1], 10) || 1 : 1;

  if (!isAnnual && !isDaily) {
    console.log('Usage: npm run crawler:trademark -- [--annual|--daily|--days N]');
    process.exit(1);
  }

  await ensureDir();

  let browser: Browser | null = null;

  try {
    const before = await getRecordCount();

    browser = await launchBrowser();
    const page = await browser.newPage();

    // Set extended timeout
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📥 USPTO Trademark Crawler (Zero-Cost)\n');

    let links: DownloadLink[] = [];

    if (isAnnual) {
      console.log('📦 Mode: Annual Backfile\n');
      links = await findAnnualLinks(page);
    } else if (isDaily) {
      console.log('📅 Mode: Daily Applications\n');
      links = await findDailyLinks(page, days);
    }

    await browser.close();
    browser = null;

    if (links.length === 0) {
      console.log('⚠️  No files found\n');
      process.exit(0);
    }

    const { downloaded, failed } = await downloadLinks(links);
    const { imported, failed: importFailed } = await importFiles(downloaded);

    const after = await getRecordCount();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 Crawler Complete\n');
    console.log(`  Found:      ${links.length}`);
    console.log(`  Downloaded: ${downloaded.length}`);
    console.log(`  Failed:     ${failed.length}`);
    console.log(`  Imported:   ${imported}`);
    console.log(`\n  Records before: ${before}`);
    console.log(`  Records after:  ${after}`);
    console.log(`  Added: ${after - before}\n`);

    if (failed.length > 0) {
      console.log('⚠️  Failed downloads:');
      failed.forEach((f) => console.log(`   • ${f}`));
    }

    if (imported > 0) {
      console.log('\n✅ Crawler completed successfully!');
    } else {
      console.log('\n⚠️  No files were successfully imported');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Crawler error:', (error as Error).message);
    if (browser) await browser.close().catch(() => {});
    process.exit(1);
  }
}

main();
