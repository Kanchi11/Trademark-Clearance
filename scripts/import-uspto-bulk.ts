/**
 * Production USPTO bulk data import.
 * Loads real federal trademark data from USPTO bulk XML (daily or annual).
 *
 * Usage:
 *   npm run data:import
 *   npm run data:import -- --url https://data.uspto.gov/bulkdata/trademark/dailyxml/applications/apc250101.zip
 *   npm run data:import -- --file ./path/to/extracted.xml
 *   npm run data:import -- --file ./path/to/file.zip
 *
 * Data source: https://data.uspto.gov/bulkdata/trademark/dailyxml/applications/
 * Or annual: https://developer.uspto.gov/product/trademark-annual-xml-applications
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../db';
import { usptoTrademarks } from '../db/schema';
import { sql } from 'drizzle-orm';
import { soundex } from '../lib/similarity';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

const USPTO_DAILY_BASE =
  'https://data.uspto.gov/bulkdata/trademark/dailyxml/applications';
const TSDR_URL = 'https://tsdr.uspto.gov/#caseNumber';

type StatusEnum = 'live' | 'dead' | 'pending' | 'abandoned';

/** Map USPTO action-key / status codes to our status enum */
function mapStatus(actionKey: string | undefined, statusText: string | undefined): StatusEnum {
  const key = String(actionKey || '').toUpperCase();
  const text = String(statusText || '').toLowerCase();
  if (/^6\d{2}$/.test(key) || text.includes('abandon') || text.includes('cancel')) return 'abandoned';
  if (/^1[0-5]$/.test(key) || text.includes('register') || text.includes('principal')) return 'live';
  if (key === 'NA' || text.includes('new application') || text.includes('pending')) return 'pending';
  if (text.includes('dead')) return 'dead';
  return 'pending';
}

/** Get first string from nested object (handles XML single value or array) */
function getText(obj: unknown): string {
  if (obj == null) return '';
  if (typeof obj === 'string') return obj.trim();
  if (Array.isArray(obj)) return getText(obj[0]);
  if (typeof obj === 'object' && obj !== null && '#text' in obj) return String((obj as { '#text': string })['#text']).trim();
  return '';
}

/** Get array of numbers (e.g. Nice classes) from nested XML */
function getNiceClasses(obj: unknown): number[] {
  if (obj == null) return [];
  const arr = Array.isArray(obj) ? obj : [obj];
  const out: number[] = [];
  for (const item of arr) {
    const v = typeof item === 'object' && item !== null && 'international-class-code' in item
      ? (item as { 'international-class-code': unknown })['international-class-code']
      : item;
    const n = typeof v === 'number' ? v : parseInt(String(getText(v)), 10);
    if (!Number.isNaN(n) && n >= 1 && n <= 45) out.push(n);
  }
  if (out.length === 0 && typeof obj === 'object' && obj !== null) {
    const code = (obj as Record<string, unknown>)['international-class-code'] ?? (obj as Record<string, unknown>)['classification-national'];
    const parsed = typeof code === 'number' ? code : parseInt(String(getText(code)), 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 45) out.push(parsed);
  }
  return out.length ? out : [0]; // schema requires non-empty; 0 = unknown
}

/** Extract case-file array from parsed USPTO XML root (supports daily and annual structures) */
function extractCaseFiles(root: unknown): unknown[] {
  const files: unknown[] = [];
  if (!root || typeof root !== 'object') return files;
  const r = root as Record<string, unknown>;

  function collectCaseFiles(obj: unknown) {
    if (!obj || typeof obj !== 'object') return;
    const o = obj as Record<string, unknown>;
    const cf = o['case-file'] ?? o['case-file-header'];
    if (cf) {
      files.push(...(Array.isArray(cf) ? cf : [cf]));
      return;
    }
    const actionKeys = o['action-keys'] ?? o['action-keys-header'];
    if (actionKeys) {
      const arr = Array.isArray(actionKeys) ? actionKeys : [actionKeys];
      for (const ak of arr) {
        if (ak && typeof ak === 'object') {
          const c = (ak as Record<string, unknown>)['case-file'];
          if (c) files.push(...(Array.isArray(c) ? c : [c]));
        }
      }
      return;
    }
    const segments = o['file-segments'] ?? o['file-segment'];
    if (segments) {
      const segArr = Array.isArray(segments) ? segments : [segments];
      for (const s of segArr) {
        if (s && typeof s === 'object') collectCaseFiles(s);
      }
    }
  }

  collectCaseFiles(r);
  if (files.length === 0) collectCaseFiles(r['trademark-applications-daily'] ?? r['file-segments']);
  return files;
}

