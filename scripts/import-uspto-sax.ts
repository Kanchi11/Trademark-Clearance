/**
 * SAX-based streaming USPTO import for very large XML files (500MB-2GB).
 * Uses proper streaming XML parsing to handle files that exceed Node.js string limits.
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '@/db';
import { usptoTrademarks } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { soundex } from '@/lib/similarity';
import { createReadStream } from 'fs';
import * as sax from 'sax';
import { doubleMetaphone } from 'double-metaphone';

const TSDR_URL = 'https://tsdr.uspto.gov/#caseNumber';
const BATCH_SIZE = 50; // Reduced to 50 to avoid Supabase connection pool exhaustion

type StatusEnum = 'live' | 'dead' | 'pending' | 'abandoned';

function mapStatus(statusCode: string | undefined, actionKey: string | undefined): StatusEnum {
  const code = String(statusCode || '').toUpperCase();
  const action = String(actionKey || '').toUpperCase();

  // Check status-code first (most reliable)
  // 600-699 = Abandoned/Cancelled/Expired
  if (/^6\d{2}$/.test(code)) return 'abandoned';

  // 1-15 = Registered on principal/supplemental register (LIVE)
  if (/^[1-9]$/.test(code) || /^1[0-5]$/.test(code)) return 'live';

  // Check action-key as fallback
  if (/^6\d{2}$/.test(action)) return 'abandoned';
  if (/^1[0-5]$/.test(action)) return 'live';

  // If we have a registration-date field populated, it's likely live or dead (not pending)
  // But without clear status code, default to pending
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
  goodsServices?: string;  // ✅ Will be populated from case-file-statements
  logoUrl?: string;
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
      markMetaphone: string | null;  // ✅ ADD metaphone
      status: StatusEnum;
      filingDate: string | null;
      registrationDate: string | null;
      ownerName: string | null;
      niceClasses: number[];
      goodsServices: string | null;
      usptoUrl: string;
      logoUrl: string | null;
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
            markMetaphone: sql`excluded.mark_metaphone`,  // ✅ ADD metaphone
            status: sql`excluded.status`,
            filingDate: sql`excluded.filing_date`,
            registrationDate: sql`excluded.registration_date`,
            ownerName: sql`excluded.owner_name`,
            niceClasses: sql`excluded.nice_classes`,
            goodsServices: sql`excluded.goods_services`,
            usptoUrl: sql`excluded.uspto_url`,
            logoUrl: sql`excluded.logo_url`,
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
      } else if (tagName === 'text' && path.includes('case-file-statements/case-file-statement')) {
        // ✅ Capture goods/services description from case-file-statements
        // Append multiple statement texts (some trademarks have multiple classes)
        if (value) {
          currentCaseFile.goodsServices = currentCaseFile.goodsServices
            ? currentCaseFile.goodsServices + '; ' + value
            : value;
        }
      }

      if (tagName === 'case-file') {
        inCaseFile = false;
        parsedCount++;

        // Process the case file
        if (currentCaseFile.serialNumber && currentCaseFile.mark) {
          const mark = currentCaseFile.mark.slice(0, 500);
          const normalized = mark.toLowerCase().replace(/\s+/g, '').slice(0, 500);
          const markSoundex = soundex(mark);
          const markMetaphoneResult = doubleMetaphone(mark);  // ✅ ADD metaphone
          const markMetaphone = markMetaphoneResult ? markMetaphoneResult[0] : null;  // Primary metaphone code

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

          const status = mapStatus(currentCaseFile.status, currentCaseFile.actionKey);

          batch.push({
            serialNumber: currentCaseFile.serialNumber,
            markText: mark,
            markTextNormalized: normalized,
            markSoundex: markSoundex || null,
            markMetaphone: markMetaphone || null,  // ✅ ADD metaphone
            status,
            filingDate: normalizeDate(currentCaseFile.filingDate || ''),
            registrationDate: normalizeDate(currentCaseFile.registrationDate || ''),
            ownerName: currentCaseFile.ownerName?.slice(0, 500) || null,
            niceClasses: niceClasses.length > 0 ? niceClasses : [0],
            goodsServices: currentCaseFile.goodsServices?.slice(0, 2000) || null,  // ✅ NOW POPULATED
            usptoUrl: `${TSDR_URL}=${currentCaseFile.serialNumber}&caseSearchType=US_APPLICATION&caseType=DEFAULT`,
            logoUrl: `https://tsdr.uspto.gov/img/${currentCaseFile.serialNumber}/large`,
          });

          if (batch.length >= BATCH_SIZE) {
            await flushBatch();
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
