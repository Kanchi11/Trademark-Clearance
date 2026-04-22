import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
/**
 * RAG Agent End-to-End Test
 * This script tests the full RAG agent pipeline using your Chroma Cloud DB.
 * It will:
 *  - Use a sample mark and (optional) logo
 *  - Call the ragTrademarkAgent
 *  - Print the results (similar marks, similar logos, summary)
 *
 * Usage: npx tsx test-rag-agent.ts
 */

import { ragTrademarkAgent } from './lib/rag-agent';

async function main() {
  const markText = 'Arcangel'; // Change to any test mark
  const logoUrl = undefined; // Or provide a logo image URL for image search

  console.log('Testing RAG agent with mark:', markText);
  if (logoUrl) console.log('Logo URL:', logoUrl);

  try {
    const result = await ragTrademarkAgent({ markText, logoUrl });
    console.log('\n=== RAG AGENT RESULT ===\n');
    console.dir(result, { depth: 6 });
    console.log('\nSummary:\n', result.summary);
  } catch (err) {
    console.error('RAG agent test failed:', err);
  }
}

main();
