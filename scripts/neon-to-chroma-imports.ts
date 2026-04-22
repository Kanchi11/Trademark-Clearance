/**
 * neon-to-chroma-imports.ts
 *
 * Shared Chroma import helpers used by neon-to-chroma.ts and neon-logos-to-chroma.ts.
 * Re-exports db + schema so scripts can import from a single location.
 */
import { sql } from 'drizzle-orm';
import { db } from '../db/index';
import { usptoTrademarks } from '../db/schema';

export { sql, db, usptoTrademarks };

/** Ensure a Chroma v2 database exists, create it if not. */
export async function ensureChromaDatabase(
  chromaUrl: string,
  tenant: string,
  database: string,
  apiKey: string
): Promise<boolean> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-chroma-token'] = apiKey;

  const dbUrl = `${chromaUrl}/api/v2/tenants/${tenant}/databases`;
  const listRes = await fetch(dbUrl, { headers });
  if (!listRes.ok) {
    console.error('Chroma list databases failed:', await listRes.text());
    return false;
  }
  const listData = await listRes.json() as any;
  const databases = Array.isArray(listData) ? listData : (listData?.databases ?? []);
  if (databases.find((d: any) => d.name === database)) return true;

  const createRes = await fetch(dbUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: database }),
  });
  if (!createRes.ok) {
    const err = await createRes.text();
    if (err.includes('already exists')) return true;
    console.error('Chroma create database failed:', err);
    return false;
  }
  return true;
}

/** Get or create a Chroma v2 collection; returns the collection UUID. */
export async function getOrCreateChromaCollection(
  chromaUrl: string,
  tenant: string,
  database: string,
  apiKey: string,
  collectionName: string,
  embeddingDimension: number
): Promise<string | undefined> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-chroma-token'] = apiKey;
  const listUrl = `${chromaUrl}/api/v2/tenants/${tenant}/databases/${database}/collections`;

  const listRes = await fetch(listUrl, { headers });
  if (!listRes.ok) {
    console.error('Chroma list collections failed:', await listRes.text());
    return undefined;
  }
  const data = await listRes.json() as any;
  const collections = Array.isArray(data) ? data : (data?.collections ?? []);
  const found = collections.find((c: any) => c.name === collectionName);
  if (found) return found.id;

  // Create
  const createRes = await fetch(listUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: collectionName, embedding_dimension: embeddingDimension, metadata: { source: 'neon' } }),
  });
  if (!createRes.ok) {
    const err = await createRes.text();
    if (err.includes('already exists')) {
      const retry = await fetch(listUrl, { headers });
      const data2 = await retry.json() as any;
      const coll2 = Array.isArray(data2) ? data2 : (data2?.collections ?? []);
      return coll2.find((c: any) => c.name === collectionName)?.id;
    }
    console.error('Chroma create collection failed:', err);
    return undefined;
  }
  return ((await createRes.json()) as any).id;
}
