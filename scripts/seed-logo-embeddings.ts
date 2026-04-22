/**
 * Seed trademark-logos Chroma collection with CLIP embeddings.
 *
 * Run:  npx tsx scripts/seed-logo-embeddings.ts
 * Env:  LOGO_LIMIT   — max records to process (default: all)
 *       CONCURRENCY  — parallel embed workers (default: 15)
 *
 * Checkpoint: progress saved to /tmp/seed-logo-checkpoint.json after every batch.
 * Kill and restart freely — it resumes from exactly where it stopped.
 * Delete that file to start from scratch.
 *
 * IDs stored in Chroma are the USPTO serial_number strings.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import postgres from 'postgres';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';
import { usptoTrademarks } from '../db/schema';
import { sql, isNotNull } from 'drizzle-orm';
import fetch from 'node-fetch';
import FormData from 'form-data';

const CKPT_FILE = '/tmp/seed-logo-checkpoint.json';
interface Ckpt { dbOffset: number; totalImported: number; totalFailed: number; totalProcessed: number; savedAt: string; }
function loadCkpt(): Ckpt | null {
  try { return existsSync(CKPT_FILE) ? JSON.parse(readFileSync(CKPT_FILE, 'utf8')) : null; } catch { return null; }
}
function saveCkpt(c: Omit<Ckpt, 'savedAt'>) {
  try { writeFileSync(CKPT_FILE, JSON.stringify({ ...c, savedAt: new Date().toISOString() }, null, 2)); } catch {}
}

const AI_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8000';
const CHROMA_URL = process.env.CHROMA_URL || 'http://127.0.0.1:8001';
const TENANT = process.env.CHROMA_TENANT || 'default-tenant';
const DB_NAME = process.env.CHROMA_DATABASE || 'default';
const MAX_RECORDS = process.env.LOGO_LIMIT ? parseInt(process.env.LOGO_LIMIT, 10) : Infinity;
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '15', 10);
const PAGE_SIZE = 100;
const UPSERT_BATCH = 20;

async function getOrCreateCollection(name: string, dim: number): Promise<string> {
  const listUrl = `${CHROMA_URL}/api/v2/tenants/${TENANT}/databases/${DB_NAME}/collections?limit=100&offset=0`;
  const res = await fetch(listUrl, { headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(`Chroma list failed: ${res.status}`);
  const data = await res.json() as any;
  const collections = Array.isArray(data) ? data : (data?.collections ?? []);
  const found = collections.find((c: any) => c.name === name);
  if (found) return found.id as string;

  const createUrl = `${CHROMA_URL}/api/v2/tenants/${TENANT}/databases/${DB_NAME}/collections`;
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, embedding_dimension: dim, metadata: { source: 'neon' } }),
  });
  if (!createRes.ok) throw new Error(`Chroma create failed: ${await createRes.text()}`);
  const created = await createRes.json() as any;
  return created.id as string;
}

async function embedImage(logoUrl: string): Promise<number[] | null> {
  try {
    const imgRes = await fetch(logoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      timeout: 6_000,
    } as any);
    if (!imgRes.ok) return null;
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    if (imgBuf.length < 100) return null; // skip tiny/invalid images

    const form = new FormData();
    form.append('file', imgBuf, { filename: 'logo.png', contentType: 'image/png' });
    const embedRes = await fetch(`${AI_URL}/embed/image`, {
      method: 'POST',
      headers: form.getHeaders(),
      body: form,
      timeout: 20_000,
    } as any);
    if (!embedRes.ok) return null;
    const data = await embedRes.json() as any;
    const emb = data?.embedding;
    return Array.isArray(emb) ? emb : null;
  } catch {
    return null;
  }
}

/**
 * Wait for Neon DB — uses HTTP transport (@neondatabase/serverless) which
 * handles cold-start wake-up gracefully, no TCP timeout issues.
 * Falls back to postgres TCP if HTTP fails.
 */
