// Hybrid Trademark Search Orchestrator (Node.js)
// Tier 1: fast perceptual hash (pHash) pre-filter
// Tier 2: CLIP embeddings via ML service for marks in the 60-90% hash similarity band
// Tier 3: LLM synthesis for the final top results

import { calculateImageHash, compareImageHashes } from './server-logo-comparison';
import { getAllLogoHashes } from './logo-hash-jsonl-service';
import { getImageEmbedding, getLLMCompletion } from './ai-microservice-client';
import axios from 'axios';

const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8000';

// Fetch a URL and return its buffer (used to send logo to ML service)
async function fetchImageBuffer(url: string): Promise<Buffer> {
  if (url.startsWith('data:')) {
    const match = url.match(/^data:[^;]+;base64,(.+)$/);
    if (!match) throw new Error('Invalid data URL');
    return Buffer.from(match[1], 'base64');
  }
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15_000 });
  return Buffer.from(res.data);
}

// Cosine similarity between two equal-length vectors
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function hybridTrademarkSearch({
  markText,
  logoUrl,
}: {
  markText: string;
  logoUrl: string;
}) {
  // --- Tier 1: perceptual hash pre-filter ---
  const userHash = await calculateImageHash(logoUrl);
  const allLogoHashes = getAllLogoHashes();
  const hashResults = allLogoHashes
    .map(entry => ({
      serialNumber: entry.serialNumber,
      logoHash: entry.logoHash,
      hashSimilarity: compareImageHashes(userHash, entry.logoHash),
    }))
    .sort((a, b) => b.hashSimilarity - a.hashSimilarity)
    .slice(0, 50); // keep top-50 for Tier 2 candidates

  const highConfidence = hashResults.filter(r => r.hashSimilarity > 90);
  const needsML = hashResults.filter(r => r.hashSimilarity >= 60 && r.hashSimilarity <= 90);

  // --- Tier 2: CLIP embeddings for ambiguous band ---
  let mlResults: Array<{ serialNumber: string; clipSimilarity: number; hashSimilarity: number }> = [];
  if (needsML.length > 0) {
    try {
      const userBuffer = await fetchImageBuffer(logoUrl);
      const userClipEmbedding = await getImageEmbedding(userBuffer);

      // We don't have Chroma CLIP embeddings pre-loaded by serial number here,
      // so we fall back to the Chroma vector search for the ambiguous candidates
      const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8001';
      const CHROMA_TENANT = process.env.CHROMA_TENANT || 'default-tenant';
      const CHROMA_DATABASE = process.env.CHROMA_DATABASE || 'default';
      const CHROMA_API_KEY = process.env.CHROMA_API_KEY || '';

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (CHROMA_API_KEY) headers['x-chroma-token'] = CHROMA_API_KEY;

      // List collections to find trademark-logos UUID (Chroma v2 needs limit param)
      const listRes = await fetch(
        `${CHROMA_URL}/api/v2/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}/collections?limit=100&offset=0`,
        { headers }
      );
      if (listRes.ok) {
        const listData = await listRes.json() as any;
        const collections = Array.isArray(listData) ? listData : (listData?.collections ?? []);
        const logoCollection = collections.find((c: any) => c.name === 'trademark-logos');
        if (logoCollection) {
          const queryRes = await fetch(
            `${CHROMA_URL}/api/v2/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}/collections/${logoCollection.id}/query`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                query_embeddings: [userClipEmbedding],
                n_results: Math.min(needsML.length, 20),
                include: ['metadatas', 'distances'],
                where: {
                  '$or': needsML.slice(0, 20).map(r => ({ serial_number: { '$eq': r.serialNumber } }))
                },
              }),
            }
          );
          if (queryRes.ok) {
            const qData = await queryRes.json() as any;
            const ids: string[] = qData.ids?.[0] ?? [];
            const distances: number[] = qData.distances?.[0] ?? [];
            mlResults = ids.map((id, i) => ({
              serialNumber: id,
              clipSimilarity: Math.round(Math.max(0, Math.min(100, 100 - distances[i] * 15))),
              hashSimilarity: needsML.find(r => r.serialNumber === id)?.hashSimilarity ?? 0,
            }));
          }
        }
      }
    } catch (err) {
      console.warn('[hybridTrademarkSearch] CLIP tier failed, using hash results only:', err);
    }
  }

  // --- Tier 3: LLM synthesis ---
  const topForSummary = [
    ...highConfidence.slice(0, 5),
    ...mlResults.slice(0, 5),
  ];
  let aiSummary = '';
  if (topForSummary.length > 0) {
    try {
      const prompt = `You are a trademark clearance agent. The user is searching for a logo.

Hash-similar marks (Tier 1):
${JSON.stringify(highConfidence.slice(0, 5), null, 2)}

CLIP-similar marks (Tier 2):
${JSON.stringify(mlResults.slice(0, 5), null, 2)}

Mark text being cleared: "${markText}"

Summarize the conflict risk and recommend next steps.`;
      aiSummary = await getLLMCompletion(prompt, 256);
    } catch (err) {
      console.warn('[hybridTrademarkSearch] LLM synthesis failed:', err);
      aiSummary = 'LLM summary unavailable.';
    }
  }

  // Merge and deduplicate by serialNumber, preferring CLIP score where available
  const seenSerials = new Set<string>();
  const merged: Array<{ serialNumber: string; hashSimilarity: number; clipSimilarity?: number }> = [];
  for (const r of mlResults) {
    seenSerials.add(r.serialNumber);
    merged.push(r);
  }
  for (const r of hashResults) {
    if (!seenSerials.has(r.serialNumber)) {
      merged.push({ serialNumber: r.serialNumber, hashSimilarity: r.hashSimilarity });
    }
  }
  merged.sort((a, b) => {
    const scoreA = a.clipSimilarity ?? a.hashSimilarity;
    const scoreB = b.clipSimilarity ?? b.hashSimilarity;
    return scoreB - scoreA;
  });

  return {
    markText,
    logoUrl,
    hashResults: hashResults.slice(0, 10),
    mlResults,
    mergedResults: merged.slice(0, 20),
    aiSummary,
  };
}

export default hybridTrademarkSearch;
