/**
 * Backfill recent daily trademark data (2025 - Early 2026)
 * Fills the gap between annual backfile (Dec 31, 2024) and today
 *
 * Usage:
 *   npm run backfill:daily
 *   npm run backfill:daily -- --days 60    (last 60 days)
 *   npm run backfill:daily -- --days 400   (all of 2025 + early 2026)
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import { createWriteStream } from 'fs';
import * as path from 'path';

const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads');
const BASE_URL = 'https://data.uspto.gov/bulkdata/trademark/dailyxml/TRTDXFAP';

interface DateRange {
  start: Date;
  end: Date;
}

function formatDate(d: Date): string {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return yy + mm + dd;
}

function getDateRange(days: number): DateRange {
  const end = new Date();
  end.setDate(end.getDate() - 1); // Yesterday

  const start = new Date(end);
  start.setDate(start.getDate() - days);

  return { start, end };
}

function* dateBetween(start: Date, end: Date): Generator<Date> {
  const d = new Date(start);
  while (d <= end) {
    yield new Date(d);
    d.setDate(d.getDate() + 1);
  }
}

async function downloadFile(url: string, filepath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const https = require('https');
    const file = createWriteStream(filepath);

    https.get(url, (response: any) => {
      if (response.statusCode !== 200) {
        resolve(false);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', () => {
      resolve(false);
    });
  });
}

function runCommand(cmd: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: 'inherit' });
    proc.on('close', (code) => resolve(code || 0));
  });
}

async function main() {
  const args = process.argv.slice(2);
  const daysIdx = args.indexOf('--days');
  const days = daysIdx >= 0 && args[daysIdx + 1] ? parseInt(args[daysIdx + 1], 10) : 400; // Default: all of 2025 + early 2026

  console.log(`\n📥 Backfilling daily trademark data (last ${days} days)...\n`);

  await fs.mkdir(DOWNLOAD_DIR, { recursive: true });

  const { start, end } = getDateRange(days);
  console.log(`📅 Date range: ${start.toDateString()} to ${end.toDateString()}`);
  console.log(`📊 Total days to process: ${Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1}\n`);

  let downloaded = 0;
  let imported = 0;
  let failed = 0;

  for (const date of dateBetween(start, end)) {
    const dateStr = formatDate(date);
    const filename = `apc${dateStr}.zip`;
    const filepath = path.join(DOWNLOAD_DIR, filename);
    const url = `${BASE_URL}/${filename}`;

    process.stdout.write(`[${dateStr}] Downloading... `);

    if (await downloadFile(url, filepath)) {
      process.stdout.write(`✅ Importing... `);
      downloaded++;

      const exitCode = await runCommand('npm', ['run', 'data:import', '--', '--file', filepath]);

      if (exitCode === 0) {
        process.stdout.write(`✅\n`);
        imported++;
        await fs.unlink(filepath).catch(() => {});
      } else {
        process.stdout.write(`❌ (import failed)\n`);
        failed++;
      }
    } else {
      process.stdout.write(`⏭️  (file not available - normal for weekends/holidays)\n`);
    }
  }

  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`📊 Backfill Summary:`);
  console.log(`   Downloaded: ${downloaded}`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Failed: ${failed}`);
  console.log(`════════════════════════════════════════════════════════════\n`);

  console.log(`✅ Backfill complete! Database now has continuous coverage.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