async function waitForNeon() {
  // Primary: use Neon HTTP driver (works even during compute cold-start)
  try {
    const httpSql = neon(process.env.DATABASE_URL!);
    const db = drizzleNeon({ client: httpSql, schema });
    await db.execute(sql`SELECT 1`);
    console.log('  ✓ Connected via Neon HTTP driver');
    return db as any;
  } catch (httpErr: any) {
    console.log(`  ⚠ Neon HTTP failed (${String(httpErr?.message || httpErr).slice(0, 60)}), falling back to TCP…`);
  }

  // Fallback: TCP with infinite patience
  let attempt = 0;
  while (true) {
    attempt++;
    const client = postgres(process.env.DATABASE_URL!, {
      max: 2, connect_timeout: 120, idle_timeout: 300, max_lifetime: 3600, prepare: false,
    });
    const db = drizzlePg(client, { schema });
    try {
      await db.execute(sql`SELECT 1`);
      if (attempt > 1) console.log(`  ✓ Neon TCP connected on attempt ${attempt}`);
      return db as any;
    } catch (err: any) {
      const msg = String(err?.message || err);
      const delay = Math.min(30_000 * attempt, 120_000);
      console.log(`  ⏳ Neon not ready (${msg.slice(0, 60).trim()}), retrying in ${delay / 1000}s… (attempt ${attempt})`);
      try { await client.end({ timeout: 1 }); } catch {}
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

/** Retry mid-run DB queries on transient disconnects */
async function queryWithRetry<T>(fn: () => Promise<T>, maxAttempts = 8): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try { return await fn(); }
    catch (err: any) {
      const code = (err?.code || (err?.cause as any)?.code) as string | undefined;
      const msg  = `${err?.message || ''} ${(err?.cause as any)?.message || ''}`;
      const bad  = code === 'CONNECT_TIMEOUT' || code === 'CONNECTION_CLOSED' || code === 'CONNECTION_DESTROYED'
                || msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT') || msg.includes('CONNECT_TIMEOUT')
                || msg.includes('timeout') || msg.toLowerCase().includes('connect');
      if (!bad || attempt === maxAttempts) throw err;
      const delay = Math.min(30_000 * attempt, 120_000);
      console.log(`  ⏳ DB retry ${attempt}/${maxAttempts} in ${delay / 1000}s (${code ?? msg.slice(0, 40).trim()})…`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('unreachable');
}

/** Run tasks with limited concurrency */
async function pLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

async function getExistingIds(collectionId: string, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  try {
    const url = `${CHROMA_URL}/api/v2/tenants/${TENANT}/databases/${DB_NAME}/collections/${collectionId}/get`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, include: [] }),
    });
    if (!res.ok) return new Set();
    const data = await res.json() as any;
    return new Set<string>(data?.ids ?? []);
  } catch {
    return new Set();
  }
}

async function upsertToChroma(
  collectionId: string,
  items: Array<{ serialNumber: string; markText: string; ownerName: string; status: string; logoUrl: string; embedding: number[] }>
): Promise<void> {
  const upsertUrl = `${CHROMA_URL}/api/v2/tenants/${TENANT}/databases/${DB_NAME}/collections/${collectionId}/upsert`;
  const res = await fetch(upsertUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ids: items.map((v) => v.serialNumber),
      embeddings: items.map((v) => v.embedding),
      documents: items.map((v) => v.markText || ''),
      metadatas: items.map((v) => ({
        serial_number: v.serialNumber,
        mark_text: v.markText || '',
        owner_name: v.ownerName || '',
        status: v.status || '',
        logo_url: v.logoUrl || '',
      })),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`  Chroma upsert failed: ${err.slice(0, 200)}`);
  }
}

