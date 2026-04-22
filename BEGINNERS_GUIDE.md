 # Understanding the Trademark Clearance App — A Beginner's Guide

*Written like you're learning to code for the very first time. No experience needed.*

---

## Before We Start — What Even Is This App?

Imagine you invented a new energy drink and you want to call it **"Thunder Bolt"**. Before you print 10,000 cans and spend all your money, you need to check: does someone ELSE already have a brand called "Thunder Bolt"? Because if they do, they can sue you and force you to throw away all your cans.

That check is called a **trademark clearance search**.

Big law firms charge thousands of dollars to do this by hand. This app does it automatically in a few seconds using code, a database of 500,000+ real trademarks from the US government, and artificial intelligence.

That's what we built. Now let's understand every single piece of it.

---

## Part 1 — What Is Code and What Does It Do?

Before we even talk about this specific app, let's make sure we understand some basics.

### What is a program?

A program is a set of instructions you give to a computer, written in a special language the computer can understand. Instead of saying "hey computer, find me similar brand names", you write it in a programming language like TypeScript or Python.

### What languages does this app use?

This app uses **three** languages:

| Language | Where | What it does |
|---|---|---|
| **TypeScript** | Most of the app | Runs the website, talks to the database, handles searches |
| **Python** | `ai-microservice/` folder | Runs the AI models that understand images and text |
| **SQL** | Inside TypeScript code | Asks questions to the database ("give me all trademarks starting with A") |

### Why multiple languages?

Just like how you use a hammer to hammer nails and scissors to cut paper — different tools are better for different jobs. Python has amazing AI libraries (pre-built AI code you can use). TypeScript is great for building websites and web servers. SQL is the universal language for databases.

---

## Part 2 — The Big Picture (How Everything Connects)

Think of the app like a restaurant:

- **The waiter** = the website (`app/search/page.tsx`) — takes your order (your brand name / logo)
- **The kitchen manager** = the search API (`app/api/search/route.ts`) — receives the order and tells the cooks what to make
- **Three cooks** = three different search methods running at the same time
  - Cook 1: looks up brand names in the database
  - Cook 2: uses AI to find names that *mean* the same thing
  - Cook 3: uses AI to find logos that *look* the same
- **The database** = Neon (PostgreSQL) — the giant filing cabinet with 500,000+ trademark records
- **The AI brain** = the Python microservice — the specialist who understands images and language
- **The memory library** = ChromaDB — stores AI "memories" of all the logos and names so searches are fast

Here is a diagram showing how they talk to each other:

```
YOU (the user)
    |
    | Type brand name + upload logo in the browser
    |
    v
NEXT.JS WEBSITE (localhost:3001)
    |
    | "Hey API, search for THUNDER BOLT in class 32 (beverages)"
    |
    v
SEARCH API (app/api/search/route.ts)
    |
    |--- fires all three at the same time (parallel) ---+
    |                                                    |
    v                                                    v
NEON DATABASE                                    RAG AGENT (lib/rag-agent.ts)
(real PostgreSQL)                                        |
- finds names that                                       |--- TEXT SEARCH
  sound like yours                                       |    "find names that
- finds names that                                       |     mean the same"
  are spelled similarly                                  |
                                                         |--- LOGO SEARCH
                                                         |    "find logos that
                                                         |     look the same"
                                                         |
                                                         v
                                                   AI MICROSERVICE (Python, port 8000)
                                                   - converts text → numbers
                                                   - converts images → numbers
                                                         |
                                                         v
                                                   CHROMADB (port 8001)
                                                   - finds the closest matching numbers
                                                   - returns the most similar trademarks

    |                                                    |
    |<------- both results come back -------------------+|
    |
    v
MERGE + RANK RESULTS
- combine all results from all three searches
- remove duplicates
- assign risk scores (High / Medium / Low)
    |
    v
BACK TO YOU
"Here are 15 trademarks similar to THUNDER BOLT. 3 are High Risk."
```

---

## Part 3 — The Database (The Filing Cabinet)

**Files:** `db/schema.ts`, `db/index.ts`

### What is a database?

A database is like a giant Excel spreadsheet, but much more powerful. Instead of "spreadsheet", we call it a **table**. Instead of "rows", we call them **records**. Instead of "columns", we call them **fields** or **columns**.

### The main table: `uspto_trademarks`

This table has one row for every trademark. Right now it has **527,612 rows** — that's half a million brands.

Here is what each row looks like. Think of it as a filing card for one trademark:

```
┌────────────────────────────────────────────────────────────┐
│  TRADEMARK FILING CARD                                     │
├──────────────────┬─────────────────────────────────────────┤
│ serial_number    │ 88000001                                │  ← unique ID number given by USPTO
│ mark_text        │ APPLE                                   │  ← the brand name
│ status           │ live                                    │  ← is it still active?
│ filing_date      │ 2018-07-25                              │  ← when they registered it
│ owner_name       │ Apple Inc.                              │  ← who owns it
│ nice_classes     │ [9, 42]                                 │  ← what industry (9=electronics, 42=software)
│ goods_services   │ "Computer hardware, software..."       │  ← what products it covers
│ logo_url         │ https://tsdr.uspto.gov/img/88000001/.. │  ← web address of their logo image
└──────────────────┴─────────────────────────────────────────┘
```

### What are "nice classes"?

The entire world of products and services is divided into 45 categories, called **Nice Classes** (named after Nice, France, where the system was created). Examples:

- Class 9 = Electronics, software, apps
- Class 25 = Clothing, shoes
- Class 32 = Beers, water, energy drinks
- Class 42 = Tech services, software as a service (SaaS)