/** Convert one case-file XML object to our row shape */
function caseFileToRow(cf: unknown): {
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
} | null {
  if (!cf || typeof cf !== 'object') return null;
  const c = cf as Record<string, unknown>;
  const serial = getText(c['serial-number'] ?? c['serialNumber']);
  const mark = getText(c['mark-identification'] ?? c['markIdentification'] ?? c['mark-identification-header']);
  if (!serial || !mark) return null;

  const filingDateRaw = getText(c['filing-date'] ?? c['filingDate']);
  const regDateRaw = getText(c['registration-date'] ?? c['registrationDate']);
  const filingDate = filingDateRaw ? normalizeDate(filingDateRaw) : null;
  const registrationDate = regDateRaw ? normalizeDate(regDateRaw) : null;

  const actionKey = getText(c['action-key'] ?? c['actionKey']);
  const statusDesc = getText(c['status-code'] ?? c['statusCode'] ?? c['mark-current-status-external-description-text']);
  const status = mapStatus(actionKey, statusDesc);

  let ownerName: string | null = null;
  const party = c['party'] ?? c['applicant'] ?? c['owner'];
  if (party) {
    const arr = Array.isArray(party) ? party : [party];
    const name = arr.find((p: unknown) => p && typeof p === 'object' && ('party-name' in (p as object) || 'name' in (p as object)));
    if (name && typeof name === 'object') {
      ownerName = getText((name as Record<string, unknown>)['party-name'] ?? (name as Record<string, unknown>)['name']);
    }
  }

  const classification = c['classification-national'] ?? c['international-class-code'] ?? c['classification'];
  const niceClasses = getNiceClasses(classification);
  const goodsServices = getText(c['goods-services'] ?? c['goodsServices']) || null;

  const normalized = mark.toLowerCase().replace(/\s+/g, '');
  const markSoundex = soundex(mark);

  return {
    serialNumber: serial,
    markText: mark.slice(0, 500),
    markTextNormalized: normalized.slice(0, 500),
    markSoundex: markSoundex || null,
    status,
    filingDate,
    registrationDate,
    ownerName: ownerName?.slice(0, 500) || null,
    niceClasses,
    goodsServices: goodsServices?.slice(0, 2000) || null,
    usptoUrl: `${TSDR_URL}=${serial}&caseSearchType=US_APPLICATION&caseType=DEFAULT`,
  };
}

function normalizeDate(s: string): string | null {
  const match = s.match(/(\d{4})-(\d{2})-(\d{2})/) || s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    if (match[0].includes('-')) return match[0];
    return `${match[3]}-${match[1]}-${match[2]}`;
  }
  return null;
}

async function downloadZip(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { 'User-Agent': 'TrademarkClearance/1.0' } });
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}

function extractXmlFromZip(zipBuffer: Buffer): string {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  const xmlEntry = entries.find((e) => e.entryName.toLowerCase().endsWith('.xml'));
  if (!xmlEntry) throw new Error('No .xml file found in ZIP');
  return zip.readAsText(xmlEntry);
}

async function main() {
  const args = process.argv.slice(2);
  const urlIdx = args.indexOf('--url');
  const fileIdx = args.indexOf('--file');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : undefined;

  let xml: string;

  if (urlIdx >= 0 && args[urlIdx + 1]) {
    const url = args[urlIdx + 1];
    console.log('Downloading', url, '...');
    const zipBuffer = await downloadZip(url);
    xml = extractXmlFromZip(zipBuffer);
  } else if (fileIdx >= 0 && args[fileIdx + 1]) {
    const path = resolve(process.cwd(), args[fileIdx + 1]);
    const fs = await import('fs/promises');
    const stat = await fs.stat(path);
    if (stat.isDirectory()) throw new Error('--file must be a .zip or .xml file');
    const buf = await fs.readFile(path);
    if (path.toLowerCase().endsWith('.zip')) {
      xml = extractXmlFromZip(buf);
    } else {
      xml = buf.toString('utf-8');
    }
  } else {
    // Default: download one small daily file (e.g. Jan 1 of current or prior year)
    const defaultUrl = `${USPTO_DAILY_BASE}/apc240101.zip`;
    console.log('No --url or --file; downloading default daily file:', defaultUrl);
    try {
      const zipBuffer = await downloadZip(defaultUrl);
      xml = extractXmlFromZip(zipBuffer);
    } catch (e) {
      console.error('Default download failed. Use: npm run data:import -- --url <USPTO_ZIP_URL> or --file <path>');
      throw e;
    }
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
    isArray: (name) => ['case-file', 'file-segment', 'file-segments', 'classification-national', 'international-class-code', 'party'].includes(name),
  });
  const parsed = parser.parse(xml);
  const root = parsed['trademark-applications-daily'] ?? parsed['trademark-applications-daily-version'] ?? parsed;
  const caseFiles = extractCaseFiles(root);
  console.log('Parsed', caseFiles.length, 'case-file(s)');

  const toInsert: Array<NonNullable<ReturnType<typeof caseFileToRow>>> = [];
  for (const cf of caseFiles) {
    const row = caseFileToRow(cf);
    if (row) toInsert.push(row);
    if (limit && toInsert.length >= limit) break;
  }
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
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
    inserted += batch.length;
    console.log('Upserted', inserted, '/', toInsert.length);
  }

  console.log('Done. Total rows upserted:', inserted);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
