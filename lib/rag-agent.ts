import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
/**
 * RAG Agent Scaffold for Trademark Search
 *
 * This is a scaffold for integrating Retrieval-Augmented Generation (RAG) into your trademark clearance pipeline.
 * - Uses OpenAI/Sentence Transformers for text embeddings
 * - Uses CLIP for image embeddings (logo similarity)
 * - Uses Chroma/FAISS for vector search (retrieval)
 * - Uses LLM (e.g., OpenAI, Llama.cpp, GPT4All) for synthesis/agent reasoning
 *
 * This is a starting point. You must add API keys, install dependencies, and connect to your vector DB.
 */


// --- Dependencies ---

import { getTextEmbeddings, getImageEmbedding, getLLMCompletion } from './ai-microservice-client';


const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8001';
const CHROMA_API_KEY = process.env.CHROMA_API_KEY || '';
const CHROMA_TENANT = process.env.CHROMA_TENANT || 'default-tenant';
const CHROMA_DATABASE = process.env.CHROMA_DATABASE || 'default';

// --- Resolve Chroma collection ID by name (v2 returns array of collections) ---
async function getChromaCollectionId(collectionName: string): Promise<string | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (CHROMA_API_KEY) headers['x-chroma-token'] = CHROMA_API_KEY;
  // Chroma v2 requires limit param — without it the response is an empty array
  const listUrl = `${CHROMA_URL}/api/v2/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}/collections?limit=100&offset=0`;
  const res = await fetch(listUrl, { headers });
  if (!res.ok) return null;
  const data = await res.json();
  const collections = Array.isArray(data) ? data : (data?.collections ?? []);
  const found = collections.find((c: { name?: string }) => c?.name === collectionName);
  return found ? (found.id ?? found.uuid ?? null) : null;
}

// --- Text Embedding (Local Microservice) ---
async function embedText(text: string): Promise<number[]> {
  const embeddings = await getTextEmbeddings([text]);
  const vec = embeddings?.[0];
  if (!Array.isArray(vec)) throw new Error('ML service returned invalid text embedding');
  return vec;
}

// --- Image Embedding (Local Microservice) ---
import axios from 'axios';

async function embedImage(imageUrl: string): Promise<number[]> {
  let buffer: Buffer;
  if (imageUrl.startsWith('data:')) {
    // Data URL (base64) from frontend upload – decode directly
    const base64Match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!base64Match) throw new Error('Invalid logo data URL');
    buffer = Buffer.from(base64Match[2], 'base64');
  } else {
    // HTTP(S) URL – fetch (e.g. hosted image or backfill)
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15_000,
      maxContentLength: 10 * 1024 * 1024, // 10MB
      validateStatus: (s) => s === 200,
    }).catch((e) => {
      throw new Error(`Failed to fetch logo: ${e.message || e.response?.status || 'network error'}`);
    });
    buffer = Buffer.from(response.data);
  }
  return await getImageEmbedding(buffer);
}

// --- Vector Search (Chroma) ---
async function searchVectors(queryEmbedding: number[], collectionName: string, topK = 5): Promise<any[]> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (CHROMA_API_KEY) headers['x-chroma-token'] = CHROMA_API_KEY;

  const collectionId = await getChromaCollectionId(collectionName);
  if (!collectionId) {
    console.warn(`Chroma collection "${collectionName}" not found; run backfill (e.g. npm run data:chroma-text:limit).`);
    return [];
  }
  const url = `${CHROMA_URL}/api/v2/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}/collections/${collectionId}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query_embeddings: [queryEmbedding],
      n_results: topK,
      include: ['documents', 'metadatas', 'distances']
    }),
  });
  if (!res.ok) throw new Error('Chroma vector search failed');
  const data = await res.json();
  // Return a flat array of results for the first query
  const results: any[] = [];
  const ids = data.ids?.[0] || [];
  const documents = data.documents?.[0] || [];
  const metadatas = data.metadatas?.[0] || [];
  const distances = data.distances?.[0] || [];
  for (let i = 0; i < ids.length; i++) {
    results.push({
      id: ids[i],
      document: documents[i],
      metadata: metadatas[i],
      distance: distances[i],
    });
  }
  return results;
}

// --- LLM Synthesis (Local Microservice) ---
async function synthesizeEvidence(evidence: any[], query: string): Promise<string> {
  const prompt = `You are a trademark clearance agent. Given the following evidence, summarize the risk, conflicts, and suggest next steps for the mark: "${query}".\n\nEvidence:\n${JSON.stringify(evidence, null, 2)}`;
  return await getLLMCompletion(prompt, 512);
}

// --- Main RAG Agent Function ---
export async function ragTrademarkAgent({ markText, logoUrl }: { markText: string; logoUrl?: string }) {
  // 1. Embed query text
  const textEmbedding = await embedText(markText);

  // 2. Embed logo (if provided)
  let imageEmbedding: number[] | null = null;
  if (logoUrl) {
    imageEmbedding = await embedImage(logoUrl);
  }

  // 3. Retrieve similar marks (text)
  const similarMarks = await searchVectors(textEmbedding, 'trademark-texts', 10);

  // 4. Retrieve similar logos (image)
  let similarLogos: any[] = [];
  if (imageEmbedding) {
    similarLogos = await searchVectors(imageEmbedding, 'trademark-logos', 10);
  }

  // 5. Synthesize evidence and risk assessment
  const summary = await synthesizeEvidence([...similarMarks, ...similarLogos], markText);

  // 6. Return unified result
  return {
    markText,
    logoUrl,
    similarMarks,
    similarLogos,
    summary,
  };
}