This matters because "APPLE" in class 9 (electronics) and "APPLE" in class 31 (fruits/agriculture) are two completely different trademarks. The apple fruit company and Apple Inc. can both use "APPLE" because they're in different industries.

### How does the code read from the database?

In this app we use something called **Drizzle ORM**. ORM stands for Object-Relational Mapper. That's a fancy term for "a tool that lets you write TypeScript code instead of raw database SQL to fetch your data."

Without Drizzle, you'd write raw SQL like this:
```sql
SELECT serial_number, mark_text FROM uspto_trademarks
WHERE logo_url IS NOT NULL
ORDER BY id
LIMIT 100
OFFSET 500;
```

With Drizzle, you write the same thing in TypeScript like this:
```typescript
const rows = await db
  .select({ serialNumber: usptoTrademarks.serialNumber, markText: usptoTrademarks.markText })
  .from(usptoTrademarks)
  .where(isNotNull(usptoTrademarks.logoUrl))
  .orderBy(usptoTrademarks.id)
  .limit(100)
  .offset(500);
```

Both do the exact same thing — they just look different. Drizzle's version is easier to read and less error-prone for TypeScript developers.

### What is Neon?

Neon is the company that hosts our database in the cloud. Think of it like Google Drive — instead of keeping the database file on your own computer, it lives on Neon's servers and your code connects to it over the internet.

### The Cold-Start Problem (and the Fix)

Here's a funny quirk about Neon: it's "serverless", which means when nobody has used the database for a while, it goes to **sleep** to save money. When you try to connect, it takes 10-60 seconds to **wake up**.

The old way of connecting (via a protocol called TCP) would give up after 30 seconds and throw an error: `CONNECT_TIMEOUT`. It's like calling your friend and hanging up after 15 rings even though they're running to the phone.

The new way uses something called the **HTTP driver** (`@neondatabase/serverless`). HTTP is patient — it sends a request and waits for however long it takes to get an answer. It's like sending your friend a text message instead of calling — they can reply whenever they're ready.

```typescript
// OLD WAY (TCP) — gives up too fast
const client = postgres(process.env.DATABASE_URL);  // times out during cold start

// NEW WAY (HTTP) — waits patiently
const httpSql = neon(process.env.DATABASE_URL);     // patient, works even during cold start
```

---

## Part 4 — The AI Microservice (The Smart Assistant)

**File:** `ai-microservice/main.py`

### What is a microservice?

A microservice is a small, separate program that does one specific job. Instead of one giant program that does everything, you break the work into smaller programs that talk to each other. Like a restaurant kitchen with separate stations: one person makes salads, another makes pasta, another makes dessert — they don't all try to do everything.

Our AI microservice's one job is: **"Convert text and images into numbers that represent their meaning."**

### Why do we need to convert things into numbers?

This is the fundamental insight behind modern AI: **computers can compare numbers, but they can't directly compare meaning**.

If I ask a computer "is `APPLE` similar to `MACINTOSH`?", it doesn't understand meaning. It can only compare characters: A-P-P-L-E vs M-A-C-I-N-T-O-S-H — completely different!

But if we convert both words into lists of numbers that **represent their meaning**, then similar words will produce similar numbers. "APPLE" and "MACINTOSH" (a classic apple variety AND an old Apple computer) would both produce number lists close to each other.

These lists of numbers are called **vectors** or **embeddings**.

### What is a vector?

A vector is just a list of numbers. Like coordinates on a map.

On a regular 2D map, every point has 2 coordinates: `(x, y)`. Example: `(40.7128, -74.0060)` is New York City.

An embedding vector works the same way, except instead of 2 coordinates, it has **768 coordinates** (for text) or **512 coordinates** (for images). Every word, sentence, or image gets its own unique set of coordinates in this high-dimensional space.

Words/images with similar meaning end up with coordinates close to each other. Words with completely different meanings end up far apart.

```
Imagine a 2D map of words (simplified):
                       
         [FRUIT]      [COMPANY]
    "orange"  "apple"     "Apple Inc"  "Microsoft"
                  \       /
                  [close together because related]
              
              far away: "hammer", "skateboard"
```

In reality it's 768 dimensions not 2, but the idea is the same.

### The Two AI Models

The microservice uses two different AI models:

**Model 1: `all-mpnet-base-v2` (for text → 768 numbers)**

This model was trained by reading billions of sentences on the internet. It learned that "APPLE" and "MACINTOSH" are related, that "Nike" and "shoe brand" belong together, etc. When you give it a word, it outputs 768 numbers that encode its meaning.

**Model 2: CLIP `ViT-B/32` (for images → 512 numbers)**

CLIP was created by OpenAI and trained on millions of image+caption pairs. It learned to associate visual features with concepts. A bitten apple logo and a rounded rectangle logo would produce different numbers. Two swoosh-like logos would produce similar numbers. Give it an image, it outputs 512 numbers.

### The API Endpoints

An API endpoint is like a doorbell for your program. Someone rings it (sends an HTTP request), and the program does something and sends back an answer.

The microservice has these doorbells:

```
GET  /health         → "I'm alive and working"
POST /embed/text     → Send me text → I give you a 768-number list
POST /embed/image    → Send me an image file → I give you a 512-number list
POST /llm/complete   → Send me a prompt → I give you a text summary from GPT
```

### Lazy Loading — Being Efficient

AI models are huge — about 500MB each. Loading them takes 10-20 seconds. If we loaded both models every time the program starts, startup takes forever. Instead, we use **lazy loading**: only load the model when it's actually needed for the first time.

