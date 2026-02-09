# Trademark Clearance & Availability Checker

A self-service tool for **comprehensive trademark clearance searches** and conflict risk assessment. Aimed at solo founders, SaaS builders, designers, and small e-commerce brands who want to check proposed marks before filing.

**This is not legal advice.** The tool helps you gather information and prepare data to share with a trademark attorney for final clearance.

## Features

- **Federal (USPTO) search** – Text similarity, phonetic (Soundex), and partial matches against a database of federal marks; optional live status verification via [USPTO TSDR](https://tsdr.uspto.gov/).
- **Domain availability** – Checks common TLDs (.com, .net, .org, .io, .co, .app) via DNS.
- **Social handles** – Links to check Twitter/X, Instagram, Facebook, LinkedIn, TikTok, YouTube.
- **Common law** – Optional web search (Google Custom Search API) plus manual search links (Google, LinkedIn, Crunchbase).
- **Risk assessment** – Similarity score (0–100), risk level (low/medium/high), and short explanation per conflict.
- **Evidence links** – Each conflict links to USPTO TSDR for current status and documents.
- **Alternative suggestions** – When risk is high, suggests alternative names (e.g. with suffix/prefix) to consider.
- **Exportable PDF report** – Single report with summary, conflicts, domains, common law notes, alternatives, and a clear **disclaimer** suitable for sharing with an attorney.

## Getting started

### 1. Install and env

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

- **`DATABASE_URL`** (required) – PostgreSQL connection string.
- **`GOOGLE_API_KEY`** and **`GOOGLE_SEARCH_ENGINE_ID`** (optional) – For common-law web search; see [Google Custom Search](https://developers.google.com/custom-search/v1/overview).
- **`UPSTASH_REDIS_REST_URL`** / **`UPSTASH_REDIS_REST_TOKEN`** (optional) – For server-side cache; in-memory cache is used if not set.

### 2. Database and production data

```bash
npm run db:push
npm run setup:real-data
```

**⚠️ IMPORTANT: Clear synthetic data and import REAL USPTO data before production:**

- **`setup:real-data`** (NEW) – **Quick one-command setup**: Clears synthetic sample data and downloads/imports real USPTO trademark data (~1-2K records). This is the recommended starting point.
- **`data:import`** (production) – Imports **real** USPTO federal trademark data from official bulk XML. By default this downloads one daily file from [USPTO Bulk Data](https://bulkdata.uspto.gov/data/trademark/dailyxml/applications/). You can pass a specific file or URL:
  - `npm run data:import -- --url https://bulkdata.uspto.gov/data/trademark/dailyxml/applications/apc250207.zip`
  - `npm run data:import -- --file ./path/to/downloaded.zip` or `--file ./path/to/file.xml`
  - `npm run data:import -- --limit 10000` to cap how many records are tested.
- For a **full backfile** (100K+ records), use the [Trademark Annual XML](https://developer.uspto.gov/product/trademark-annual-xml-applications) (multiple ZIPs); run `data:import --file <path>` for each ZIP after downloading.
- **`db:seed`** – Inserts a tiny set of sample marks **for local dev only** (e.g. to test the UI without running an import). Not for production - use `setup:real-data` instead.
- **`seed:100k`** – Generates synthetic/fake data for load testing only. Do **not** use for production.

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), go to **Search**, complete the steps (business info, mark text, Nice classes, review), and run the search. Results show federal conflicts, domains, social links, common-law summary, and alternatives when risk is high. Use **Export PDF report** to download a report you can share with an attorney.

## Production data (no synthetic data)

- **Federal marks** – The app uses **only real USPTO data** in production. Run `npm run data:import` to load from [USPTO bulk data](https://bulkdata.uspto.gov/data/trademark/dailyxml/applications/) (daily ZIPs) or the [annual XML backfile](https://developer.uspto.gov/product/trademark-annual-xml-applications). The import script parses the official XML, maps status/classification, and upserts into `uspto_trademarks` (with normalized mark, Soundex, Nice classes, TSDR link). There is no public TESS “search API”; the app searches your DB and optionally **verifies** top results via the public [TSDR API](https://tsdr.uspto.gov/) by serial number.
- **Domain checks** – Live DNS (Google DNS) in `lib/domain-check.ts`.
- **Common law** – Optional Google Custom Search when keys are set, plus manual search links.

## API

- **`POST /api/clearance`** – Full clearance: federal search + domain + social + common law + alternatives. Body: `{ markText, niceClasses?, includeUSPTOVerification? }`. Use this for the main search flow.
- **`POST /api/search`** – Federal (USPTO) search only. Body: `{ markText, niceClasses?, includeUSPTOVerification?, forceRefresh? }`.
- **`POST /api/domain-check`** – Domain availability only. Body: `{ markText }`.
- **`POST /api/report`** – Generate PDF. Body: same shape as the clearance result (query, summary, results, domainResults, socialResults, commonLaw, alternatives, etc.).

## Scope

- **In scope:** US federal marks (DB + TSDR verification), domain check, social handles, common-law hints, risk scoring, alternatives, PDF report with disclaimer.
- **Out of scope (v1):** No auto-filing; no EU/UK/Madrid; no advanced image/3D logo analysis.

## Disclaimer

This tool is for **informational purposes only** and does **not** constitute legal advice. Always consult a qualified trademark attorney for final clearance before filing.
