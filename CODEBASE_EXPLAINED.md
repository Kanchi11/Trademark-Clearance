# Trademark Clearance — Full Codebase Explained

This document explains every major piece of the system: what it is, how it works, and how the pieces connect. Written for anyone who wants to understand the project from scratch.

---

## Table of Contents

1. [What Does This App Do?](#1-what-does-this-app-do)
2. [High-Level Architecture](#2-high-level-architecture)
3. [The Database — Neon (PostgreSQL)](#3-the-database--neon-postgresql)
4. [The AI Microservice (Python / FastAPI)](#4-the-ai-microservice-python--fastapi)
5. [The Vector Database — ChromaDB](#5-the-vector-database--chromadb)
6. [The Seed Scripts — Loading Data into Chroma](#6-the-seed-scripts--loading-data-into-chroma)
7. [The RAG Agent — Retrieval-Augmented Generation](#7-the-rag-agent--retrieval-augmented-generation)
8. [The Search API — Unified Trademark Search](#8-the-search-api--unified-trademark-search)
9. [The Frontend — Next.js Pages](#9-the-frontend--nextjs-pages)
10. [Environment Variables](#10-environment-variables)
11. [How a Search Actually Works — Step by Step](#11-how-a-search-actually-works--step-by-step)
12. [The Logo Similarity Pipeline Explained](#12-the-logo-similarity-pipeline-explained)
13. [Key Design Decisions and Trade-offs](#13-key-design-decisions-and-trade-offs)
14. [How to Run Everything](#14-how-to-run-everything)

---

## 1. What Does This App Do?

When someone wants to register a new trademark (a brand name, logo, or slogan), they first need to check whether a similar trademark already exists. If there is an existing trademark that is too similar, they could face a legal conflict, be blocked from registration, or get sued.

This app automates that clearance search. Given a **brand name** and optionally a **logo**, it searches a database of 500,000+ real USPTO (United States Patent and Trademark Office) trademarks and returns a ranked list of potential conflicts, each with a similarity score and risk level (low / medium / high).

The search is not just a simple keyword lookup. It uses three independent methods in parallel:

| Method | What it looks for |
|---|---|
| **DB fuzzy / phonetic search** | Names that sound like or are spelled similarly to the query |
| **RAG semantic text search** | Names that mean the same thing even if worded differently |
| **CLIP logo similarity search** | Logos that look visually similar |

All three results are merged and deduplicated into a single ranked list.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────┐
│              User's Browser             │
│   Next.js Frontend (localhost:3001)     │
│   - Search page  (app/search/page.tsx)  │
│   - Results page (app/results/page.tsx) │
└───────────────┬─────────────────────────┘
                │  POST /api/search
                ▼
┌─────────────────────────────────────────┐
│         Next.js API Route               │
│   app/api/search/route.ts               │
│   - Validates input                     │
│   - Calls unifiedTrademarkSearch()      │
└──────┬──────────────┬───────────────────┘
       │              │
    ┌──▼──┐       ┌───▼────────────────────┐
    │ DB  │       │  RAG Agent             │
    │Neon │       │  lib/rag-agent.ts      │
    │ PG  │       │  - Text search (Chroma)│
    └──┬──┘       │  - Logo search (Chroma)│
       │          └──────┬─────────────────┘
       │                 │ embed queries
       │          ┌──────▼─────────────────┐
       │          │  AI Microservice        │
       │          │  ai-microservice/main.py│
       │          │  Port 8000             │
       │          │  - /embed/text  (768d) │
       │          │  - /embed/image (512d) │
       │          │  - /llm/complete       │
       │          └──────┬─────────────────┘
       │                 │ search vectors
       │          ┌──────▼─────────────────┐
       │          │  ChromaDB              │
       │          │  Port 8001             │
       │          │  trademark-texts       │
       │          │  trademark-logos       │
       │          └────────────────────────┘
       │
       ▼ merges all three sources
┌─────────────────────────────────────────┐
│  lib/unified-trademark-search.ts        │
│  Deduplicates + ranks + scores results  │
└─────────────────────────────────────────┘
```

Five processes must be running for the full feature set:

| Process | Port | Language | How to start |
|---|---|---|---|
| Next.js app | 3001 | TypeScript | `TURBOPACK=0 npx next dev --port 3001` |
| AI microservice | 8000 | Python | `uvicorn main:app --port 8000` (in `ai-microservice/`) |
| ChromaDB | 8001 | Python | `chroma run --path ./chroma_data --port 8001` |
| Neon DB | cloud | PostgreSQL | Always on (managed by Neon) |
| Seed script | — | TypeScript | `npx tsx scripts/seed-logo-embeddings.ts` (one-off job) |

---

## 3. The Database — Neon (PostgreSQL)

**File:** `db/schema.ts`, `db/index.ts`

Neon is a serverless PostgreSQL cloud database. All trademark data lives here. The key table is `uspto_trademarks`.

### `uspto_trademarks` Table

Every row is one real USPTO trademark record.

| Column | Type | Description |
|---|---|---|
| `id` | serial | Auto-incrementing primary key |
| `serial_number` | text (unique) | USPTO serial number, e.g. `"88000001"` — the canonical ID used everywhere |
| `mark_text` | text | The trademark name, e.g. `"APPLE"` |
| `mark_text_normalized` | text | Lowercase, whitespace-stripped version for fast exact matching |
| `mark_soundex` | text | Soundex code for phonetic matching (`A140` for "APPLE") |
| `mark_metaphone` | text | Double Metaphone — a more accurate phonetic algorithm |
| `status` | enum | `live`, `dead`, `pending`, or `abandoned` |
| `filing_date` | date | When the trademark was filed |
| `owner_name` | text | Company or person who owns the trademark |
| `nice_classes` | int[] | Industry classification numbers (1–45), e.g. `[9, 42]` for software |
| `goods_services` | text | Description of what the trademark covers |
| `logo_url` | text | URL to the trademark's logo image on USPTO servers |
| `logo_hash` | text | 64-bit perceptual hash for fast image duplicate detection |

There are 527,612 records with a `logo_url`. Only records with a `logo_url` can be used for logo similarity search.

### Drizzle ORM

The app uses **Drizzle ORM** to talk to Neon. Drizzle is a TypeScript-first SQL query builder. Instead of writing raw SQL, you write TypeScript that generates SQL:

```typescript
// db/index.ts — creates the DB connection
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });

// Usage example — gets 100 trademarks starting from offset 500
const rows = await db
  .select({ serialNumber: usptoTrademarks.serialNumber, markText: usptoTrademarks.markText })
  .from(usptoTrademarks)
  .where(isNotNull(usptoTrademarks.logoUrl))
  .orderBy(usptoTrademarks.id)
  .limit(100)
  .offset(500);
```

### The Neon Cold-Start Problem

Neon is serverless — the database "sleeps" when not in use and needs 10–60 seconds to wake up ("cold start"). The standard `postgres` TCP driver times out during this wake-up period.

**The fix:** Use `@neondatabase/serverless` which communicates over HTTPS instead of TCP. HTTPS requests patiently wait for the compute to wake up without timing out.

```typescript
// HTTP driver — survives cold starts
import { neon } from '@neondatabase/serverless';
const httpSql = neon(process.env.DATABASE_URL!);
```

---

## 4. The AI Microservice (Python / FastAPI)

**File:** `ai-microservice/main.py`

This is a Python web service that does the heavy lifting of AI model inference. The Next.js app cannot load AI models directly (Node.js lacks good GPU/ML libraries), so all embedding generation is delegated here.

### What It Provides

**`POST /embed/text`** — Converts brand names / descriptions into text vectors
- Model: `sentence-transformers/all-mpnet-base-v2`
- Output: 768-dimensional vector (array of 768 floats)
- Example: `"APPLE"` → `[0.023, -0.41, 0.088, ...]` (768 numbers)

**`POST /embed/image`** — Converts logo images into image vectors
- Model: CLIP `ViT-B/32` (from OpenAI, loaded via `open_clip`)
- Input: multipart file upload (PNG/JPG/SVG)
- Output: 512-dimensional vector (array of 512 floats)
- Example: Apple's bitten-apple logo → `[-0.12, 0.34, ...]` (512 numbers)

**`POST /llm/complete`** — Generates a natural-language risk summary
- Uses OpenAI `gpt-4o-mini` if `OPENAI_API_KEY` is set
- Falls back to a rule-based template if no API key

**`GET /health`** — Returns `{"status": "ok", "service": "trademark-ai"}`

### Why Two Different Embedding Types?

Text embeddings (768d) and image embeddings (512d) are stored in **separate Chroma collections** because they represent completely different spaces:
- Text embeddings are trained on semantic meaning of words
- Image embeddings (CLIP) are trained on visual similarity of images

You cannot mix them — a text vector and an image vector are incompatible.

### Lazy Model Loading

Models are heavy (~500MB each). They are only loaded when first needed, not at startup:

```python
_text_model = None   # loaded on first /embed/text call
_clip_model = None   # loaded on first /embed/image call

def get_text_model():
    global _text_model
    if _text_model is None:
        from sentence_transformers import SentenceTransformer
        _text_model = SentenceTransformer("sentence-transformers/all-mpnet-base-v2")
    return _text_model
```

The text model is pre-loaded at startup (in the `lifespan` function) because it is used on every search. The CLIP model is loaded lazily.

---

## 5. The Vector Database — ChromaDB

**Running at:** `http://127.0.0.1:8001`

ChromaDB is a vector database — a database specifically built to store and search high-dimensional vectors efficiently. Regular databases like PostgreSQL are terrible at "find me the 10 most similar vectors" queries. Chroma is purpose-built for exactly that.

### How Vector Search Works

Every trademark text and logo is pre-converted into a vector (a list of numbers). When you search for `"APPLE":

1. `"APPLE"` is converted into a query vector: `[0.023, -0.41, ...]`
2. Chroma computes the **distance** between this vector and every stored vector
3. It returns the N closest matches (smallest distance = most similar)

Distance 0 = identical. Distance 2 = completely different.

### Collections

Chroma organizes vectors into collections (similar to tables in SQL):

| Collection | Vectors stored | Used for |
|---|---|---|
| `trademark-texts` | 768d text embeddings of all trademark names | Semantic text similarity search |
| `trademark-logos` | 512d CLIP embeddings of all trademark logos | Visual logo similarity search |

### Chroma API v2

The code talks to Chroma directly via its REST API. The URL structure is:

```
/api/v2/tenants/{tenant}/databases/{database}/collections/{collection_id}/query
```

For example, to find the 10 most visually similar logos:
```
POST http://127.0.0.1:8001/api/v2/tenants/default-tenant/databases/default/collections/c95e78dd-9540-40ba-9d78-0baa1664d0c8/query
{
  "query_embeddings": [[0.023, -0.41, ...]],
  "n_results": 10,
  "include": ["metadatas", "documents", "distances"]
}
```

### Important: `localhost` vs `127.0.0.1`

A critical bug was that the code used `localhost` for the Chroma URL while Chroma was bound to `127.0.0.1`. On modern macOS, `localhost` resolves to IPv6 (`::1`) but Chroma only listens on IPv4 (`127.0.0.1`). The fix was to always use `http://127.0.0.1:8001` instead of `http://localhost:8001`.

---

## 6. The Seed Scripts — Loading Data into Chroma

Before logo similarity search can work, every trademark logo must be downloaded, converted to a CLIP vector, and stored in Chroma. This is a one-time batch job that takes ~8 hours for all 527,612 logos.

### Two Versions

**`scripts/neon-logos-to-chroma.ts`** — The original, simpler version
- Reads all trademarks with `logo_url` from Neon in pages of 100
- Downloads each logo image, sends it to the ML service's `/embed/image` endpoint
- Uploads the embeddings to Chroma's `trademark-logos` collection
- **Limitation:** No checkpointing — if it crashes, you start from scratch. IDs stored as `row.id` (integer), which broke the search pipeline.

**`scripts/seed-logo-embeddings.ts`** — The production version (currently running)
- Everything the original did, plus:
  - **File-based checkpointing** — saves progress to `/tmp/seed-logo-checkpoint.json` after every batch. Kill and restart anytime; it resumes from exactly where it stopped.
  - **Neon HTTP driver** — uses `@neondatabase/serverless` to avoid TCP cold-start timeouts
  - **Retry logic** — database queries automatically retry up to 8 times on transient errors
  - **Skip already-seeded records** — checks Chroma before embedding, skips duplicates
  - **Serial number as ID** — stores `serialNumber` (e.g. `"88000001"`) as the Chroma ID, matching what the search pipeline queries by
  - **Concurrency control** — runs 15 logo downloads + embeds in parallel for speed
  - **ETA display** — shows estimated time remaining in the progress log

### Checkpoint System in Detail

```typescript
const CKPT_FILE = '/tmp/seed-logo-checkpoint.json';

// Load on startup — if file exists, resume from saved offset
function loadCkpt(): Ckpt | null {
  try {
    return existsSync(CKPT_FILE)
      ? JSON.parse(readFileSync(CKPT_FILE, 'utf8'))
      : null;
  } catch { return null; }
}

// Save after every batch — so a crash loses at most one batch of work
function saveCkpt(c: Omit<Ckpt, 'savedAt'>) {
  try {
    writeFileSync(CKPT_FILE, JSON.stringify({ ...c, savedAt: new Date().toISOString() }, null, 2));
  } catch {}
}
```

The checkpoint stores:
- `dbOffset` — how many DB rows have been processed (used to resume)
- `totalImported` — how many logos are now in Chroma
- `totalFailed` — how many logo fetches/embeds failed (e.g. CDN 403 errors)
- `savedAt` — timestamp, useful for debugging

### Why ~30% of Logos Fail

USPTO logo URLs look like `https://tsdr.uspto.gov/img/88000001/large`. The USPTO CDN blocks automated requests and returns HTTP 403 (Forbidden). The seed script counts these as failures and skips them — they cannot be embedded because the image cannot be downloaded. This is expected and non-recoverable without using USPTO's official API.

### The `waitForNeon()` Function

This function is the solution to the Neon cold-start problem during the seed job:

```typescript
async function waitForNeon() {
  // Primary path: HTTP driver — asks Neon over HTTPS, which waits for cold-start
  try {
    const httpSql = neon(process.env.DATABASE_URL!);
    const db = drizzleNeon({ client: httpSql, schema });
    await db.execute(sql`SELECT 1`);
    console.log('  ✓ Connected via Neon HTTP driver');
    return db;
  } catch (httpErr) {
    console.log('  ⚠ HTTP failed, falling back to TCP...');
  }

  // Fallback: TCP with infinite patience — retries every 30s (up to 120s) forever
  let attempt = 0;
  while (true) {
    attempt++;
    const client = postgres(process.env.DATABASE_URL!, { max: 2, connect_timeout: 120, ... });
    const db = drizzlePg(client, { schema });
    try {
      await db.execute(sql`SELECT 1`);
      return db;
    } catch (err) {
      const delay = Math.min(30_000 * attempt, 120_000); // 30s, 60s, 90s, then 120s max
      console.log(`  ⏳ Neon not ready, retrying in ${delay/1000}s... (attempt ${attempt})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

### Progress Log Format

While running, the seed prints one line per batch of 100 records:

```
[8.4%] +68/100 | total:31045 | fail:13255 | offset:44300 | ETA:37.7h
```

| Field | Meaning |
|---|---|
| `[8.4%]` | Percentage of all 527K logo records processed |
| `+68/100` | 68 new logos added to Chroma out of 100 in this batch |
| `total:31045` | Total logos now in Chroma (including pre-existing) |
| `fail:13255` | Cumulative failures (403s, timeouts, bad images) |
| `offset:44300` | Current DB row offset (used for checkpointing) |
| `ETA:37.7h` | Estimated time until all logos are processed |

---

## 7. The RAG Agent — Retrieval-Augmented Generation

**File:** `lib/rag-agent.ts`

RAG (Retrieval-Augmented Generation) is a technique that combines vector search (retrieval) with an LLM (generation). In this app, the "retrieval" part does the real work — finding similar trademarks by meaning. The "generation" part creates a natural-language summary of the risk.

### What `ragTrademarkAgent()` Does

1. **Embeds the query text** — sends the brand name (e.g. `"apple computers"`) to `POST /embed/text` on the ML service, gets a 768d vector back
2. **Searches trademark-texts collection** — asks Chroma: "find the 20 trademark names whose text vectors are closest to this query vector"
3. **Embeds the logo** (if provided) — if the user uploaded a logo, sends it to `POST /embed/image`, gets a 512d CLIP vector back
4. **Searches trademark-logos collection** — asks Chroma: "find the 15 logos whose CLIP vectors are closest to this query logo"
5. **Calls the LLM** — passes all found similar trademarks to the LLM and asks it to summarize the conflict risk
6. **Returns structured results** — both the raw matches and the LLM's narrative summary

### Key Function: `embedImage()` in rag-agent.ts

Unlike the seed script which always fetches from a URL, the RAG agent's `embedImage()` handles two cases:
- **Data URL** — when the user uploads a logo from their computer, the browser sends it as a base64 `data:image/png;base64,...` string. This is decoded directly to a Buffer.
- **HTTP URL** — when fetching a logo from the internet, it uses `axios.get()` with a 15-second timeout.

Either way, the Buffer is sent to the ML service's `/embed/image` endpoint as a multipart file upload, and a 512d CLIP embedding comes back.

---

## 8. The Search API — Unified Trademark Search

**Files:** `app/api/search/route.ts`, `lib/unified-trademark-search.ts`

### `app/api/search/route.ts`

This is the Next.js API route — the single entry point for all trademark searches. It:

1. Parses and validates the request body (brand name 2–200 chars, Nice classes 1–45)
2. Calls `unifiedTrademarkSearch()` and waits for it
3. Returns a JSON response with all results, scores, sources, and pipeline metadata

### `lib/unified-trademark-search.ts`

This is the brain of the search pipeline. It runs **three searches in parallel** and merges the results:

```typescript
const [dbResult, ragResult] = await Promise.all([
  // Search 1: PostgreSQL fuzzy/phonetic search
  trademarkSearchService.search({ markText, niceClasses }),

  // Search 2 & 3: RAG text + logo search (both happen inside ragTrademarkAgent)
  ragTrademarkAgent({ markText, logoUrl, niceClasses, goodsServices }),
]);
```

### Merging Results

The merge logic in `mergeConflicts()` is careful:

1. **Start with DB results** — they have the richest metadata (filing dates, owner info, goods/services descriptions)
2. **For each RAG text result:**
   - If the serial number already exists from the DB search → boost the similarity score if the RAG score is higher (only if RAG score ≥ 45%)
   - If it's a new serial number → add it as a new result, sourced from `"rag-text"`
3. **For each CLIP logo result:**
   - Same logic — boost existing or add new, sourced from `"rag-logo"`

### Distance to Score Conversion

Chroma returns distances (lower = more similar). The code converts them to percentages:

```typescript
function chromaDistanceToScore(distance: number): number {
  // distance 0 = identical → 100%
  // distance 1 = somewhat different → 50%
  // distance 2 = completely different → 0%
  return Math.round(Math.max(0, Math.min(100, (1 - distance / 2) * 100)));
}
```

### Risk Classification

| Similarity Score | Risk Level |
|---|---|
| ≥ 75% | High Risk |
| 50–74% | Medium Risk |
| < 50% | Low Risk |

---

## 9. The Frontend — Next.js Pages

**Files:** `app/search/page.tsx`, `app/results/page.tsx`

### Search Page (`/search`)

The main user interface. Lets the user:
- Type a brand name they want to register
- Upload a logo image from their computer (optional)
- Select Nice classes (industry categories) that apply to their business
- Enter a description of their goods/services

When they click "Search", it:
1. If a logo was uploaded, converts it to a base64 data URL
2. Posts `{ markText, logoUrl, niceClasses, goodsServices }` to `/api/search`
3. Navigates to `/results?searchId=...` passing the results in local state

### Results Page (`/results`)

Displays the search results as a ranked list. Each conflict card shows:
- The trademark name and owner
- Status badge (Active / Pending / Dead)
- Risk badge (High / Medium / Low)
- The trademark's **logo image** — loaded directly from `conflict.logoUrl` (a USPTO CDN URL), with the brand name as a letter-avatar fallback if the image fails to load or is missing
- Similarity score as a percentage
- Which pipeline found it (DB / RAG text / CLIP logo)
- A link to the USPTO record page

### Logo Display Fix

A previous bug always showed the letter avatar (first letter of the brand name) instead of the actual logo. The fix checks whether `conflict.logoUrl` is populated before deciding which to show:

```tsx
{conflict.logoUrl ? (
  <img
    src={conflict.logoUrl}
    alt={conflict.markText}
    className="w-full h-full object-contain"
    onError={(e) => { /* fall back to letter avatar on 404 */ }}
  />
) : (
  <span className="text-lg font-bold text-white">
    {conflict.markText?.[0]?.toUpperCase()}
  </span>
)}
```

---

## 10. Environment Variables

Stored in `.env.local` (never committed to git).

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@ep-plain-union...neon.tech/neondb?sslmode=require` |
| `AI_MICROSERVICE_URL` | URL of the Python ML service | `http://localhost:8000` |
| `CHROMA_URL` | URL of the ChromaDB instance | `http://127.0.0.1:8001` |
| `CHROMA_TENANT` | Chroma tenant name (default is fine) | `default-tenant` |
| `CHROMA_DATABASE` | Chroma database name (default is fine) | `default` |
| `OPENAI_API_KEY` | OpenAI key for LLM summaries (optional) | `sk-...` |

---

## 11. How a Search Actually Works — Step by Step

Let's trace exactly what happens when a user searches for `"apple computers"` in class 9 (Electronics/Software):

**Step 1 — Frontend → API**
```
POST /api/search
{ "markText": "apple computers", "niceClasses": [9] }
```

**Step 2 — API validates input**
- Length check: 15 chars ✓
- Nice class validation: [9] is 1–45 ✓

**Step 3 — Three searches fire in parallel**

*Search A: DB fuzzy/phonetic (via TrademarkSearchService)*
- Normalizes: `"apple computers"` → `"applecomputers"`
- Runs Soundex: `A142` and Metaphone codes
- SQL query: `WHERE mark_text_normalized ILIKE '%applecomputers%' OR mark_soundex = 'A142' OR nice_classes && ARRAY[9]`
- Returns ~50 nearest matches with metadata

*Search B: RAG text (via ragTrademarkAgent)*
- Sends `"apple computers"` to `POST http://localhost:8000/embed/text`
- Gets back: `[0.023, -0.41, 0.12, ...]` (768 floats)
- Queries Chroma `trademark-texts` collection: find top 20 vectors closest to that query vector
- Returns top 20 matches with distances

*Search C: CLIP logo search (via ragTrademarkAgent)*
- Only runs if the user uploaded a logo
- Sends logo to `POST http://localhost:8000/embed/image`
- Gets back: `[-0.12, 0.34, ...]` (512 floats)
- Queries Chroma `trademark-logos` collection: find top 15 closest logo vectors

**Step 4 — Merge results**
- Start with DB results (richest metadata)
- Add/boost with RAG text results
- Add/boost with CLIP logo results
- Deduplicate by `serialNumber`

**Step 5 — Risk scoring**
- Each conflict gets a similarity score (0–100%)
- Score ≥ 75 → High Risk
- Score 50–74 → Medium Risk
- Score < 50 → Low Risk

**Step 6 — Response**
```json
{
  "success": true,
  "results": [
    {
      "serialNumber": "75123456",
      "markText": "APPLE INC",
      "ownerName": "Apple Inc.",
      "status": "live",
      "similarityScore": 92,
      "riskLevel": "high",
      "logoUrl": "https://tsdr.uspto.gov/img/75123456/large",
      "niceClasses": [9]
    },
    ...
  ],
  "pipeline": {
    "dbResults": 35,
    "ragTextResults": 20,
    "clipLogoResults": 8
  }
}
```

---

## 12. The Logo Similarity Pipeline Explained

This is the most complex part of the system. Here is how it connects end-to-end:

```
USPTO database               Neon DB                 Chroma
(527K logos with URL)  →  logo_url column     →  trademark-logos
                                                  collection
                              ↓
                        seed-logo-embeddings.ts   (one-off batch job)
                              ↓ fetches each logo URL
                              ↓ sends to ML service /embed/image
                              ↓ gets 512d CLIP vector back
                              ↓ upserts to Chroma with serialNumber as ID
```

Then at search time:
```
User uploads logo
      ↓
rag-agent.ts embedImage()
      ↓ sends to ML service /embed/image
      ↓ gets 512d query vector
      ↓
Chroma trademark-logos collection
      ↓ nearest neighbor search
      ↓ returns 15 closest logo vectors + their metadata
      ↓ metadata contains { serial_number, mark_text, logo_url, owner_name }
      ↓
unified-trademark-search.ts mergeConflicts()
      ↓ looks up serialNumber in DB results for richer metadata
      ↓ or creates new conflict entry if not already found
      ↓
Results page
      ↓ shows <img src={logoUrl}> for each matching trademark
```

### The Critical ID Match

The key that connects the Chroma search result back to the DB record is the `serialNumber` (e.g. `"88000001"`). This is why the seed script must store the serial number as the Chroma document ID — not the database's internal `id` integer. The original seed bug stored `row.id` (e.g. `"42391"`) as the Chroma ID, which meant the search pipeline could never find a matching DB record since it looked up by serial number.

---

## 13. Key Design Decisions and Trade-offs

### Why Chroma instead of pgvector?

pgvector is a PostgreSQL extension that adds vector search to Postgres. We could have stored all embeddings in Neon itself. The reason for separate Chroma: Neon is serverless (cold starts) and we are storing 500K+ 768-dimensional vectors — that is a lot of data to put in a compute that sleeps. Chroma runs locally, never sleeps, and is purpose-built for vector search so it is faster.

### Why a Python microservice instead of running ML in Node.js?

The best AI libraries (PyTorch, sentence-transformers, open_clip) are Python-only. Node.js has no equivalent of `sentence-transformers` or `open_clip`. Calling a local Python HTTP service from Node.js is the standard pattern for this.

### Why 15 concurrent embedding workers?

Pure trial and error. Each embed request takes ~200-500ms. With 1 worker: 100 logos × 350ms = 35 seconds per batch. With 15 workers: 100 logos / 15 × 350ms ≈ 2.3 seconds per batch. More workers would risk overloading the ML service or hitting rate limits. 15 was the sweet spot found in testing.

### Why file checkpointing vs database checkpointing?

Storing checkpoint state in a file (`/tmp/seed-logo-checkpoint.json`) is simpler, faster (no DB write on each batch), and works even when the DB is temporarily unavailable. The downside is it only works on one machine — but the seed only ever runs on one machine.

---

## 14. How to Run Everything

### Prerequisites
- Node.js 20+, pnpm
- Python 3.10+
- Docker (optional, for ChromaDB)

### Step 1 — Install dependencies
```bash
pnpm install
pip install -r ai-microservice/requirements.txt
```

### Step 2 — Set up environment
```bash
cp .env.example .env.local
# Fill in DATABASE_URL (Neon), OPENAI_API_KEY (optional)
```

### Step 3 — Start ChromaDB
```bash
source chroma-venv/bin/activate
chroma run --path ./chroma_data --port 8001
```

### Step 4 — Start the AI microservice
```bash
cd ai-microservice
source venv-py310/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Step 5 — Start the Next.js app
```bash
TURBOPACK=0 npx next dev --port 3001
```

### Step 6 — Seed logos (one-off, takes ~8 hours for all 527K)
```bash
npx tsx scripts/seed-logo-embeddings.ts
# Safe to kill and restart — uses /tmp/seed-logo-checkpoint.json to resume
```

### Step 7 — Open the app
Go to `http://localhost:3001/search`

### Checking Status
```bash
# Check all services
curl http://localhost:8000/health        # ML service
curl http://127.0.0.1:8001/api/v2/heartbeat  # Chroma
curl -o /dev/null -w "%{http_code}" http://localhost:3001/  # Next.js

# Check seed progress
tail -5 /tmp/seed-logos6.log
cat /tmp/seed-logo-checkpoint.json
```