```python
_text_model = None   # empty box at the start

def get_text_model():
    global _text_model
    if _text_model is None:                           # first time: box is empty
        _text_model = SentenceTransformer("...")      # load the model (takes 10 seconds)
    return _text_model                                # next time: box already has the model, instant!
```

After the first request, the model stays in memory (RAM) and all later requests get fast responses.

---

## Part 5 — ChromaDB (The Memory Library)

**Running at:** `http://127.0.0.1:8001`

### What is ChromaDB?

ChromaDB is a special kind of database called a **vector database**. Regular databases (like Neon) are great at finding exact matches: "give me all trademarks where the name is exactly APPLE". But they're terrible at "give me all trademarks whose name is *similar* to APPLE."

A vector database is built specifically for similarity searches. It stores all those 768-number and 512-number lists and can find the closest ones to your query lightning fast.

### The Two Collections (Like Two Separate Libraries)

ChromaDB organizes vectors into **collections** — think of them as separate rooms in a library.

**Room 1: `trademark-texts`**
- Contains the text embeddings (768 numbers each) of every trademark name
- Used to search: "find brands that mean the same as mine"

**Room 2: `trademark-logos`**
- Contains the image embeddings (512 numbers each) of every trademark logo
- Used to search: "find logos that look like mine"

These two rooms must stay separate because a text embedding and an image embedding are completely different spaces — they use different coordinate systems.

### How a Vector Search Works (Step by Step)

Imagine you're looking for brands similar to "THUNDER BOLT":

1. "THUNDER BOLT" → sent to AI microservice → comes back as 768 numbers: `[0.12, -0.45, 0.88, 0.03, ...]`
2. ChromaDB looks at ALL 500,000 trademark vectors stored in `trademark-texts`
3. For each stored vector, ChromaDB calculates the **distance** from your query vector
4. Distance 0 = identical meaning. Distance 2 = completely opposite.
5. ChromaDB returns the 20 closest ones (smallest distances)

This whole process takes milliseconds even with 500,000 vectors, because ChromaDB uses clever math tricks (like approximate nearest-neighbor algorithms) to avoid checking every single one.

### Distance → Similarity Score

The distances that ChromaDB returns are small numbers. We convert them into human-friendly percentages:

```typescript
function chromaDistanceToScore(distance: number): number {
  // distance 0   = same thing = 100% similar
  // distance 0.5 = kinda similar = 75% similar
  // distance 1.0 = different = 50% similar
  // distance 2.0 = opposite = 0% similar
  return Math.round((1 - distance / 2) * 100);
}
```

So if ChromaDB says "distance: 0.4", we show the user "80% similar". 

### Important Bug Fix: `localhost` vs `127.0.0.1`

