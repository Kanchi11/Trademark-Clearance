# RAG Pipeline: ChromaDB + CLIP + ML Microservice

This document describes the **RAG (Retrieval-Augmented Generation)** pipeline for trademark clearance: ML microservice (text + image embeddings, LLM), ChromaDB for vector search, and how it plugs into the app.

## Overview

- **Text embeddings** – Mark text is embedded via the ML microservice (e.g. Sentence Transformers, 768d).
- **Image embeddings (CLIP)** – Logo images are embedded via the same microservice (e.g. CLIP, 512d).
- **ChromaDB** – Stores two collections:
  - `trademark-texts`: text embeddings + metadata (serial number, mark text, classes, etc.).
  - `trademark-logos`: logo image embeddings + metadata.
- **Retrieval** – Query text/logo is embedded → Chroma returns nearest neighbors (similar marks/logos).
- **LLM synthesis** – Microservice LLM summarizes retrieved evidence into risk/next steps.

## Components

### 1. ML Microservice

Single service that exposes:

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/embed/text` | POST | `{ "texts": string[] }` | `{ "embeddings": number[][] }` |
| `/embed/image` | POST | `multipart/form-data` with `file` (image) | `{ "embedding": number[] }` |
| `/llm/completion` | POST | `{ "prompt": string, "max_tokens"?: number }` | `{ "completion": string }` |

- **Text**: e.g. Sentence Transformers (`all-MiniLM-L6-v2` or similar) → 384/768 dimensions to match Chroma collection.
- **Image**: e.g. CLIP (ViT-B/32 or similar) → 512 dimensions for logo collection.
- **LLM**: e.g. Llama.cpp, GPT4All, or OpenAI for synthesis.

**Env:** `AI_MICROSERVICE_URL` (default `http://localhost:8000`).

**Run locally:** See [ml-service/README.md](../ml-service/README.md). To run Chroma + ML service together: `docker compose up -d` (Chroma on port 8001, ML on 8000).

### 2. ChromaDB

- **Chroma URL**: `CHROMA_URL` (e.g. `http://localhost:8001` or Chroma Cloud).
- **Auth**: `CHROMA_API_KEY` (optional, for Chroma Cloud).
- **Tenant / Database**: `CHROMA_TENANT`, `CHROMA_DATABASE` (optional; defaults used if unset).

**Collections:**

- **trademark-texts**  
  - Embedding dimension: **768** (or whatever your text model outputs).  
  - Documents: mark text (or serial + mark).  
  - Metadatas: e.g. `serial_number`, `mark_text`, `nice_classes`, `owner_name`, `status`.

- **trademark-logos**  
  - Embedding dimension: **512** (or whatever your CLIP model outputs).  
  - Documents: placeholder or logo URL.  
  - Metadatas: e.g. `serial_number`, `mark_text`, `logo_url`.

**Populating Chroma:**

- **From PostgreSQL (Neon/DB):**
  - `scripts/neon-to-chroma.ts` – exports trademark rows, calls microservice for text embeddings, upserts into Chroma `trademark-texts`.
  - `scripts/neon-logos-to-chroma.ts` – exports logo URLs, calls microservice for image embeddings, upserts into Chroma `trademark-logos`.
- **Checkpointing:** `import-checkpoint.json` (if used) for resumable runs.

### 3. RAG Agent (`lib/rag-agent.ts`)

1. Embed `markText` via microservice → text embedding.
2. If `logoUrl` is provided, embed image via microservice → image embedding.
3. Query Chroma `trademark-texts` with text embedding → similar marks.
4. If image embedding exists, query Chroma `trademark-logos` → similar logos.
5. Call microservice LLM with retrieved evidence → summary/risk/next steps.
6. Return `{ markText, logoUrl, similarMarks, similarLogos, summary }`.

Chroma API used: **v2** (tenants/databases/collections). For collection by name, the code may resolve name → collection ID (or use a fixed UUID for `trademark-texts`).

### 4. Clearance API and Modes

**Env:** `RAG_AGENT_ENABLED=true` or request body `useRagAgent: true`.

- **When RAG is enabled and microservice/Chroma are reachable:**  
  The clearance API calls `ragTrademarkAgent({ markText, logoUrl })`, then normalizes the result into the same response shape as the legacy pipeline (results, summary, domains, social, common law, disclaimer, etc.) so the existing **results page and PDF** work unchanged.

- **When RAG is disabled or fails:**  
  Legacy pipeline runs: PostgreSQL search (similarity + risk), domain check, social links, common law, optional perceptual-hash logo comparison, alternatives. Same response shape.

So the app supports:

- **Legacy only** – no RAG env; uses DB + domain/social/common law.
- **RAG only** – RAG enabled, microservice + Chroma configured; retrieval + LLM drive the “conflicts” and summary; domain/social/common law can still be appended for the same UI.
- **Hybrid** – e.g. RAG for federal + logo similarity; legacy for domain/social/common law.

## Environment Summary

| Variable | Purpose |
|----------|---------|
| `AI_MICROSERVICE_URL` | ML microservice base URL (embed + LLM). |
| `CHROMA_URL` | Chroma server (local or Cloud). |
| `CHROMA_API_KEY` | Chroma Cloud auth (optional). |
| `CHROMA_TENANT` | Chroma tenant (optional). |
| `CHROMA_DATABASE` | Chroma database (optional). |
| `RAG_AGENT_ENABLED` | If `true`, clearance uses RAG when request doesn’t force legacy. |

## Python / chroma-venv (CLIP, Chroma)

You have a `chroma-venv` with Chroma and embedding-related packages (e.g. open_clip, sentence_transformer). Typical use:

- Run the **ML microservice** (e.g. FastAPI) that:
  - Loads a text embedding model and a CLIP model.
  - Exposes `/embed/text`, `/embed/image`, `/llm/completion` as above.
- Optionally run **Chroma** locally (or use Chroma Cloud) and point the app at it with `CHROMA_URL` (and `CHROMA_API_KEY` if needed).
- Run the **Node** scripts (`neon-to-chroma`, `neon-logos-to-chroma`) to backfill Chroma from your DB using that microservice.

## Data Flow (RAG path)

1. User submits **mark text** + optional **logo** + Nice classes (and optionally goods/services).
2. **Clearance API** checks cache; if RAG enabled, calls **RAG agent**.
3. **RAG agent**:
   - Embeds text (and logo) via **ML microservice**.
   - Queries **Chroma** (`trademark-texts`, and `trademark-logos` if logo provided).
   - Gets **LLM** summary from microservice.
4. API maps RAG output (+ optional domain/social/common law) into the **unified response**.
5. **Results page** and **PDF** consume that response as before.

This keeps the UI and report format unchanged while allowing the backend to be driven by the RAG pipeline (Chroma + CLIP + LLM) when you use it.
