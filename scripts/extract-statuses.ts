/**
 * PROFESSIONAL APPROACH: Extract ONLY status codes from XML
 * Don't re-import everything - just update the status column
 * Parse XML → Extract (serial_number, status_code) → Generate SQL UPDATEs
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createReadStream, createWriteStream } from 'fs';
import * as sax from 'sax';

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

  return 'pending';
}

interface StatusUpdate {
  serialNumber: string;
  status: StatusEnum;
}

async function extractStatusesFromXML(filePath: string): Promise<StatusUpdate[]> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    const parser = sax.createStream(true, { trim: true, normalize: true });

    let currentPath: string[] = [];
    let currentCaseFile: any = {};
    const updates: StatusUpdate[] = [];
    let parsedCount = 0;

    parser.on('opentag', (node) => {
      currentPath.push(node.name);
    });

    parser.on('text', (value) => {
      const tagName = currentPath[currentPath.length - 1];
      const path = currentPath.join('/');

      if (tagName === 'serial-number' && path.endsWith('case-file/serial-number')) {
        currentCaseFile.serialNumber = value;
      } else if (tagName === 'status-code' && path.includes('case-file-header')) {
        currentCaseFile.statusCode = value;
      } else if (tagName === 'action-key') {
        currentCaseFile.actionKey = value;
      }
    });

    parser.on('closetag', (tagName) => {
      if (tagName === 'case-file') {
        if (currentCaseFile.serialNumber) {
          const status = mapStatus(currentCaseFile.statusCode, currentCaseFile.actionKey);
          updates.push({
            serialNumber: currentCaseFile.serialNumber,
            status,
          });
          parsedCount++;

          if (parsedCount % 5000 === 0) {
            console.log(`  Extracted ${parsedCount.toLocaleString()} status codes...`);
          }
        }
        currentCaseFile = {};
      }

      currentPath.pop();
    });

    parser.on('end', () => {
      console.log(`  ✅ Extracted ${updates.length.toLocaleString()} status codes from file`);
      resolve(updates);
    });

    parser.on('error', (error) => {
      reject(error);
    });

    stream.pipe(parser);
  });
}

async function generateSQLUpdateFile(updates: StatusUpdate[], outputFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const writeStream = createWriteStream(outputFile, { flags: 'a' });

    // Group by status for efficient SQL
    const byStatus = updates.reduce((acc, u) => {
      if (!acc[u.status]) acc[u.status] = [];
      acc[u.status].push(u.serialNumber);
      return acc;
    }, {} as Record<StatusEnum, string[]>);

    for (const [status, serialNumbers] of Object.entries(byStatus)) {
      if (serialNumbers.length === 0) continue;

      // Write SQL in chunks of 1000 for safety
      const CHUNK_SIZE = 1000;
      for (let i = 0; i < serialNumbers.length; i += CHUNK_SIZE) {
        const chunk = serialNumbers.slice(i, i + CHUNK_SIZE);
        const sql = `UPDATE uspto_trademarks SET status = '${status}' WHERE serial_number IN (${chunk.map(s => `'${s}'`).join(',')});\n`;
        writeStream.write(sql);
      }
    }

    writeStream.end(() => {
      console.log(`  📝 SQL written to ${outputFile}`);
      resolve();
    });

    writeStream.on('error', reject);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf('--file');
  const outputIdx = args.indexOf('--output');

  if (fileIdx >= 0 && args[fileIdx + 1] && outputIdx >= 0 && args[outputIdx + 1]) {
    const xmlPath = resolve(process.cwd(), args[fileIdx + 1]);
    const sqlPath = resolve(process.cwd(), args[outputIdx + 1]);

    console.log(`📄 Processing: ${xmlPath}`);
    const updates = await extractStatusesFromXML(xmlPath);

    console.log(`📊 Status breakdown:`);
    const counts = updates.reduce((acc, u) => {
      acc[u.status] = (acc[u.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    Object.entries(counts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count.toLocaleString()}`);
    });

    await generateSQLUpdateFile(updates, sqlPath);
    console.log(`✅ Done! SQL file: ${sqlPath}`);

    process.exit(0);
  } else {
    console.error('Usage: npx tsx extract-statuses.ts --file <xml-file> --output <sql-file>');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
