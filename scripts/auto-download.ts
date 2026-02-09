/**
 * Fully Automated USPTO Trademark Data Download & Import
 * Uses Puppeteer to automate the browser and download files
 *
 * Usage:
 *   npm run auto:download -- --daily     # Download yesterday's file
 *   npm run auto:download -- --days 7    # Download last 7 days
 *   npm run auto:download -- --annual    # Download annual backfile
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const DATABASE_URL = process.env.DATABASE_URL;
const DOWNLOAD_DIR = './downloads';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env.local');
  process.exit(1);
}

// Ensure download directory exists
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
  console.log('║   Automated USPTO Trademark Downloader (Puppeteer)        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  let browser;
  try {
    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set download behavior
    const downloadPath = path.resolve(DOWNLOAD_DIR);
    const cdp = await page.target().createCDPSession();
    await cdp.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath,
    });

    if (annual) {
      await downloadAnnual(page, downloadPath);
    } else if (daily || days > 0) {
      await downloadDaily(page, downloadPath, days);
    } else {
      console.log('Usage: npm run auto:download -- [--daily|--annual|--days N]');
      process.exit(1);
    }

    await browser.close();

    console.log();
    console.log('📥 Importing all downloaded files...');
    console.log();

    // Import all files
    await importAllFiles();

    console.log();
    console.log('✅ Download and import completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
})();

async function downloadDaily(page, downloadPath, days) {
  console.log(`📥 Downloading last ${days} day(s) of daily applications...`);
  console.log();

  // Navigate to USPTO bulk data portal
  console.log('📍 Navigating to USPTO Bulk Data Portal...');
  await page.goto('https://data.uspto.gov/bulkdata/datasets', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  console.log('✅ Portal loaded');
  console.log();

  // Wait for the portal to load and search for trademark datasets
  await page.waitForTimeout(3000);

  console.log('🔍 Finding Daily Applications dataset...');

  // Look for Daily Applications section
  const foundDaily = await page.evaluate(() => {
    const elements = document.querySelectorAll('[role="tab"], .dataset-title, h3, h2');
    for (const el of elements) {
      if (el.textContent?.includes('Daily Applications')) {
        el.click?.();
        return true;
      }
    }
    return false;
  });

  if (foundDaily) {
    console.log('✅ Found Daily Applications section');
    await page.waitForTimeout(2000);
  }

  console.log('📊 Locating recent files...');

  // Extract download links for recent dates
  const downloadLinks = await page.evaluate(() => {
    const links: { name: string; url: string }[] = [];

    // Look for zip file links
    document.querySelectorAll('a[href*=".zip"]').forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent;
      if (href && text && text.includes('apc26')) {
        links.push({
          name: text.trim(),
          url: href.startsWith('http') ? href : new URL(href, window.location.href).href,
        });
      }
    });

    return links.slice(0, 10); // Get first 10 (most recent)
  });

  if (downloadLinks.length === 0) {
    console.log('⚠️  No download links found in current format');
    console.log('   Trying alternative method...');

    // Try alternative: look for file size indicators and click pattern
    await page.evaluate(() => {
      const rows = document.querySelectorAll('tr, [role="row"]');
      let count = 0;
      for (const row of rows) {
        if (count >= 7) break;
        const link = row.querySelector('a[href*=".zip"]');
        if (link) {
          link.click();
          count++;
        }
      }
    });

    await page.waitForTimeout(5000);
  } else {
    console.log(`✅ Found ${Math.min(downloadLinks.length, days)} files`);
    console.log();

    // Download each file
    for (let i = 0; i < Math.min(downloadLinks.length, days); i++) {
      const link = downloadLinks[i];
      console.log(`  [${i + 1}/${Math.min(downloadLinks.length, days)}] Downloading: ${link.name}...`);

      // Navigate to link (triggers download)
      await page.goto(link.url, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      await page.waitForTimeout(2000);
    }
  }

  console.log();
  console.log('✅ Daily files downloaded');
}

async function downloadAnnual(page, downloadPath) {
  console.log('📥 Downloading annual trademark backfile...');
  console.log();

  console.log('📍 Navigating to USPTO Bulk Data Portal...');
  await page.goto('https://data.uspto.gov/bulkdata/datasets', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  console.log('✅ Portal loaded');
  await page.waitForTimeout(3000);

  console.log('🔍 Finding Annual Applications dataset...');

  // Look for Annual dataset
  const foundAnnual = await page.evaluate(() => {
    const elements = document.querySelectorAll('[role="tab"], .dataset-title, h3, h2');
    for (const el of elements) {
      if (el.textContent?.includes('Annual Applications')) {
        el.click?.();
        return true;
      }
    }
    return false;
  });

  if (foundAnnual) {
    console.log('✅ Found Annual Applications section');
    await page.waitForTimeout(2000);
  }

  console.log('📊 Locating annual file...');

  // Get first annual file link
  const link = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*=".zip"]');
    if (links.length > 0) {
      return (links[0] as HTMLAnchorElement).href;
    }
    return null;
  });

  if (link) {
    console.log(`✅ Found: ${link.split('/').pop()}`);
    console.log('Downloading... this may take a few minutes');

    await page.goto(link, {
      waitUntil: 'networkidle2',
      timeout: 120000,
    });

    await page.waitForTimeout(5000);
  } else {
    throw new Error('Could not find annual file link');
  }

  console.log('✅ Annual file downloaded');
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
  console.log('║   Import Complete                                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`✅ Imported: ${imported} file(s)`);
  console.log(`📊 Total trademarks: ${parseInt(count).toLocaleString()}`);
}