async function main() {
  const ckpt = loadCkpt();

  console.log(`\n🚀 Seeding trademark-logos Chroma collection`);
  console.log(`   AI service  : ${AI_URL}`);
  console.log(`   Chroma      : ${CHROMA_URL}`);
  console.log(`   Concurrency : ${CONCURRENCY}`);
  if (MAX_RECORDS !== Infinity) console.log(`   Max records : ${MAX_RECORDS}`);
  if (ckpt) {
    console.log(`\n📍 Resuming from checkpoint: offset ${ckpt.dbOffset} (${ckpt.totalImported} already imported)`);
    console.log(`   Checkpoint saved: ${ckpt.savedAt}`);
  } else {
    console.log(`   No checkpoint — starting fresh`);
  }
  console.log('');

  // Verify ML service
  const health = await fetch(`${AI_URL}/health`, { timeout: 5_000 } as any).catch(() => null);
  if (!health?.ok) { console.error('❌ ML service is not responding at', AI_URL); process.exit(1); }
  console.log('✓ ML service healthy');

  // Wait for Neon — handles cold-start automatically with no give-up limit
  console.log('⏳ Connecting to Neon DB…');
  const db = await waitForNeon();
  console.log('✓ Neon DB connected');

  const collectionId = await getOrCreateCollection('trademark-logos', 512);
  console.log(`✓ Collection ID: ${collectionId}`);

  // Get total count for progress display
  const countRes = await queryWithRetry(() =>
    db.select({ count: sql<number>`count(*)` })
      .from(usptoTrademarks)
      .where(isNotNull(usptoTrademarks.logoUrl))
  );
  const totalWithLogos = Number(countRes[0].count);
  console.log(`✓ DB records with logo_url: ${totalWithLogos.toLocaleString()}\n`);

  // Resume from checkpoint if available
  let dbOffset       = ckpt?.dbOffset       ?? 0;
  let totalImported  = ckpt?.totalImported  ?? 0;
  let totalFailed    = ckpt?.totalFailed    ?? 0;
  let totalProcessed = ckpt?.totalProcessed ?? 0;
  const startTime = Date.now();

  while (true) {
    if (totalProcessed >= MAX_RECORDS) break;

    // Fetch next page from DB (with retry on transient connection errors)
    const rows = await queryWithRetry(() =>
      db
        .select({
          serialNumber: usptoTrademarks.serialNumber,
          logoUrl: usptoTrademarks.logoUrl,
          markText: usptoTrademarks.markText,
          ownerName: usptoTrademarks.ownerName,
          status: usptoTrademarks.status,
        })
        .from(usptoTrademarks)
        .where(isNotNull(usptoTrademarks.logoUrl))
        .orderBy(usptoTrademarks.id)
        .limit(PAGE_SIZE)
        .offset(dbOffset)
    );

    if (!rows.length) break;
    dbOffset += rows.length;

    // Skip rows already embedded in Chroma
    const rowSerials = rows.map((r) => r.serialNumber!).filter(Boolean);
    const existingIds = await getExistingIds(collectionId, rowSerials);
    const pendingRows = rows.filter((r) => r.serialNumber && !existingIds.has(r.serialNumber));
    const skipped = rows.length - pendingRows.length;

    // Embed all items in this page with concurrency limit
    const tasks = pendingRows.map((row) => async () => {
      const embedding = await embedImage(row.logoUrl as string);
      return embedding
        ? { serialNumber: row.serialNumber!, markText: row.markText || '', ownerName: row.ownerName || '', status: row.status || '', logoUrl: row.logoUrl || '', embedding }
        : null;
    });

    const embedResults = await pLimit(tasks, CONCURRENCY);
    const valid = embedResults.filter(Boolean) as Array<{ serialNumber: string; markText: string; ownerName: string; status: string; logoUrl: string; embedding: number[] }>;

    totalFailed    += pendingRows.length - valid.length;
    totalProcessed += rows.length;
    totalImported  += valid.length + skipped;

    // Upsert to Chroma in sub-batches
    for (let i = 0; i < valid.length; i += UPSERT_BATCH) {
      await upsertToChroma(collectionId, valid.slice(i, i + UPSERT_BATCH));
    }

    // 💾 Save checkpoint after every batch — crash-safe resume
    saveCkpt({ dbOffset, totalImported, totalFailed, totalProcessed });

    // Progress
    const elapsed  = (Date.now() - startTime) / 1000;
    const pct      = totalWithLogos > 0 ? ((totalProcessed / totalWithLogos) * 100).toFixed(1) : '?';
    const rate     = totalProcessed / (elapsed || 1);
    const etaSecs  = totalWithLogos > 0 ? Math.round((totalWithLogos - totalProcessed) / rate) : 0;
    const eta      = etaSecs > 3600 ? `${(etaSecs / 3600).toFixed(1)}h` : etaSecs > 60 ? `${Math.round(etaSecs / 60)}m` : `${etaSecs}s`;
    const skipStr  = skipped > 0 ? ` skip:${skipped}` : '';
    console.log(`  [${pct}%] +${valid.length}/${pendingRows.length}${skipStr} | total:${totalImported} | fail:${totalFailed} | offset:${dbOffset} | ETA:${eta}`);
  }

  const totalSecs = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Done in ${totalSecs}s — ${totalImported} logos in Chroma (${totalFailed} failed/skipped)`);
  try { unlinkSync(CKPT_FILE); } catch {}
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