There was a tricky bug here. The code was using `http://localhost:8001` to connect to ChromaDB. On older computers `localhost` meant `127.0.0.1` (your own computer's address). But on modern Macs, `localhost` actually resolves to `::1` (an IPv6 address). ChromaDB was only listening on the IPv4 address `127.0.0.1`.

The fix: always use `http://127.0.0.1:8001` to be explicit. Never rely on `localhost` if you specifically need IPv4.

---

## Part 6 — The Seed Scripts (Filling Up ChromaDB)

**Files:** `scripts/neon-logos-to-chroma.ts`, `scripts/seed-logo-embeddings.ts`

### What does "seeding" mean?

When you plant a garden, you first put seeds in the ground. Before the garden can grow and give you vegetables, you have to do that initial planting work.

Our ChromaDB `trademark-logos` room starts out empty. Before logo similarity search can work, we need to:
1. Go through every trademark in Neon that has a logo URL
2. Download each logo image
3. Send it to the AI microservice to convert it to 512 numbers
4. Store those 512 numbers in ChromaDB

This initial filling process is called **seeding**. We only need to do it once (or when new trademarks are added).

There are 527,612 trademarks with logos. Seeding all of them takes about **8 hours**.

### The Original Seed Script: `neon-logos-to-chroma.ts`

This was the first version. It works, but it had two problems:

**Problem 1: No checkpointing**
If it ran for 4 hours and then crashed (computer dies, internet cuts out, anything), you'd have to start completely from scratch. 4 hours of work lost.

**Problem 2: Wrong ID**
It stored the database's internal `id` number (like `42391`) as the Chroma ID. But when the search pipeline later tries to look up "did we already embed this trademark?", it looks up by `serial_number` (like `"88000001"`). These are two completely different numbers, so it could never find the match. Logo similarity was broken.

### The Better Seed Script: `seed-logo-embeddings.ts`

This is the rewritten version that fixes both problems. Let's go through every important part.

#### Part A: The Checkpoint System

A checkpoint is like a save point in a video game. Every time you beat a level, the game saves your progress so if you die, you don't start from the very beginning again.

```typescript
const CKPT_FILE = '/tmp/seed-logo-checkpoint.json';

// This defines what gets saved
interface Ckpt {
  dbOffset: number;        // how many rows we've processed so far
  totalImported: number;   // how many logos are now in ChromaDB
  totalFailed: number;     // how many images we couldn't download (403 errors)
  totalProcessed: number;  // total records checked
  savedAt: string;         // when we last saved (date and time)
}
```

After processing every batch of 100 logos, the script writes this info to a file on disk (`/tmp/seed-logo-checkpoint.json`). If the script crashes and you restart it, it reads this file and continues from where it left off.

```typescript
function loadCkpt(): Ckpt | null {
  try {
    // existsSync = "does this file exist?"
    // readFileSync = "read the contents of this file"
    // JSON.parse = "convert the text in the file back into a JavaScript object"
    return existsSync(CKPT_FILE) ? JSON.parse(readFileSync(CKPT_FILE, 'utf8')) : null;
  } catch {
    return null; // if anything goes wrong, just start fresh
  }
}

function saveCkpt(c: Omit<Ckpt, 'savedAt'>) {
  try {
    // JSON.stringify = "convert the JavaScript object into text"
    // writeFileSync = "write this text into a file"
    writeFileSync(CKPT_FILE, JSON.stringify({ ...c, savedAt: new Date().toISOString() }, null, 2));
  } catch {}
}
```

#### Part B: Getting the Collection ID

ChromaDB identifies collections not by name but by a **UUID** (Universally Unique Identifier), which is a long string like `c95e78dd-9540-40ba-9d78-0baa1664d0c8`. We need to ask ChromaDB "what's the UUID for the collection called trademark-logos?"

```typescript
async function getOrCreateCollection(name: string, dim: number): Promise<string> {
  // 1. Ask Chroma for a list of all collections
  const listUrl = `${CHROMA_URL}/api/v2/tenants/${TENANT}/databases/${DB_NAME}/collections?limit=100&offset=0`;
  const res = await fetch(listUrl, { headers: { 'Content-Type': 'application/json' } });
  const data = await res.json();
  
  // 2. Find the one with our name
  const collections = Array.isArray(data) ? data : (data?.collections ?? []);
  const found = collections.find((c: any) => c.name === name);
  if (found) return found.id;   // already exists, return its UUID
  
  // 3. If not found, create it
  const createRes = await fetch(createUrl, {
    method: 'POST',
    body: JSON.stringify({ name, embedding_dimension: dim }) // dim=512 for images
  });
  const created = await createRes.json();
  return created.id;  // return the new UUID
}
```

#### Part C: Downloading and Embedding One Logo

This function downloads a logo from the USPTO website and asks the AI microservice to convert it to 512 numbers:

```typescript
async function embedImage(logoUrl: string): Promise<number[] | null> {
  // Step 1: Download the logo image
  const imgRes = await fetch(logoUrl, {
    headers: {
      // We pretend to be a Chrome browser — USPTO blocks bot requests
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X...) Chrome/122.0.0.0...',
    },
    timeout: 6_000,  // give up after 6 seconds — don't wait forever
  });
  
  if (!imgRes.ok) return null;  // if the download failed (e.g. 403 Forbidden), give up
  
  const imgBuf = Buffer.from(await imgRes.arrayBuffer()); // convert to raw bytes
  if (imgBuf.length < 100) return null;  // skip tiny/broken images
  
  // Step 2: Send the image to our AI microservice
  const form = new FormData();  // FormData is how you send files over HTTP
  form.append('file', imgBuf, { filename: 'logo.png', contentType: 'image/png' });
  
  const embedRes = await fetch(`${AI_URL}/embed/image`, {
    method: 'POST',
    headers: form.getHeaders(),
    body: form,
    timeout: 20_000,  // embedding can take up to 20 seconds for complex images
  });
  
  if (!embedRes.ok) return null;
  
  // Step 3: Get the 512 numbers back
  const data = await embedRes.json();
  const emb = data?.embedding;
  return Array.isArray(emb) ? emb : null;  // return the list of 512 floats
}
```

#### Part D: Running Multiple Downloads at Once (Concurrency)

Downloading 100 logos one-by-one would take about 6 minutes per batch. Instead, we download 15 at the same time (**concurrently**). This is like having 15 cashiers at a grocery store instead of 1.

```typescript
const CONCURRENCY = 15;  // 15 simultaneous downloads

// pLimit is our custom function that runs tasks with a limit
async function pLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;
  
  // Create "limit" number of workers
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;           // grab the next task
      results[i] = await tasks[i]();  // do the task
    }
    // when tasks run out, this worker is done
  }
  
  // Start all workers at the same time and wait for all to finish
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}
```

#### Part E: Upserting to ChromaDB

"Upsert" = "Update if exists, Insert if not." Safe to run multiple times — won't create duplicates.

```typescript
async function upsertToChroma(collectionId, items) {
  const upsertUrl = `${CHROMA_URL}/api/v2/.../${collectionId}/upsert`;
  
  await fetch(upsertUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ids: items.map(v => v.serialNumber),         // "88000001", "88000002", ...
      embeddings: items.map(v => v.embedding),     // [[0.12, -0.45, ...], [...], ...]
      documents: items.map(v => v.markText),       // "APPLE", "THUNDER BOLT", ...
      metadatas: items.map(v => ({                 // extra info stored alongside vectors
        serial_number: v.serialNumber,
        mark_text: v.markText,
        owner_name: v.ownerName,
        logo_url: v.logoUrl,
      })),
    }),
  });
}
```

Notice how `ids` uses `v.serialNumber` — THIS is the fix to the original bug. The ID stored in Chroma must match what the search pipeline looks up by.

#### Part F: The Main Loop

The `main()` function ties everything together. Here's a simplified version of what it does:

```
1. Check if checkpoint file exists → if yes, resume from saved offset
2. Make sure the AI microservice is alive
3. Connect to Neon database (using the patient HTTP driver)
4. Get or create the trademark-logos Chroma collection
5. Count how many trademarks have logos (527,612)
6. Loop:
   a. Fetch next 100 trademarks from Neon (starting at dbOffset)
   b. Check Chroma: which of these 100 are already embedded? Skip those.
   c. For the remaining ones: download logo + embed (15 at a time)
   d. Upload successful embeddings to Chroma
   e. Save checkpoint to file
   f. Print progress: [8.4%] +70/100 | total:31000 | ETA:37h
   g. Move dbOffset forward by 100
   h. Repeat until all 527,612 are done
7. Print "Done!" and delete the checkpoint file
```

#### Why Do 30% of Logos Fail?

The USPTO website blocks automated scripts. When our script downloads a logo, the server sees it's not a human browser and returns **HTTP 403 Forbidden** — "I won't let you download this." About 30% of all logos get blocked this way. We just skip those and continue.

---

## Part 7 — The RAG Agent (The Smart Searcher)

**File:** `lib/rag-agent.ts`

RAG stands for **Retrieval-Augmented Generation**. That's a mouthful, so let's break it down:
- **Retrieval** = finding relevant information (searching ChromaDB for similar trademarks)
- **Augmented** = adding that information as context
- **Generation** = generating a natural-language answer using an LLM (like GPT)

In simple terms: search for relevant stuff, then have AI write a summary about what it found.

### What Does `ragTrademarkAgent()` Do?

It takes your brand name (and optionally your logo) and finds similar trademarks using AI. Here's the full flow:

**For text search:**
```
Your input: "THUNDER BOLT"
    ↓
Send to AI microservice → POST /embed/text
    ↓
Get back: [0.12, -0.45, 0.88, ...] (768 numbers)
    ↓
Ask ChromaDB trademark-texts: "find 20 vectors closest to this"
    ↓
Get back: [{ "BOLT ENERGY", distance: 0.3 }, { "THUNDERSTRUCK", distance: 0.5 }, ...]
    ↓
Return these similar trademarks with similarity scores
```

**For logo search (if user uploaded a logo):**
```
Your logo: uploaded PNG file
    ↓
If it's a file upload: it comes as a "data URL" (base64 encoded text starting with "data:image/png;base64,...")
If it's a web URL: download it first
    ↓
Send to AI microservice → POST /embed/image
    ↓
Get back: [-0.12, 0.34, ...] (512 numbers)
    ↓
Ask ChromaDB trademark-logos: "find 15 vectors closest to this"
    ↓
Get back: [{ "LIGHTNING BOLT logo", distance: 0.2 }, ...]
    ↓
Return these visually similar trademark logos with similarity scores
```

### The LLM Summary

After finding similar trademarks, the agent passes them all to GPT and asks:

> "Based on these similar existing trademarks, summarize the risk for someone trying to register THUNDER BOLT in the beverage industry."

GPT reads the list and writes a paragraph like:
> "There is moderate risk. BOLT ENERGY (Class 32) is similar both in name and industry. THUNDERSTRUCK is phonetically similar but in a different industry. We recommend a trademark attorney review before proceeding."

This AI-written summary appears at the top of the results page.

---

## Part 8 — The Search API (The Kitchen Manager)

**Files:** `app/api/search/route.ts`, `lib/unified-trademark-search.ts`

### What is an API?

API stands for **Application Programming Interface**. It's a door between two programs. When the website wants to do a search, it knocks on the API door: "Hey, search for THUNDER BOLT please." The API answers: "OK, here are the results."

In this app, the API is a **Next.js API Route** — a special file that Next.js automatically turns into a web endpoint.

### `app/api/search/route.ts` — The Door

This file handles the incoming search request:

```typescript
export async function POST(request: Request) {
  // 1. Read what the user sent
  const body = await request.json();
  const markText = body.markText.trim();  // e.g. "THUNDER BOLT"
  
  // 2. Validate it — don't allow garbage input
  if (markText.length < 2 || markText.length > 200) {
    return NextResponse.json({ error: 'Name must be 2-200 characters' }, { status: 400 });
  }
  
  // Make sure Nice Classes are valid numbers between 1 and 45
  const niceClasses = rawClasses
    .map(c => Number(c))
    .filter(c => Number.isInteger(c) && c >= 1 && c <= 45);
  
  // 3. Run the actual search
  const results = await unifiedTrademarkSearch({ markText, niceClasses });
  
  // 4. Send back the results
  return NextResponse.json({ success: true, results: results.conflicts });
}
```

### `lib/unified-trademark-search.ts` — The Real Brain

This function runs **three searches at the same time** (in parallel) and combines their results.

```typescript
// Fire both in parallel — don't wait for one before starting the other
const [dbResult, ragResult] = await Promise.all([
  trademarkSearchService.search({ markText, niceClasses }),  // DB search
  ragTrademarkAgent({ markText, logoUrl, niceClasses }),     // AI text + logo search
]);
```

`Promise.all` is like telling two people to start searching at the same time. You wait for BOTH to finish, then you have all the results.

### Merging (Combining) the Results

After both searches return, we need to combine them into one list. This is careful work:

```
DB Results: [APPLE (92%), MACINTOSH (78%), GOLDEN APPLE (55%)]
RAG Text Results: [APPLE INC (88%), GRANNY SMITH (62%), MACINTOSH (81%)]
Logo Results: [APPLE (91%), PINEAPPLE CO (45%)]

Merging:
- APPLE         → in DB (92%) + Logo (91%) → keep highest = 92%, source: "db + logo"
- MACINTOSH     → in DB (78%) + RAG (81%) → RAG is higher so boost to 81%, source: "db + rag-text"
- GOLDEN APPLE  → only in DB (55%), keep as-is
- APPLE INC     → only in RAG (88%), add as new result
- GRANNY SMITH  → only in RAG (62%), add as new result
- PINEAPPLE CO  → only in Logo (45%), add as new result

Final sorted list:
1. APPLE INC     88% — high risk
2. APPLE         92% — high risk   ← wait, APPLE appears twice? No — they merged!
...
```

The code prevents duplicates by using a `Map` (like a lookup dictionary) keyed by `serialNumber`. If a trademark appears in both the DB results and the RAG results, it's the same trademark — just find it in the Map and update its score.

### Risk Levels

Every result gets assigned a risk level based on its similarity score:

```typescript
const riskLevel = score >= 75 ? 'high'
                : score >= 50 ? 'medium'
                :               'low';
```

- **High Risk (≥75%)** — very similar, you probably can't register this
- **Medium Risk (50-74%)** — similar enough to be worth worrying about
- **Low Risk (<50%)** — different enough that it's probably fine

---

## Part 9 — The Frontend (What You See)

**Files:** `app/search/page.tsx`, `app/results/page.tsx`

### What is Next.js?

Next.js is a framework built on top of React. React is a JavaScript library for building interactive websites. A "framework" is a collection of pre-built tools that make development easier.

Next.js gives us:
- **Pages** — each file in the `app/` folder becomes a URL (`app/search/page.tsx` → `/search`)
- **API Routes** — files named `route.ts` in `app/api/` become HTTP endpoints
- **Server rendering** — pages can be generated on the server (faster for the user)

### `app/search/page.tsx` — The Search Form

This is the page where users type their brand name. The `'use client'` at the top means this code runs in the user's browser (not on our server).

```typescript
'use client';  // ← "run this in the browser"

export default function SearchPage() {
  // useState is like a variable that the page can track and update
  const [searchData, setSearchData] = useState({
    markText: '',      // the brand name the user types
    logoUrl: '',       // URL or base64 of their logo
    niceClasses: [],   // which industry categories they select
  });
  
  // This runs when the user clicks "Search"
  async function handleSearch() {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchData),
    });
    const results = await response.json();
    // Show results...
  }
  
  // What the page looks like (JSX — HTML-like syntax in JavaScript)
  return (
    <div>
      <input onChange={(e) => setSearchData({...searchData, markText: e.target.value})} />
      <button onClick={handleSearch}>Search</button>
    </div>
  );
}
```

### Logo Upload Handling

When a user uploads a logo from their computer, the browser can't send a file directly in a JSON request. Instead it converts the image to a **base64 string** — a long text representation of the binary image data.

```typescript
<input type="file" accept="image/*" onChange={(e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = () => {
    // reader.result looks like: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
    setSearchData({ ...searchData, logoUrl: reader.result as string });
  };
  reader.readAsDataURL(file);  // convert image to base64 text
}} />
```

The `data:image/png;base64,...` string then travels through the API to the RAG agent, which decodes it back into raw image bytes.

### `app/results/page.tsx` — The Results List

This page shows all the potentially conflicting trademarks after a search. Each result is a "card" with:

- The trademark's logo (or a letter avatar if no logo)
- The brand name and owner
- A **status badge** (Active / Pending / Dead)
- A **risk badge** (High / Medium / Low)
- A similarity percentage
- A link to the USPTO record

### The Logo Display Fix

Previously, even trademarks with logos were showing a letter avatar (first letter of the brand name). The bug was that the code always showed the letter avatar without checking if a logo actually existed.

**Before (broken):**
```tsx
<span className="text-white font-bold text-2xl">
  {conflict.markText?.[0]?.toUpperCase()}  {/* Always showed letter */}
</span>
```

**After (fixed):**
```tsx
{conflict.logoUrl ? (
  // Real logo image
  <img
    src={conflict.logoUrl}
    alt={conflict.markText}
    onError={(e) => {
      // If the image fails to load (e.g., 404), fall back to letter
      (e.target as HTMLImageElement).style.display = 'none';
    }}
  />
) : (
  // Letter avatar only when no logo exists
  <span className="text-white font-bold text-2xl">
    {conflict.markText?.[0]?.toUpperCase()}
  </span>
)}
```

The `onError` handler is a safety net — if the image URL is broken (USPTO CDN sometimes returns 404), the letter avatar shows instead of a broken image icon.

---

## Part 10 — Environment Variables (Secret Settings)

**File:** `.env.local`

An environment variable is a setting stored outside your code, usually because it contains a secret (like a password or API key) or because it changes between development and production.

Think of it like a combination lock — the code is the lock, the environment variables are the combination. The code is public (shared on GitHub), but the combination is private (`.env.local` is in `.gitignore` so it never gets uploaded).

In this app:

```bash
# DATABASE_URL — the full address + password for the Neon database
# Format: postgresql://username:password@hostname/databasename
DATABASE_URL=postgresql://kanchana:supersecret123@ep-plain-union...neon.tech/neondb?sslmode=require

# Where the Python AI microservice is running
AI_MICROSERVICE_URL=http://localhost:8000

# Where ChromaDB is running (must be 127.0.0.1, not localhost!)
CHROMA_URL=http://127.0.0.1:8001

# OpenAI API key for the LLM summary feature (optional)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
```

In code, you read them with:
```typescript
process.env.DATABASE_URL         // in TypeScript/Node.js
os.environ.get("OPENAI_API_KEY") // in Python
```

---

## Part 11 — Following One Search from Click to Result

Let's trace EXACTLY what happens when you type **"THUNDER BOLT"**, select **Class 32 (Beverages)**, and click Search. Every single step:

**Step 1 — You click Search**

The browser runs `handleSearch()` in `app/search/page.tsx`.

**Step 2 — Frontend sends an HTTP request**

```
POST http://localhost:3001/api/search
Content-Type: application/json

{
  "markText": "THUNDER BOLT",
  "niceClasses": [32]
}
```

**Step 3 — API route receives the request**

`app/api/search/route.ts` runs:
- ✅ `"THUNDER BOLT"` is 11 characters (between 2 and 200) — valid
- ✅ `[32]` is a valid Nice class (between 1 and 45) — valid
- Calls `unifiedTrademarkSearch({ markText: "THUNDER BOLT", niceClasses: [32] })`

**Step 4 — Three searches fire at the same time**

*Search A: Database fuzzy/phonetic search*
- Normalizes "THUNDER BOLT" → `"thunderbolt"`
- Computes Soundex: `T536`
- Runs SQL something like:
  ```sql
  SELECT * FROM uspto_trademarks
  WHERE mark_text ILIKE '%thunder%'
     OR mark_soundex = 'T536'
     OR 32 = ANY(nice_classes)
  ORDER BY similarity_score DESC
  LIMIT 50;
  ```
- Returns ~30-50 results from the database

*Search B: RAG text search*
- POST to `http://localhost:8000/embed/text` with `{"texts": ["THUNDER BOLT"]}`
- Gets back 768 numbers: `[0.12, -0.45, 0.31, ...]`
- POST to ChromaDB `trademark-texts` collection query endpoint with those numbers and `n_results: 20`
- Gets back 20 most semantically similar trademark names

*Search C: CLIP logo search (skipped — no logo was uploaded)*
- Since `logoUrl` is null, the logo search step is skipped entirely

**Step 5 — Wait for both to finish**

`Promise.all` waits for A and B to complete. Let's say:
- DB returned: THUNDER ENERGY (82%), BOLT BEVERAGES (71%), THUNDERSTRUCK DRINKS (58%)
- RAG returned: THUNDERSTRUCK (distance 0.3 = 85%), BOLT (distance 0.6 = 70%), LIGHTNING BOLT (distance 0.8 = 60%)

**Step 6 — Merge results**

```
Start with DB results:
  Map: { "75001234" → THUNDER ENERGY 82%, "75005678" → BOLT BEVERAGES 71%, ... }

Process RAG text results:
  "THUNDERSTRUCK" serial "77001111" — already in DB? NO → add as new (85%)
  "BOLT" serial "77002222" — already in DB? NO → add as new (70%)
  "LIGHTNING BOLT" serial "77003333" — already in DB? NO → add as new (60%)

Final sorted list:
  1. THUNDER ENERGY      82% high risk   (source: db)
  2. THUNDERSTRUCK       85% high risk   (source: rag-text)
  3. BOLT BEVERAGES      71% medium risk (source: db)
  4. BOLT                70% medium risk (source: rag-text)
  5. THUNDERSTRUCK DRINKS 58% medium risk (source: db)
  6. LIGHTNING BOLT      60% medium risk (source: rag-text)
```

**Step 7 — Build the response**

```json
{
  "success": true,
  "results": [
    {
      "serialNumber": "77001111",
      "markText": "THUNDERSTRUCK",
      "ownerName": "Thunderstruck Beverages LLC",
      "status": "live",
      "similarityScore": 85,
      "riskLevel": "high",
      "logoUrl": "https://tsdr.uspto.gov/img/77001111/large",
      "niceClasses": [32],
      "usptoUrl": "https://tsdr.uspto.gov/#caseNumber=77001111"
    },
    ...more results...
  ],
  "pipeline": {
    "dbResults": 35,
    "ragTextResults": 20,
    "clipLogoResults": 0
  }
}
```

**Step 8 — Frontend displays results**

`app/results/page.tsx` receives this JSON and renders cards for each result, sorted by similarity score descending.

---

## Part 12 — The Logo Pipeline Explained (End to End)

This is the most interesting — and most complex — feature. Here's how logo similarity works from database all the way to the search result.

### Phase 1: Seeding (Happens Once, Takes 8 Hours)

```
Neon DB (527,612 rows with logo_url)
         ↓  seed-logo-embeddings.ts reads 100 at a time
         ↓
For each logo URL like "https://tsdr.uspto.gov/img/88000001/large":
         ↓  downloads the image
         ↓
Raw image bytes (PNG/JPG, maybe 50KB)
         ↓  sent to AI microservice as multipart form upload
         ↓
POST http://localhost:8000/embed/image
         ↓  Python runs CLIP ViT-B/32 model on the image
         ↓
512-dimensional vector: [-0.12, 0.34, 0.05, 0.91, ...]
         ↓
Stored in ChromaDB trademark-logos collection:
  ID:       "88000001"          ← MUST be serial_number!
  vector:   [-0.12, 0.34, ...]  ← the 512 numbers
  document: "APPLE"             ← the brand name text
  metadata: {
    serial_number: "88000001",
    logo_url: "https://tsdr.uspto.gov/img/...",
    owner_name: "Apple Inc.",
  }
```

### Phase 2: Search Time (Real-Time, Takes ~500ms)

```
User uploads their logo PNG
         ↓  browser converts to base64 "data:image/png;base64,..."
         ↓
POST /api/search with logoUrl = "data:image/png;base64,..."
         ↓
rag-agent.ts embedImage() function:
  - Detects it's a data URL by checking if it starts with "data:"
  - Extracts the base64 part
  - Decodes it back to raw bytes: Buffer.from(base64Data, 'base64')
         ↓
Sends to POST http://localhost:8000/embed/image
         ↓  Python runs CLIP ViT-B/32 model
         ↓
512-dimensional query vector: [0.05, -0.22, 0.78, ...]
         ↓
POST http://127.0.0.1:8001/api/v2/.../trademark-logos/query
  {
    "query_embeddings": [[0.05, -0.22, 0.78, ...]],
    "n_results": 15
  }
         ↓  ChromaDB computes distances to all 31,000 stored vectors
         (we currently have 31K seeded — will have 370K when done)
         ↓
Returns 15 closest:
  [
    { id: "75123456", distance: 0.15, metadata: { mark_text: "THUNDER icon", logo_url: "..." } },
    { id: "77654321", distance: 0.22, metadata: { mark_text: "BOLT logo", logo_url: "..." } },
    ...
  ]
         ↓
Converted to similarity scores (distance 0.15 → 93%, distance 0.22 → 89%)
         ↓
Merged with DB + text results in unified-trademark-search.ts
         ↓
Displayed in results page with actual logo images shown
```

---

## Part 13 — Common Beginner Questions

**Q: What is `async` and `await`?**

A: Normally, code runs line by line. But some operations — like downloading a file from the internet — take time. If code waited for each one, the whole app would freeze.

`async`/`await` lets you say "start this slow operation, and while waiting for it, go do other things, then come back when it's done."

```typescript
// WITHOUT async/await — blocks everything while waiting
const data = downloadFile(url);  // ❌ freezes for 3 seconds

// WITH async/await — returns control while waiting
const data = await downloadFile(url);  // ✅ waits without freezing
```

**Q: What is `Promise.all`?**

A: A way to start multiple async operations at the same time and wait for ALL of them.

```typescript
// Sequential — total time = 3s + 2s + 1s = 6 seconds
const a = await search1();   // 3 seconds
const b = await search2();   // 2 seconds
const c = await search3();   // 1 second

// Parallel — total time = max(3s, 2s, 1s) = 3 seconds
const [a, b, c] = await Promise.all([search1(), search2(), search3()]);
```

**Q: What is `null` vs `undefined`?**

A: `null` means "intentionally no value — I know it's empty." `undefined` means "this variable was never assigned a value." In this codebase, `null` is used for optional fields that aren't available (like `logoUrl` when a trademark has no logo).

**Q: What does `?.` (optional chaining) do?**

A: It safely accesses a property that might not exist. Without it, you'd crash on `null` values.

```typescript
// Without optional chaining — CRASH if conflict is null
const letter = conflict.markText[0];  // ERROR if conflict is null

// With optional chaining — safely returns undefined instead of crashing
const letter = conflict?.markText?.[0];  // returns undefined if anything is null
```

**Q: What is `JSON`?**

A: JSON (JavaScript Object Notation) is the universal language that programs use to send data to each other over the internet. It looks like this:

```json
{
  "markText": "APPLE",
  "status": "live",
  "similarityScore": 92,
  "niceClasses": [9, 42]
}
```

`JSON.stringify()` converts a JavaScript object → JSON text string
`JSON.parse()` converts a JSON text string → JavaScript object

---

## Part 14 — How to Start Everything (The Complete Sequence)

Every time you want to run the app, you need to start these 4 things (in any order, but the app won't work until all 4 are up):

**Terminal 1 — ChromaDB (the vector database)**
```bash
source chroma-venv/bin/activate
chroma run --path ./chroma_data --port 8001
```
You'll see: `Chroma server listening on port 8001`

**Terminal 2 — AI Microservice (the Python brain)**
```bash
cd ai-microservice
source venv-py310/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```
You'll see: `Application startup complete.`

**Terminal 3 — Next.js App (the website)**
```bash
TURBOPACK=0 npx next dev --port 3001
```
You'll see: `✓ Ready in 945ms`

**Terminal 4 — (Optional) Monitor seed progress**
```bash
tail -f /tmp/seed-logos6.log   # watch live as logos get seeded
```

**Open the app:**
Go to `http://localhost:3001/search` in your browser.

**Quick health check (run these to verify all 3 services are up):**
```bash
curl http://localhost:8000/health            # should say: {"status":"ok"}
curl http://127.0.0.1:8001/api/v2/heartbeat  # should say: {"nanosecond heartbeat":...}
curl http://localhost:3001                   # should return HTML
```

---

## Summary — What You Learned

| Topic | What It Is | Why It Matters |
|---|---|---|
| Next.js | Website framework | Makes the UI and API |
| PostgreSQL (Neon) | Relational database | Stores all 527K trademark records |
| Drizzle ORM | TypeScript query builder | Lets us write TypeScript instead of raw SQL |
| AI Microservice | Python FastAPI app | Converts text and images to vectors |
| all-mpnet-base-v2 | Text AI model (768d) | Understands the meaning of brand names |
| CLIP ViT-B/32 | Image AI model (512d) | Understands what logos look like |
| ChromaDB | Vector database | Finds the most similar vectors fast |
| Seeding | Batch job | Pre-converts all 527K logos to vectors |
| Checkpointing | Save system | Never lose progress if the seed crashes |
| RAG Agent | AI search pipeline | Combines retrieval + GPT to find + explain conflicts |
| Unified Search | Merge layer | Combines DB + text AI + logo AI into one ranked list |
| HTTP driver | Neon connection method | Survives cold-start without timing out |
| Serial Number | Chroma ID | The key that connects Chroma results back to DB records |

You now understand the entire app from A to Z. Every bug that was fixed, every decision that was made, and why each part exists.
