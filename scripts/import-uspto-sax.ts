/**
 * SAX-based streaming USPTO import for very large XML files (500MB-2GB).
 * Uses proper streaming XML parsing to handle files that exceed Node.js string limits.
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../db';
import { usptoTrademarks } from '../db/schema';
import { sql } from 'drizzle-orm';
import { soundex } from '../lib/similarity';
import { createReadStream } from 'fs';
import * as sax from 'sax';

const TSDR_URL = 'https://tsdr.uspto.gov/#caseNumber';
const BATCH_SIZE = 500;

type StatusEnum = 'live' | 'dead' | 'pending' | 'abandoned';

function mapStatus(actionKey: string | undefined, statusText: string | undefined): StatusEnum {
  const key = String(actionKey || '').toUpperCase();
  const text = String(statusText || '').toLowerCase();
  if (/^6\d{2}$/.test(key) || text.includes('abandon') || text.includes('cancel')) return 'abandoned';
  if (/^1[0-5]$/.test(key) || text.includes('register') || text.includes('principal')) return 'live';
  if (key === 'NA' || text.includes('new application') || text.includes('pending')) return 'pending';
  if (text.includes('dead')) return 'dead';
  return 'pending';
}

function normalizeDate(s: string): string | null {
  if (!s) return null;
  const match = s.match(/(\d{4})-?(\d{2})-?(\d{2})/) || s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    if (match[0].includes('-') && match[0].length === 10) return match[0];
    if (match[1].length === 4) return `${match[1]}-${match[2]}-${match[3]}`;
    return `${match[3]}-${match[1]}-${match[2]}`;
  }
  return null;
}

interface CaseFileData {
  serialNumber?: string;
  mark?: string;
  filingDate?: string;
  registrationDate?: string;
  status?: string;
  actionKey?: string;
  ownerName?: string;
  classifications?: Array<{ code?: string }>;
  goodsServices?: string;
}

async function processWithSAX(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    const parser = sax.createStream(true, { trim: true, normalize: true });

    let currentPath: string[] = [];
    let currentText = '';
    let currentCaseFile: CaseFileData = {};
    let currentClassification: { code?: string } = {};
    let inCaseFile = false;

    let parsedCount = 0;
    let insertedCount = 0;
    let batch: Array<{
      serialNumber: string;
      markText: string;
      markTextNormalized: string;
      markSoundex: string | null;
      status: StatusEnum;
      filingDate: string | null;
      registrationDate: string | null;
      ownerName: string | null;
      niceClasses: number[];
      goodsServices: string | null;
      usptoUrl: string;
    }> = [];

    const flushBatch = async () => {
      if (batch.length === 0) return;

      try {
        await db.insert(usptoTrademarks).values(batch).onConflictDoUpdate({
          target: usptoTrademarks.serialNumber,
          set: {
            markText: sql`excluded.mark_text`,
            markTextNormalized: sql`excluded.mark_text_normalized`,
            markSoundex: sql`excluded.mark_soundex`,
            status: sql`excluded.status`,
            filingDate: sql`excluded.filing_date`,
            registrationDate: sql`excluded.registration_date`,
            ownerName: sql`excluded.owner_name`,
            niceClasses: sql`excluded.nice_classes`,
            goodsServices: sql`excluded.goods_services`,
            usptoUrl: sql`excluded.uspto_url`,
          },
        });

        insertedCount += batch.length;
        console.log(`Upserted batch: ${batch.length} rows (total: ${insertedCount})`);
        batch = [];
      } catch (error) {
        console.error('Batch insert error:', error);
        batch = [];
      }
    };

    parser.on('opentag', (node) => {
      currentPath.push(node.name);
      currentText = '';

      if (node.name === 'case-file') {
        inCaseFile = true;
        currentCaseFile = { classifications: [] };
      } else if (node.name === 'classification' && inCaseFile) {
        currentClassification = {};
      }
    });

    parser.on('text', (text) => {
      currentText += text;
    });

    parser.on('closetag', async (tagName) => {
      if (!inCaseFile) {
        currentPath.pop();
        return;
      }

      const path = currentPath.join('/');
      const value = currentText.trim();

      // Extract fields based on path
      if (tagName === 'serial-number' && path.endsWith('case-file/serial-number')) {
        currentCaseFile.serialNumber = value;
      } else if (tagName === 'mark-identification') {
        currentCaseFile.mark = value;
      } else if (tagName === 'filing-date') {
        currentCaseFile.filingDate = value;
      } else if (tagName === 'registration-date') {
        currentCaseFile.registrationDate = value;
      } else if (tagName === 'status-code' && path.includes('case-file-header')) {
        currentCaseFile.status = value;
      } else if (tagName === 'action-key') {
        currentCaseFile.actionKey = value;
      } else if (tagName === 'party-name') {
        if (!currentCaseFile.ownerName) currentCaseFile.ownerName = value;
      } else if (tagName === 'international-code' && path.includes('classification')) {
        currentClassification.code = value;
      } else if (tagName === 'classification' && currentClassification.code) {
        currentCaseFile.classifications = currentCaseFile.classifications || [];
        currentCaseFile.classifications.push({ ...currentClassification });
        currentClassification = {};
      }

      if (tagName === 'case-file') {
        inCaseFile = false;
        parsedCount++;

        // Process the case file
        if (currentCaseFile.serialNumber && currentCaseFile.mark) {
          const mark = currentCaseFile.mark.slice(0, 500);
          const normalized = mark.toLowerCase().replace(/\s+/g, '').slice(0, 500);
          const markSoundex = soundex(mark);

          const niceClasses: number[] = [];
          if (currentCaseFile.classifications) {
            for (const cls of currentCaseFile.classifications) {
              if (cls.code) {
                const n = parseInt(cls.code, 10);
                if (!isNaN(n) && n >= 1 && n <= 45) {
                  niceClasses.push(n);
                }
              }
            }
          }

          const status = mapStatus(currentCaseFile.actionKey, currentCaseFile.status);

          batch.push({
            serialNumber: currentCaseFile.serialNumber,
            markText: mark,
            markTextNormalized: normalized,
            markSoundex: markSoundex || null,
            status,
            filingDate: normalizeDate(currentCaseFile.filingDate || ''),
            registrationDate: normalizeDate(currentCaseFile.registrationDate || ''),
            ownerName: currentCaseFile.ownerName?.slice(0, 500) || null,
            niceClasses: niceClasses.length > 0 ? niceClasses : [0],
            goodsServices: currentCaseFile.goodsServices?.slice(0, 2000) || null,
            usptoUrl: `${TSDR_URL}=${currentCaseFile.serialNumber}&caseSearchType=US_APPLICATION&caseType=DEFAULT`,
          });

          if (batch.length >= BATCH_SIZE) {
            parser.pause();
            await flushBatch();
            parser.resume();
          }
        }

        if (parsedCount % 5000 === 0) {
          console.log(`Parsed ${parsedCount} case files...`);
        }

        currentCaseFile = {};
      }

      currentPath.pop();
      currentText = '';
    });

    parser.on('end', async () => {
      await flushBatch();
      console.log(`Completed. Total parsed: ${parsedCount}, Total inserted: ${insertedCount}`);
      resolve(insertedCount);
    });

    parser.on('error', (error) => {
      reject(error);
    });

    stream.pipe(parser);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf('--file');

  if (fileIdx >= 0 && args[fileIdx + 1]) {
    const path = resolve(process.cwd(), args[fileIdx + 1]);
    const fs = await import('fs/promises');
    const stat = await fs.stat(path);

    console.log(`Processing file: ${path}`);
    console.log(`File size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);

    const count = await processWithSAX(path);
    console.log('Done. Total rows inserted:', count);
    process.exit(0);
  } else {
    console.error('Usage: npx tsx import-uspto-sax.ts --file <path-to-xml>');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
