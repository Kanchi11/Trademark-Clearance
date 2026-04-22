async function ensureDatabase(databaseName: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (CHROMA_API_KEY) headers['x-chroma-token'] = CHROMA_API_KEY;
  const dbUrl = `${CHROMA_URL}/api/v2/tenants/${CHROMA_TENANT}/databases`;
  // List databases
  const listRes = await fetch(dbUrl, { headers });
  if (!listRes.ok) {
    console.error('Chroma list databases failed:', await listRes.text());
    return false;
  }
  const listData = await listRes.json() as any;
  const found = (listData.databases || []).find((d: any) => d.name === databaseName);
  if (found) return true;
  // Create database if not found
  const createRes = await fetch(dbUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: databaseName })
  });
  if (!createRes.ok) {
    const errText = await createRes.text();
    if (errText.includes('already exists')) {
      console.warn('Chroma database already exists, continuing.');
      return true;
    }
    console.error('Chroma create database failed:', errText);
    return false;
  }
  return true;
}
// scripts/neon-to-chroma.ts
import 'dotenv/config';
import { db } from '../db/index';
import { usptoTrademarks } from '../db/schema';
import fetch from 'node-fetch';
import { sql } from 'drizzle-orm';

// Chroma config
const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8001';
const CHROMA_TENANT = process.env.CHROMA_TENANT || 'default-tenant';
const CHROMA_DATABASE = process.env.CHROMA_DATABASE || 'default';
const CHROMA_API_KEY = process.env.CHROMA_API_KEY || '';

const BATCH_SIZE = 20; // Reduce batch size for stability
const EMBED_RETRY = 5;
const EMBED_DELAY_MS = 200;

async function getCollectionId(collectionName: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (CHROMA_API_KEY) headers['x-chroma-token'] = CHROMA_API_KEY;
  // Chroma v2 requires limit param — without it the response is an empty array
  const listUrl = `${CHROMA_URL}/api/v2/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}/collections?limit=100&offset=0`;
  const res = await fetch(listUrl, { headers });
  if (!res.ok) {
    console.error('Chroma list collections failed:', await res.text());
    return undefined;
  }
  const data = await res.json() as any;
  // Chroma v2 returns a plain array; v1 wraps in { collections: [] }
  const collections = Array.isArray(data) ? data : (data?.collections ?? []);
  const found = collections.find((c: any) => c.name === collectionName);
  if (found) return found.id;
  // Create collection if not found
  const createUrl = `${CHROMA_URL}/api/v2/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}/collections`;
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: collectionName, embedding_dimension: 768, metadata: { source: 'neon' } })
  });
  if (!createRes.ok) {
    const errText = await createRes.text();
    if (errText.includes('already exists')) {
      // Find the collection again to get its UUID
      const listRes2 = await fetch(listUrl, { headers });
      const data2 = await listRes2.json() as any;
      const coll2 = Array.isArray(data2) ? data2 : (data2?.collections ?? []);
      const found2 = coll2.find((c: any) => c.name === collectionName);
      if (found2) return found2.id;
      console.error('Chroma collection exists but cannot find UUID.');
      return undefined;
    }
    console.error('Chroma create collection failed:', errText);
    return undefined;
  }
  const createData = await createRes.json() as any;
  return createData.id;
}

import fs from 'fs';
const CHECKPOINT_FILE = 'import-checkpoint.json';

function readCheckpoint(): { textOffset: number, logoOffset: number } {
  try {
    const data = fs.readFileSync(CHECKPOINT_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { textOffset: 0, logoOffset: 0 };
  }
}

function writeCheckpoint(offsets: { textOffset: number, logoOffset: number }) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(offsets));
}

