import axios from 'axios';

const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8000';
const EMBED_TIMEOUT_MS = 60_000; // 60s for first request (model may be loading)

export async function getTextEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await axios.post(
    `${AI_MICROSERVICE_URL}/embed/text`,
    { texts },
    { timeout: EMBED_TIMEOUT_MS }
  );
  return res.data.embeddings;
}

export async function getImageEmbedding(imageBuffer: Buffer): Promise<number[]> {
  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(imageBuffer)]), 'image.png');
  // Do not set Content-Type so axios sets multipart/form-data with boundary
  const res = await axios.post(`${AI_MICROSERVICE_URL}/embed/image`, formData, {
    timeout: 30_000,
    maxBodyLength: 10 * 1024 * 1024,
  });
  const emb = res.data?.embedding;
  if (!Array.isArray(emb)) throw new Error('ML service returned invalid embedding');
  return emb;
}

export async function getLLMCompletion(prompt: string, max_tokens = 256): Promise<string> {
  const res = await axios.post(
    `${AI_MICROSERVICE_URL}/llm/completion`,
    { prompt, max_tokens },
    { timeout: 30_000 }
  );
  return res.data.completion;
}
