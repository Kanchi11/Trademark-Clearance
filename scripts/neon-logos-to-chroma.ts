// scripts/neon-logos-to-chroma.ts
import 'dotenv/config';
import { db } from '../db/index';
import { usptoTrademarks } from '../db/schema';
import fetch from 'node-fetch';
import { sql } from 'drizzle-orm';
import FormData from 'form-data';

const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8000';

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8001';
const CHROMA_TENANT = process.env.CHROMA_TENANT || 'default-tenant';
const CHROMA_DATABASE = process.env.CHROMA_DATABASE || 'default';
const CHROMA_API_KEY = process.env.CHROMA_API_KEY || '';

const BATCH_SIZE = 100;

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
    body: JSON.stringify({ name: collectionName, embedding_dimension: 512, metadata: { source: 'neon' } })
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

async function main() {
  // Count total records with logoUrl
  const total = await db.select({ count: sql<number>`count(*)` }).from(usptoTrademarks).where(sql`${usptoTrademarks.logoUrl} IS NOT NULL`);
  const totalCount = Number(total[0].count);
  console.log(`Total trademarks with logos: ${totalCount}`);

  // Get collection UUID
  const collectionName = 'trademark-logos';
  const collectionId = await getCollectionId(collectionName);
  if (!collectionId) {
    console.error('Failed to get or create Chroma collection. Aborting.');
    return;
  }
  console.log(`Chroma collection UUID: ${collectionId}`);

  for (let offset = 0; offset < totalCount; offset += BATCH_SIZE) {
    const rows = await db.select({
      id: usptoTrademarks.id,
      logoUrl: usptoTrademarks.logoUrl,
      markText: usptoTrademarks.markText,
      niceClasses: usptoTrademarks.niceClasses,
      ownerName: usptoTrademarks.ownerName,
      status: usptoTrademarks.status,
      goodsServices: usptoTrademarks.goodsServices,
      usptoUrl: usptoTrademarks.usptoUrl
    }).from(usptoTrademarks)
      .where(sql`${usptoTrademarks.logoUrl} IS NOT NULL`)
      .limit(BATCH_SIZE).offset(offset);

    // Generate embeddings for logoUrl via multipart file upload (as required by ML service)
    const embeddingResults = await Promise.all(rows.map(async (row) => {
      try {
        // Download the image and upload as multipart/form-data
        const imgRes = await fetch(row.logoUrl as string);
        if (!imgRes.ok) {
          console.error(`Failed to fetch logo image: ${row.logoUrl}, status: ${imgRes.status}`);
          return { row, embedding: null };
        }
        const imgBuf = Buffer.from(await imgRes.arrayBuffer());
        const form = new FormData();
        form.append('file', imgBuf, { filename: 'image.png', contentType: 'image/png' });
        const embedRes = await fetch(`${AI_MICROSERVICE_URL}/embed/image`, {
          method: 'POST',
          headers: form.getHeaders(),
          body: form,
        });
        if (!embedRes.ok) {
          console.error(`Embedding failed for logoUrl: ${row.logoUrl}, status: ${embedRes.status}, body:`, await embedRes.text());
          return { row, embedding: null };
        }
        const data = await embedRes.json() as any;
        return { row, embedding: data.embedding ?? null };
      } catch (err) {
        console.error(`Embedding error for ${row.logoUrl}:`, err);
        return { row, embedding: null };
      }
    }));

    // Filter out rows where embedding failed
    const valid = embeddingResults.filter(r => r.embedding !== null);
    if (valid.length === 0) {
      console.warn(`Skipping batch at offset ${offset}: no valid embeddings`);
      continue;
    }

    // Prepare Chroma batch (only rows with valid embeddings)
    const ids = valid.map(r => String(r.row.id));
    const embeddings = valid.map(r => r.embedding);
    const documents = valid.map(r => r.row.markText);
    // Keep metadatas aligned with valid rows
    const metadatas = valid.map(r => ({
      logoUrl: r.row.logoUrl,
      niceClasses: r.row.niceClasses,
      ownerName: r.row.ownerName,
      status: r.row.status,
      goodsServices: r.row.goodsServices,
      usptoUrl: r.row.usptoUrl
    }));

    // Import batch to Chroma
    const url = `${CHROMA_URL}/api/v2/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}/collections/${collectionId}/add`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (CHROMA_API_KEY) headers['x-chroma-token'] = CHROMA_API_KEY;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ids, embeddings, documents, metadatas })
    });
    if (!res.ok) {
      console.error(`Chroma import failed for offset ${offset}`);
      continue;
    }
    console.log(`Imported batch ${offset}–${offset + BATCH_SIZE - 1}`);
  }
  console.log('Logo import complete.');
}

main().catch(console.error);