async function main() {
  // Count total records
  const total = await db.select({ count: sql<number>`count(*)` }).from(usptoTrademarks);
  const totalCount = Number(total[0].count);
  console.log(`Total trademarks: ${totalCount}`);

  // Ensure Chroma database exists
  const dbOk = await ensureDatabase(CHROMA_DATABASE);
  if (!dbOk) {
    console.error('Failed to get or create Chroma database. Aborting.');
    return;
  }
  // Get collection UUID dynamically
  const collectionName = 'trademark-texts';
  const collectionId = await getCollectionId(collectionName);
  if (!collectionId) {
    console.error('Failed to get or create Chroma collection. Aborting.');
    return;
  }
  console.log(`Chroma collection UUID: ${collectionId}`);

  const checkpoint = readCheckpoint();
  let textOffset = checkpoint.textOffset || 0;
  for (let offset = textOffset; offset < totalCount; offset += BATCH_SIZE) {
    const rows = await db.select({
      id: usptoTrademarks.id,
      markText: usptoTrademarks.markText,
      logoUrl: usptoTrademarks.logoUrl,
      niceClasses: usptoTrademarks.niceClasses,
      ownerName: usptoTrademarks.ownerName,
      status: usptoTrademarks.status,
      goodsServices: usptoTrademarks.goodsServices,
      usptoUrl: usptoTrademarks.usptoUrl
    }).from(usptoTrademarks).limit(BATCH_SIZE).offset(offset);

    // Generate embeddings for markText with retry and delay
    const embeddings = await Promise.all(rows.map(async (row) => {
      const embedUrl = `${process.env.AI_MICROSERVICE_URL || 'http://localhost:8000'}/embed/text`;
      let attempt = 0;
      while (attempt < EMBED_RETRY) {
        try {
          const res = await fetch(embedUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texts: [row.markText] })
          });
          if (!res.ok) {
            console.error(`Embedding failed for markText: ${row.markText}, status: ${res.status}, body:`, await res.text());
            attempt++;
            await new Promise(r => setTimeout(r, EMBED_DELAY_MS));
            continue;
          }
          const data = await res.json() as any;
          await new Promise(r => setTimeout(r, EMBED_DELAY_MS));
          return data.embeddings[0];
        } catch (e) {
          console.error(`Embedding error for markText: ${row.markText}`, e);
          attempt++;
          await new Promise(r => setTimeout(r, EMBED_DELAY_MS));
        }
      }
      return null;
    }));

    // Filter out rows with failed embeddings (Chroma rejects batches with null)
    const validPairs = rows.map((r, i) => ({ row: r, embedding: embeddings[i] })).filter(p => p.embedding !== null);
    if (validPairs.length === 0) {
      console.warn(`Skipping batch at offset ${offset}: all embeddings failed`);
      writeCheckpoint({ textOffset: offset + BATCH_SIZE, logoOffset: checkpoint.logoOffset || 0 });
      continue;
    }

    // Prepare Chroma batch using only valid rows
    const ids = validPairs.map(p => String(p.row.id));
    const validEmbeddings = validPairs.map(p => p.embedding);
    const documents = validPairs.map(p => p.row.markText);
    const metadatas = validPairs.map(p => ({
      logoUrl: p.row.logoUrl,
      niceClasses: p.row.niceClasses,
      ownerName: p.row.ownerName,
      status: p.row.status,
      goodsServices: p.row.goodsServices,
      usptoUrl: p.row.usptoUrl
    }));

    // Import batch to Chroma
    const url = `${CHROMA_URL}/api/v2/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}/collections/${collectionId}/add`; // Chroma v2 batch add
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (CHROMA_API_KEY) headers['x-chroma-token'] = CHROMA_API_KEY;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ids, embeddings: validEmbeddings, documents, metadatas })
    });
    if (!res.ok) {
      console.error(`Chroma import failed for offset ${offset}`);
      continue;
    }
    console.log(`Imported batch ${offset}–${offset + BATCH_SIZE - 1} (${validPairs.length}/${rows.length} records)`);
    writeCheckpoint({ textOffset: offset + BATCH_SIZE, logoOffset: checkpoint.logoOffset || 0 });
  }
  console.log('Import complete.');
}


// --- LOGO EMBEDDING IMPORT ---
async function importLogoEmbeddings() {
  const checkpoint = readCheckpoint();
  let logoOffset = checkpoint.logoOffset || 0;
  // Get or create 'trademark-logos' collection
  const logoCollectionName = 'trademark-logos';
  // Hardcode UUID if known, else fetch/create
  let logoCollectionId = await getCollectionId(logoCollectionName);
  if (!logoCollectionId) {
    console.error('Failed to get or create trademark-logos collection. Aborting logo import.');
    return;
  }
  // Count total records with logoUrl
  const totalLogo = await db.select({ count: sql<number>`count(*)` }).from(usptoTrademarks).where(sql`logoUrl IS NOT NULL AND logoUrl != ''`);
  const totalLogoCount = Number(totalLogo[0].count);
  console.log(`Total trademarks with logo: ${totalLogoCount}`);

  for (let offset = logoOffset; offset < totalLogoCount; offset += BATCH_SIZE) {
    const rows = await db.select({
      id: usptoTrademarks.id,
      logoUrl: usptoTrademarks.logoUrl,
      markText: usptoTrademarks.markText,
      niceClasses: usptoTrademarks.niceClasses,
      ownerName: usptoTrademarks.ownerName,
      status: usptoTrademarks.status,
      goodsServices: usptoTrademarks.goodsServices,
      usptoUrl: usptoTrademarks.usptoUrl
    })
      .from(usptoTrademarks)
      .where(sql`logoUrl IS NOT NULL AND logoUrl != ''`)
      .limit(BATCH_SIZE)
      .offset(offset);

    // Download and embed each logo with retry and delay
    const embeddings = await Promise.all(rows.map(async (row) => {
      let attempt = 0;
      while (attempt < EMBED_RETRY) {
        try {
          if (!row.logoUrl) return null;
          // Download image (as buffer)
          const imgRes = await fetch(row.logoUrl);
          if (!imgRes.ok) {
            console.error(`Failed to fetch logo: ${row.logoUrl}`);
            attempt++;
            await new Promise(r => setTimeout(r, EMBED_DELAY_MS));
            continue;
          }
          const imgBuf = await imgRes.arrayBuffer();
          // Use Blob for FormData (browser/node-fetch v3 compatible)
          const blob = new Blob([imgBuf]);
          const form = new FormData();
          form.append('file', blob, 'logo');
          const embedRes = await fetch('http://localhost:8000/embed/image', {
            method: 'POST',
            body: form as any,
          });
          if (!embedRes.ok) {
            console.error(`Embedding failed for logo: ${row.logoUrl}, status: ${embedRes.status}`);
            attempt++;
            await new Promise(r => setTimeout(r, EMBED_DELAY_MS));
            continue;
          }
          const data: { embedding?: number[] } = await embedRes.json();
          if (!data.embedding) {
            console.error(`No embedding returned for logo: ${row.logoUrl}`);
            attempt++;
            await new Promise(r => setTimeout(r, EMBED_DELAY_MS));
            continue;
          }
          await new Promise(r => setTimeout(r, EMBED_DELAY_MS));
          return data.embedding;
        } catch (e) {
          console.error('Logo embedding error:', e);
          attempt++;
          await new Promise(r => setTimeout(r, EMBED_DELAY_MS));
        }
      }
      return null;
    }));

    // Prepare Chroma batch
    const ids = rows.map(r => String(r.id));
    const documents = rows.map(r => r.logoUrl);
    const metadatas = rows.map(r => ({
      markText: r.markText,
      niceClasses: r.niceClasses,
      ownerName: r.ownerName,
      status: r.status,
      goodsServices: r.goodsServices,
      usptoUrl: r.usptoUrl
    }));

    // Import batch to Chroma
    const url = `${CHROMA_URL}/api/v2/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}/collections/${logoCollectionId}/add`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (CHROMA_API_KEY) headers['x-chroma-token'] = CHROMA_API_KEY;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ids, embeddings, documents, metadatas })
    });
    if (!res.ok) {
      console.error(`Chroma logo import failed for offset ${offset}`);
      continue;
    }
    console.log(`Imported logo batch ${offset}–${offset + BATCH_SIZE - 1}`);
    writeCheckpoint({ textOffset: checkpoint.textOffset || 0, logoOffset: offset + BATCH_SIZE });
  }
  console.log('Logo import complete.');
}

main().then(importLogoEmbeddings).catch(console.error);
