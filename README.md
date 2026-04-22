# Trademark Clearance & Availability Checker

A comprehensive, self-service trademark clearance tool designed for founders, startups, and small businesses. Quickly assess trademark availability and conflict risk before filing - think of it as your "pre-attorney clearance search" that saves time and money.

This is an MVP model that uses XML data downloaded from the USPTO database, enhanced with AI-powered logo similarity search using CLIP embeddings. The steps are mentioned — please make sure to go through all the steps before getting started.

🚨 **This is not legal advice.** This tool provides information only. Always consult a qualified trademark attorney for final clearance before filing.

---

## 🚀 Quick Start for Reviewers

Want to run this project quickly? Here's the TL;DR:

1. **Clone repo:** `git clone https://github.com/Kanchi11/trademark-clearance.git`
2. **Install:** `npm install`
3. **Get database access:** Email me at **kds@ncsu.edu** for read-only database credentials or also use the env.example 
4. **Add credentials:** Put the DATABASE_URL in `.env.local`
5. **Run:** `npm run dev`
6. **Open:** http://localhost:3000
---

## Features

### 🔍 **Comprehensive Federal Search**
- **527,000+ Real USPTO Trademarks** (with logo URLs) stored in Neon serverless PostgreSQL — imported from official USPTO bulk data XML files
- **Industry-Standard Multi-Factor Risk Assessment:**
  - Exact match detection
  - Phonetic matching (Soundex algorithm catches sound-alikes)
  - Visual similarity (Levenshtein distance for appearance)
  - Fuzzy matching (bigram/dice coefficient for variations)
  - **Rule-based evaluation** - Inspired by CompuMark, Corsearch, and USPTO examination guidelines
- **Nice Class Filtering** - Only shows conflicts in relevant industries (1-45)
- **Smart Keyword Mapping** - Type "shoes" → automatically suggests Class 25

### 🌐 **Domain & Social Availability**
- **Domain Check:** Live DNS lookup for .com, .net, .org, .io, .co, .app
- **Social Handles:** Auto-check Twitter, Instagram, Facebook, LinkedIn, TikTok, YouTube

### 📊 **Risk Assessment & Scoring**
- **Industry-Standard Multi-Factor Analysis** (matches how CompuMark and USPTO assess risk):
  - **RULE 1:** Exact match priority (85%+ = HIGH, 50%+ = MEDIUM)
  - **RULE 2:** Phonetic similarity (sounds-alike is critical for USPTO rejections)
  - **RULE 3:** Visual similarity (looks-alike assessment)
  - **RULE 4:** Multiple moderate factors (cumulative risk)
  - **RULE 5:** Any single factor very high (75%+ = MEDIUM)
  - **RULE 6:** Fuzzy matching edge cases
- **3-Tier Professional Risk Categories:**
  - **BLOCKING CONFLICTS (HIGH):** Identical/near-identical marks in same class - strong likelihood of rejection
  -  **CAUTION REQUIRED (MEDIUM):** Phonetically similar, visually similar, or multiple similarity factors elevated
  - **LOW RISK / MONITOR:** Different enough, or different industry class
- **Intelligent Escalation:** 3+ MEDIUM risks automatically escalate to HIGH overall (industry standard)
- **Detailed Explanations:** Each conflict shows specific trigger reason (e.g., "Marks sound very similar")

### 🔗 **Evidence & Verification**
- Direct links to USPTO TSDR for each conflict (will have to type srial number as of now )
- Common law search integration (optional Google Custom Search API)
- Manual research links (Google, LinkedIn, Crunchbase) - always shown even without API

### 📄 **Professional PDF Reports**
- One-click export to shareable PDF
- Includes:
  - Executive summary with overall risk assessment
  - Industry-standard conflict categorization (Blocking/Caution/Monitor)
  - Full conflict list with similarity breakdowns
  - Domain availability results
  - Social media handle availability
  - Alternative name suggestions (when high risk)
  - Legal disclaimer
- **Attorney-ready format** - Send directly to your lawyer to save on research hours

### 💡 **Alternative Suggestions**
- When risk is HIGH, automatically suggests alternatives:
  - Prefix variations (Pro-, Ultra-, Super-)
  - Suffix variations (-Tech, -Pro, -Hub)
  - Creative combinations

### 🤖 **AI-Powered Logo Similarity (CLIP)**
- **Visual trademark conflict detection** — upload or provide a logo URL and find visually similar registered logos
- **CLIP ViT-B/32 embeddings** (512-dimensional) for industry-standard image similarity
- **33,000+ logo embeddings** currently seeded into ChromaDB (growing toward full dataset)
- **Sentence Transformer embeddings** for text-based semantic trademark search
- Unified search pipeline merges DB fuzzy/phonetic, RAG text, and CLIP logo results by serial number

### 🚀 **Performance Features**
- **Fast Search:** 2-5 second searches across 500K+ marks
- **Pagination:** Results shown 10 per page for easy review
- **Loading Animation:** Professional progress indicators during search
- **Responsive Design:** Works on desktop, tablet, mobile

---

## Tech Stack

### Frontend
- **Framework:** Next.js 16.1.5 (App Router)
- **React:** Server Components for optimal performance
- **TypeScript:** Full type safety
- **Styling:** Tailwind CSS

### Backend
- **Runtime:** Node.js 18+
- **Database:** Neon serverless PostgreSQL (HTTP driver — no TCP cold-start issues)
- **ORM:** Drizzle ORM - Type-safe database queries
- **Data Volume:** 527,612 USPTO trademarks with logo URLs

### Algorithms & Libraries
- **Soundex:** Phonetic matching (USPTO standard)
- **Metaphone:** Improved phonetic algorithm
- **Levenshtein Distance:** Visual/edit distance calculation
- **Dice Coefficient:** Fuzzy/bigram matching
- **Weighted Scoring:** 40% exact, 30% visual, 20% phonetic, 10% fuzzy

### External APIs (Optional)
- **Google DNS API:** Domain availability checks
- **Google Custom Search API:** Common law research (optional - manual links provided if not configured)
- **USPTO TSDR API:** Live verification (optional - future enhancement)

### PDF Generation
- **jsPDF:** PDF creation library
- **autoTable:** Table formatting in PDFs

### Data Processing
- **SAX Parser:** Streaming XML parser for large USPTO files
- **Batch Processing:** Handles 500MB+ XML files efficiently

### AI / Vector Search
- **ChromaDB** (port 8001): Vector store for trademark text and logo embeddings
  - `trademark-logos` collection: 33K+ CLIP logo embeddings (seeding in progress)
  - `trademark-texts` collection: Sentence Transformer text embeddings
- **ML microservice** (port 8000, FastAPI/Python):
  - `/embed/image` → 512d CLIP `ViT-B/32` embeddings
  - `/embed/text` → 768d `all-mpnet-base-v2` text embeddings
  - `/llm/complete` → GPT-4o-mini summary (falls back to template without API key)
- **RAG agent:** Retrieval over Chroma + LLM summary; enable with `RAG_AGENT_ENABLED=true`

**One-command AI stack setup (Chroma + ML service):**
```bash
# Start Chroma + ML microservice (Docker)
docker compose up -d

# In .env.local set:
RAG_AGENT_ENABLED=true
AI_MICROSERVICE_URL=http://localhost:8000
CHROMA_URL=http://127.0.0.1:8001   # use 127.0.0.1 not localhost on macOS

# Seed logo embeddings into Chroma (runs from Neon DB checkpoint, resumable)
npx tsx scripts/seed-logo-embeddings.ts
```
The seed script is checkpointed — safe to stop and restart anytime (`/tmp/seed-logo-checkpoint.json` saves progress).

---

## Design Decisions & Architecture

### Why We Built It This Way

#### 1. **Next.js with App Router (Not Pages Router)**
**Decision:** Use Next.js 16.1.5 with App Router instead of older Pages Router

**Reasoning:**
- **Server Components:** Reduce client-side JavaScript bundle size by rendering components on the server
- **Streaming:** Progressive rendering for faster perceived performance
- **Built-in API routes:** Simplifies backend logic without separate Express server
- **File-based routing:** Intuitive folder structure maps directly to URLs
- **Future-proof:** App Router is the recommended approach going forward

#### 2. **Neon Serverless PostgreSQL + Drizzle ORM**
**Decision:** Migrated from Supabase to Neon serverless PostgreSQL with HTTP driver

**Reasoning:**
- **Relational data:** Trademarks have structured fields (serial number, classes, dates) - relational DB is perfect
- **Neon HTTP driver:** `@neondatabase/serverless` avoids TCP cold-start timeouts that were causing the seed script to hang — responds in <2 seconds vs 30+ second TCP timeouts
- **Array support:** PostgreSQL's `INTEGER[]` type handles Nice classes efficiently
- **Full-text search:** Built-in text search capabilities with GIN indexes
- **Drizzle benefits:**
  - **Type-safe:** Full TypeScript inference without code generation
  - **Lightweight:** No heavy ORM overhead like Prisma
  - **SQL-first:** Easy to write raw SQL when needed
  - **Migration control:** Simple schema management with `db:push`



#### 4. **SAX Parser for XML (Not DOM or JSON conversion)**
**Decision:** Stream-parse XML with SAX instead of loading entire file into memory

**Reasoning:**
- **File size:** USPTO XML files are 500MB+ each (10GB uncompressed)
- **Memory efficiency:** SAX uses ~50MB RAM regardless of file size; DOM would need 2-3GB
- **Speed:** Processes 100K+ records in minutes
- **Reliability:** No out-of-memory crashes
- **Trade-off:** More complex code, but necessary for large files

#### 5. **Batch Import with Files Downloaded USPTO Website  (Not Real-time API)**
**Decision:** Download and import XML files once, then search locally

**Reasoning:** 
- **USPTO API limitations:**
  - Verification to get API key takes weeks and can be implemented in V2. once we get, Webscraping isnt ideal and not allowed. So manually downloaded the zip files from Annual database and stored it in download/ under the application repo
- **Performance:** Local database searches are 100x faster (2-5 seconds vs 2+ minutes for API calls)
- **Cost:** No per-request API costs
- **Offline capability:** Works without external dependencies after import
- **Trade-off:** Requires initial data download, but provides better UX

#### 6. **Supabase for Database Hosting (Not AWS RDS or self-hosted)**
**Decision:** Recommend Supabase for managed PostgreSQL

**Reasoning:**
- **Free tier:** Generous free tier for MVP/demos
- **Managed:** No server maintenance or backups needed
- **PostgreSQL:** Full PostgreSQL (not limited subset)
- **Developer experience:** Simple connection string, web dashboard
- **Scalability:** Easy to upgrade when needed
- **Alternative:** Local PostgreSQL for development works fine too

#### 7. **Pagination at 10 Results (Not Infinite Scroll)**
**Decision:** Show 10 results per page with numbered pagination

**Reasoning:**
- **Attorney workflow:** Legal professionals review results methodically, not casually scrolling
- **Performance:** Rendering 100+ results at once causes browser lag
- **Clarity:** Page numbers help track "I reviewed pages 1-3"
- **Accessibility:** Better for keyboard navigation and screen readers

#### 8. **Client-Side PDF Generation (Not Server-Side)**
**Decision:** Use jsPDF in browser instead of server-side PDF services

**Reasoning:**
- **No backend dependency:** Works entirely in browser
- **Privacy:** User data never sent to external PDF service
- **Cost:** Free (no AWS Lambda or PDF API costs)
- **Speed:** Instant generation without network round-trip
- **Trade-off:** Slightly larger client bundle, but worth it for privacy

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│  ┌────────────┐      ┌──────────────┐     ┌──────────────┐ │
│  │  Search UI │ ───> │ Results Page │ ──> │ PDF Download │ │
│  └────────────┘      └──────────────┘     └──────────────┘ │
│         │                    │                              │
└─────────┼────────────────────┼──────────────────────────────┘
          │                    │
          ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                  NEXT.JS API ROUTES (Server)                 │
│  ┌──────────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │ /api/clearance   │  │ /api/search   │  │ /api/report  │ │
│  │ (Full Search)    │  │ (USPTO Only)  │  │ (PDF Data)   │ │
│  └────────┬─────────┘  └───────┬───────┘  └──────────────┘ │
└───────────┼────────────────────┼─────────────────────────────┘
            │                    │
            ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           TrademarkSearchService                     │   │
│  │  - Orchestrates search workflow                      │   │
│  │  - Calls repository + risk engine + domain check     │   │
│  └────┬─────────────────────┬──────────────────┬────────┘   │
│       │                     │                  │            │
│       ▼                     ▼                  ▼            │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │ Trademark   │   │ Risk         │   │ Domain Checker  │  │
│  │ Repository  │   │ Assessment   │   │ (Google DNS)    │  │
│  │             │   │ Engine       │   │                 │  │
│  └──────┬──────┘   └──────────────┘   └─────────────────┘  │
└─────────┼──────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│              POSTGRESQL DATABASE (Supabase)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  trademarks table (1,422,522 records)                │   │
│  │  - serial_number, mark_text, owner_name              │   │
│  │  - status, filing_date, registration_date            │   │
│  │  - nice_classes[] (array)                            │   │
│  │                                                       │   │
│  │  Indexes:                                            │   │
│  │  - B-tree on mark_text (fast lookups)               │   │
│  │  - GIN on nice_classes (array queries)              │   │
│  │  - B-tree on status (filter by LIVE/PENDING)        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

EXTERNAL DATA SOURCE:
┌─────────────────────────────────────────────────────────────┐
│               USPTO Bulk Data (XML Files)                    │
│  https://bulkdata.uspto.gov/                                 │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Annual #01 │  │ Annual #02 │  │ Annual #03 │  ... (86)  │
│  │ (~10GB)    │  │ (~10GB)    │  │ (~10GB)    │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│                                                              │
│  Downloaded via Google Drive → /downloads/ folder           │
│                    ↓                                         │
│            scripts/import-uspto-sax.ts                       │
│                    ↓                                         │
│            Parsed and imported to PostgreSQL                 │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow for a Typical Search

1. **User enters "BrandX" + Class 25** in search form
2. **Next.js API route** `/api/clearance` receives request
3. **TrademarkSearchService** orchestrates:
   - Calls `TrademarkRepository.searchSimilar("BrandX", classes=[25])`
   - Repository runs 4 similarity queries:
     - Exact match (SQL `ILIKE`)
     - Phonetic match (Soundex algorithm)
     - Visual match (Levenshtein distance < 3)
     - Fuzzy match (substring/trigram)
   - Returns ~50 potential conflicts
4. **Risk Assessment Engine** evaluates each:
   - Calculates similarity breakdown (exact, phonetic, visual, fuzzy)
   - Applies 6 multi-factor rules
   - Assigns HIGH/MEDIUM/LOW to each conflict
5. **Domain Check** runs DNS lookups for .com, .net, etc.
6. **Social Media** generates check links
7. **Common Law** (if API configured) searches Google
8. **Results Page** renders with pagination (10 per page)
9. **PDF Export** (optional) generates attorney-ready report

---

## Getting Started

### Complete Setup Guide (Clone to Running)

**For Reviewers:** The fastest way to get started is using the **read-only database**. Follow Steps 1-3, then jump to Step 5 Option A to request database access to kds@ncsu.edu or just refer env.example. You'll be running the app in ~10 minutes!

Follow these steps to get the project running on your local machine:

### Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** and npm installed (check: `node --version` and `npm --version`)
- **Git** installed (check: `git --version`)
- **PostgreSQL database** - Choose one option:
  - **Option A (Recommended):** Supabase free tier - [Sign up here](https://supabase.com)
  - **Option B:** Local PostgreSQL installation
- **(Optional)** Google API credentials for automated common law search

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/Kanchi11/trademark-clearance.git

# Navigate into the project directory
cd trademark-clearance

# Verify you're in the right directory
ls -la
# You should see: package.json, README.md, app/, src/, etc.
```

### Step 2: Install Dependencies

```bash
# Install all npm packages
npm install

# This will install:
# - Next.js, React, TypeScript
# - Drizzle ORM, PostgreSQL driver
# - jsPDF, similarity algorithms
# - And all other dependencies listed in package.json

# Wait for installation to complete (30-60 seconds)
```

### Step 3: Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env.local

# Open .env.local in your text editor
# For example: code .env.local (VS Code) or nano .env.local
```

Edit `.env.local` and add your database connection:

```bash
# === REQUIRED ===
# Database (Supabase or local PostgreSQL, use the url provided in env example or email the author to get prepopulated db with 1.6M + records )
DATABASE_URL=postgresql://user:password@host:port/database


# Google Custom Search (for automated common law research)
# Without this, manual search links will still be provided
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
```

**How to get DATABASE_URL:**

**Option A: Supabase (Recommended - Free Tier)**
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project:
   - Project name: `trademark-clearance` (or your choice)
   - Database password: Choose a strong password
   - Region: Select closest to your location
   - Wait 2-3 minutes for project to provision
3. Get your connection string:
   - Navigate to **Settings** → **Database**
   - Scroll to **Connection String** section
   - Copy the **URI** format (starts with `postgresql://`)
   - Replace `[YOUR-PASSWORD]` with your actual database password
4. Paste into `.env.local` as `DATABASE_URL`

**Option B: Local PostgreSQL**
```bash
# Install PostgreSQL locally (macOS example)
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb trademark_clearance

# Your DATABASE_URL will be:
DATABASE_URL=postgresql://localhost:5432/trademark_clearance
```

### Step 4: Set Up Database Schema

**Note:** If you plan to use the **read-only database** (Option A in Step 5), you can **skip this step** since the tables already exist.

If you're setting up your **own database** (Option B in Step 5), run:

```bash
# Push the database schema (creates all tables and indexes)
npm run db:push

# You should see output like:
# ✓ Schema pushed successfully
# ✓ Created table: trademarks
# ✓ Created indexes
```

This creates the `trademarks` table with all necessary columns and indexes.

### Step 5: Get Access to Trademark Data

**⚠️ IMPORTANT:** The trademark database contains 1,422,522 records imported from USPTO XML files. You have two options:

#### Option A: Use Read-Only Database (Recommended - 5 minutes) ⭐

**This is the fastest way to get started!** I've made the production database available as read-only for reviewers.

**How to get access:**
1. **Contact me** via email at **kds@ncsu.edu** or open a GitHub issue
2. I'll provide you with a **read-only database connection string**
3. **Add it to your `.env.local`:**
   ```bash
   DATABASE_URL=postgresql://readonly_user:password@host:port/database
   ```
4. **Skip to Step 6** - You're ready to run the app!

**Benefits:**
- ✅ **Instant access** - No downloads or imports needed
- ✅ **Same data** - Exact 1.4M+ trademarks used in production
- ✅ **Read-only** - Safe, can't modify production data
- ✅ **Always current** - Automatically updated when I update the database

---

#### Option B: Import Your Own Data (Alternative - 1-2 hours)

If you want your own local database with full control:

**Step B1: Download USPTO XML Files**

The XML files are NOT in this repository (too large - 34GB). You can:
- **Option B1a:** Download from USPTO directly at [bulkdata.uspto.gov](https://bulkdata.uspto.gov/ui/datasets/products/files/TRTYRAP)
- **Option B1b:** Contact me for a Google Drive link to the specific files I used

**Step B2: Extract and Import**

```bash
# 1. Create downloads folder
mkdir -p downloads

# 2. Place downloaded XML files in downloads/ folder
# Move files: mv ~/Downloads/*.xml downloads/

# 3. Verify files are there
ls -lh downloads/
# You should see multiple .xml files (each 200MB-1GB)

# 4. Run the batch import script
npm run batch-import

# Expected output:
# 📦 Starting batch import...
# 📂 Found 15 XML files in downloads/
# 🔄 Processing: apc170101-20231130-001-trtyrap.xml
# ✅ Imported 87,432 trademarks from file 1/15
# ... (continues for each file)
# ✅ Import complete! Total: 1,422,522 trademarks

# ⏱️ Time: 10-30 minutes depending on your machine and database
```

**What happens during import:**
- SAX parser streams each XML file
- Extracts trademark data (serial number, mark text, owner, status, classes)
- Validates and cleans data
- Batch inserts to PostgreSQL (1000 records at a time)
- Creates indexes for fast searching

**Troubleshooting:**
- **Out of memory error:** Increase Node memory: `NODE_OPTIONS="--max-old-space-size=4096" npm run batch-import`
- **Database connection error:** Verify your `DATABASE_URL` in `.env.local`
- **XML files not found:** Ensure files are in `downloads/` folder

---

### Step 6: Run the Application

```bash
# Start development server
npm run dev

# Expected output:
#  ▲ Next.js 16.1.5
#  - Local:        http://localhost:3000
#  - Environment:  development
# ✓ Compiled successfully
```

**Open your browser to [http://localhost:3000](http://localhost:3000)**

You should see the trademark clearance search interface!

### Step 7: Test the Application

Try searching for a famous brand to verify everything works:

1. **Go to:** http://localhost:3000
2. **Click:** "Start New Search"
3. **Enter:** "Microsoft" (or "Apple" or any brand name)
4. **Select:** Class 9 (Computers and Scientific)
5. **Click:** "Check Availability"
6. **Wait:** 2-5 seconds for results
7. **View:** Conflicts, risk assessment, domain availability

**If you see results:** ✅ Success! Everything is working.

**If you see "No results":** Your database might be empty - verify Step 6 import completed successfully.

---

## Running in Production

### Build for Production

```bash
# Create optimized production build
npm run build

# Start production server
npm start

# Production server runs on http://localhost:3000
```

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy (from project directory)
vercel

# Follow prompts:
# - Link to existing project or create new
# - Add DATABASE_URL as environment variable
# - Wait for deployment (2-3 minutes)
# - Get production URL: https://your-project.vercel.app
```

**Environment variables in Vercel:**
1. Go to your Vercel dashboard
2. Select your project → Settings → Environment Variables
3. Add: `DATABASE_URL` with your Supabase connection string
4. Add (optional): `GOOGLE_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID`

---

## Available Scripts

```bash
# Development
npm run dev                # Start development server (hot reload enabled)

# Building
npm run build              # Create production build
npm start                  # Run production build locally

# Database
npm run db:push            # Push schema changes to database
npm run db:studio          # Open Drizzle Studio (visual database browser)

# Data Import
npm run batch-import       # Import all XML files from downloads/ folder
npm run data:import -- --url <url>  # Import single file from URL

# AI / Chroma seeding
npx tsx scripts/seed-logo-embeddings.ts        # Seed CLIP logo embeddings (resumable)

# Testing (if you add tests)
npm test                   # Run tests
npm run lint               # Check code quality
```

---

## Troubleshooting Common Issues

### Issue: "Database connection failed"
**Solution:**
- Verify `DATABASE_URL` in `.env.local` is correct
- Test connection: `npm run db:push`
- If using Supabase, check your project isn't paused (inactive for 7 days)

### Issue: "No trademarks found" after search
**Solution:**
- Database might be empty - run `npm run batch-import`
- Or search for names you know exist (Microsoft, Apple, Nike variants)

### Issue: "Port 3000 already in use"
**Solution:**
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or run on different port
PORT=3001 npm run dev
```

### Issue: "Domain checks timing out"
**Solution:**
- This is normal for some domain extensions
- Domain checking uses Google DNS API (free but can be slow)
- Results will show "loading..." for slow checks

### Issue: "Out of memory" during import
**Solution:**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run batch-import
```

---

## Development Tips

### VS Code Extensions (Recommended)

Install these for better development experience:
- **ES7+ React/Redux/React-Native snippets** - React code snippets
- **Tailwind CSS IntelliSense** - Tailwind autocomplete
- **Prisma/Drizzle** - Database schema syntax highlighting
- **PostgreSQL** - SQL syntax highlighting
- **GitLens** - Git history viewer

### Database Viewing

View your database visually with Drizzle Studio:

```bash
npm run db:studio

# Opens web UI at http://localhost:4983
# Browse tables, run queries, view data
```

### Debugging

Add breakpoints in VS Code or use console logs:

```typescript
// In any API route or component
console.log('Search query:', { markText, niceClasses });

// View logs in terminal where `npm run dev` is running
```

---

## Project Structure (Detailed)

```
trademark-clearance/
│
├── app/                                  # Next.js App Router
│   ├── page.tsx                         # Landing page (/)
│   ├── layout.tsx                       # Root layout wrapper
│   ├── search/                          # Search interface
│   │   └── page.tsx                     # Multi-step search form
│   ├── results/                         # Results display
│   │   └── page.tsx                     # Results with pagination
│   └── api/                             # API routes (backend)
│       ├── clearance/route.ts           # Main clearance endpoint
│       ├── search/route.ts              # USPTO search only
│       ├── domain-check/route.ts        # Domain availability
│       ├── report/route.ts              # PDF generation
│       └── common-law/route.ts          # Common law search
│
├── src/                                 # Core business logic
│   └── core/
│       ├── repositories/                # Data access layer
│       │   └── TrademarkRepository.ts   # Database queries (SELECT, WHERE)
│       ├── services/                    # Business logic layer
│       │   └── TrademarkSearchService.ts # Orchestrates search workflow
│       └── engines/                     # Processing engines
│           └── RiskAssessmentEngine.ts  # Multi-factor risk evaluation
│
├── lib/                                 # Utility libraries
│   ├── similarity.ts                    # Soundex, Levenshtein, scoring algorithms
│   ├── risk-assessment.ts               # 6-rule risk assessment logic
│   ├── domain-check.ts                  # DNS lookups for domain availability
│   ├── cache.ts                         # In-memory caching
│   └── class-suggestions.ts             # Keyword → Nice class mapping
│
├── db/                                  # Database configuration
│   ├── schema.ts                        # Drizzle schema (table definitions)
│   ├── index.ts                         # Database connection setup
│   └── migrations/                      # Schema migrations (if using)
│
├── scripts/                             # Data import scripts
│   ├── import-uspto-sax.ts              # SAX streaming XML parser
│   ├── batch-import-all.ts              # Batch import all files in downloads/
│   └── import-daily.ts                  # Import daily USPTO updates
│
├── downloads/                           # USPTO XML files (NOT in git)
│   ├── *.xml                            # Downloaded XML files go here
│   └── .gitignore                       # Prevents committing to git
│
├── public/                              # Static assets
│   ├── logo.svg                         # App logo
│   └── favicon.ico                      # Browser icon
│
├── .env.local                           # Environment variables (NOT in git)
├── .env.example                         # Environment template (committed)
├── .gitignore                           # Git ignore rules
├── package.json                         # Dependencies and scripts
├── tsconfig.json                        # TypeScript configuration
├── tailwind.config.ts                   # Tailwind CSS config
├── next.config.js                       # Next.js configuration
└── README.md                            # This file
```

**Key Directories:**

- **`app/`** - All UI pages and API endpoints (Next.js convention)
- **`src/core/`** - Business logic separate from UI (clean architecture)
- **`lib/`** - Reusable utility functions
- **`db/`** - Database schema and connection
- **`scripts/`** - One-time or periodic data operations
- **`downloads/`** - Temporary storage for USPTO XML files (ignored by git)

---

## Why Manual XML Download Instead of API?

**USPTO offers several trademark data access methods. Here's why we chose the manual XML approach for this MVP:**

### 1. **USPTO TSDR API** ❌
   - **Requires verification:** Business verification process can take days or weeks to get API key
   - **Future use:** Can be added later for live verification of individual results (requires API key approval)

### 2. **Web Scraping** ❌
   - **Not allowed:** Violates USPTO terms of service
   - **Unreliable:** Website structure changes would break scrapers
   - **Not ideal:** Legal and ethical concerns

### 3. **XML Bulk Data Download** ✅ (Our Approach)
   - ✅ **Official source:** USPTO provides free bulk XML downloads at [bulkdata.uspto.gov](https://bulkdata.uspto.gov/data/trademark/dailyxml/applications/)
   - ✅ **No verification needed:** Public data, download anytime
   - ✅ **Complete dataset:** Annual files contain all 10M+ trademarks from 1884-present
   - ✅ **Build searchable database:** Import once, search millions of times instantly
   - ✅ **Fast searches:** 2-5 second searches across entire database
   - ✅ **No API limits:** No rate limiting or request quotas

**For this MVP:**
- Downloaded select files from USPTO's **Annual Trademark XML (TRTYRAP)** directory
- Focused on recent and high-value trademark data
- Parsed using SAX streaming parser (handles large files efficiently)
- Imported **1,422,522 trademarks** to searchable PostgreSQL database

**For Reviewers/Developers:**
- **Easy Option:** Use read-only database credentials (contact me at kds@ncsu.edu) or check the env.example 
- **Full Control Option:** Download and import XML files yourself (see Getting Started section)

**Data Source Details:**
- **Official URL:** https://bulkdata.uspto.gov/ui/datasets/products/files/TRTYRAP
- **Total Files Available:** 86 files (~10GB each when uncompressed)
- **Files Used for MVP:** Select segments containing recent and historical applications
- **Total Database Size:** 1.4M+ trademarks (sufficient for comprehensive conflict detection)

**Roadmap:**
- **Phase 1 (Complete):** XML bulk data import → PostgreSQL for comprehensive fuzzy/phonetic search
- **Phase 2 (In Progress):** CLIP logo embeddings in ChromaDB for AI-powered visual trademark conflict detection (~33K of 527K seeded)
- **Phase 3 (Planned):** Add USPTO TSDR API integration for live status verification after obtaining API approval


---

## How XML Parsing Works

### USPTO Data Structure

USPTO provides trademark data as XML files in two formats:
- **Daily Files:** New/updated applications (~2-5K trademarks per day)
- **Annual Backfiles:** Complete historical database (86 files, ~10M+ total marks)

We use the **Annual Backfiles (TRTYRAP)** for comprehensive coverage.

### Parsing Technology

**SAX (Simple API for XML) Streaming Parser:**
- **Why SAX?** USPTO XML files can be 500MB+ each - DOM parsing would crash with out-of-memory errors
- **Streaming approach:** Processes XML incrementally without loading entire file into memory
- **Memory efficient:** Handles any file size with minimal RAM usage
- **Fast processing:** Extracts only needed fields, skips irrelevant data

### Data Extraction

From each `<case-file>` in the XML, we extract:

```typescript
{
  serialNumber: "97676330",      // USPTO serial number
  markText: "APPLE M2",           // Trademark text
  ownerName: "Apple Inc.",        // Owner/applicant
  status: "pending",              // live/dead/pending/abandoned
  filingDate: "2023-10-15",      // When filed
  registrationDate: null,         // When registered (if live)
  niceClasses: [9]               // Industry classification codes
}
```

### Processing Pipeline

1. **Download** XML files from USPTO (ZIP format)
2. **Unzip** to extract XML
3. **Stream parse** with SAX - processes one `<case-file>` at a time
4. **Extract** fields from nested XML structure
5. **Validate** data (skip incomplete records)
6. **Batch insert** to PostgreSQL (1000 records at a time for performance)
7. **Index creation** for fast searching (text, soundex, classes)

### Database Schema

```sql
CREATE TABLE trademarks (
  id SERIAL PRIMARY KEY,
  serial_number VARCHAR(20) UNIQUE NOT NULL,
  mark_text TEXT NOT NULL,
  owner_name TEXT,
  status VARCHAR(20),
  filing_date DATE,
  registration_date DATE,
  nice_classes INTEGER[],
  source_file VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast searching
CREATE INDEX idx_mark_text ON trademarks(mark_text);
CREATE INDEX idx_nice_classes ON trademarks USING GIN(nice_classes);
CREATE INDEX idx_status ON trademarks(status);
```

### Current Dataset

**This Version Includes:**
- **1,422,522 USPTO trademarks** from select XML files
- Mix of historical and recent applications
- Coverage of major brands and common conflicts
- **Note:** Does NOT include ALL 10M+ trademarks (can expand by importing more files)

**Which Famous Marks Are Included:**
- ✅ Apple M2, Apple M3, Apple Inc. variants
- ✅ Microsoft variants
- ✅ Many Fortune 500 company trademarks
- ❌ Some historical marks require importing additional annual backfiles

**To Add More Marks:**
Download and import additional USPTO annual backfiles from bulkdata.uspto.gov.

---

## API Endpoints

### `POST /api/clearance`
Full clearance search (federal + domain + social + common law + alternatives).

**Request:**
```json
{
  "markText": "BrandName",
  "niceClasses": [9, 35, 42],
  "includeUSPTOVerification": true
}
```

**Response:**
```json
{
  "success": true,
  "results": [...],
  "summary": {
    "totalResults": 15,
    "highRisk": 2,
    "mediumRisk": 5,
    "lowRisk": 8,
    "overallRisk": "high"
  },
  "domainResults": {...},
  "socialResults": {...},
  "commonLaw": {...},
  "alternatives": [...]
}
```

### `POST /api/search`
USPTO federal search only (no domain/social checks).

### `POST /api/domain-check`
Domain availability check only.

### `POST /api/report`
Generate PDF report from search results.

---

## How It Works

1. **User Input:** User enters trademark text, optional logo upload, goods/services description, and Nice classes (or keyword search in step flow).
2. **Cache:** Request is cached by mark + Nice classes + logo hash (Redis or in-memory via `lib/cache`). Repeated identical searches return cached result.
3. **Federal Search:** `TrademarkSearchService` queries DB via `TrademarkRepository` (exact normalized, partial ILIKE, Soundex). Results are scored (exact, phonetic, visual, fuzzy) and risk-assessed (low/medium/high). Top results can be verified with USPTO TSDR (live status).
4. **Domain Check:** Live DNS (Google DNS) for common TLDs; results split into likely available / likely taken with registrar check URLs.
5. **Social Check:** Generates handle URLs for Twitter, Instagram, Facebook, LinkedIn, TikTok, YouTube for manual verification.
6. **Common Law:** Bing or Google Custom Search (if configured) plus manual links (Google, state registries, business directories). State registry links (e.g. CA, NY, TX, FL, IL SOS) are included where accessible.
7. **Logo (optional):** If user uploaded a logo, perceptual-hash comparison against precomputed USPTO logo hashes (when JSONL available); otherwise skipped without failing the request.
8. **Alternatives:** When overall risk is high, suggests alternative names (prefix/suffix/variations); shown only when high risk.
9. **Monitoring:** Logger and metrics (search count, duration, cache hits/misses, USPTO API calls) are recorded for observability.
10. **Report:** Full results page and one-click PDF export with disclaimer: *"This is not legal advice; consult a trademark attorney for final clearance."*

---

## Use Cases

- **Solo Founders / Startups:** Quick self-serve clearance before paying attorney fees
- **SaaS Builders:** Validate product names before launch
- **Design Agencies:** Check client brand names early in the design process
- **E-commerce Brands:** Clear product line names before inventory investment
- **Trademark Attorneys:** Preliminary research tool for junior associates

---

## Limitations & Disclaimers

### What This Tool Does NOT Do

❌ **Not Legal Advice:** This tool provides information only - consult a qualified trademark attorney for final clearance

❌ **US Federal Only:** Does not include state-level trademarks or international databases (EU/UK/Madrid) in V1

❌ **No Logo/Image Analysis:** Text-based marks only (visual similarity for images requires AI vision models)

❌ **No Auto-Filing:** This tool helps with research - you must still file manually with USPTO

❌ **Not a Complete Replacement for Attorney:** Catches 80-90% of obvious conflicts; attorneys analyze the nuanced 10-20%

### Complex Issues Requiring Attorney Review

This tool cannot assess:
- Likelihood of confusion (subjective legal standard)
- Descriptiveness or genericness issues
- Common law rights from extensive unregistered use
- Intent to use vs. actual use distinctions
- Opposition or cancellation proceedings
- Fair use defenses
- Geographic limitations

**Always consult a qualified trademark attorney for:**
- Final clearance opinion before filing
- Complex similarity assessments
- International trademark strategy
- Filing and prosecution
- Enforcement and opposition proceedings

---

## Performance & Scalability

- **Search Speed:** 2-5 seconds across 1.4M+ trademarks
- **Database Indexes:** Optimized for text search, soundex, and class filtering
- **Concurrent Searches:** Handles multiple simultaneous users
- **Scalability:** Designed to scale to 10M+ records (full USPTO database)
- **Pagination:** Results limited to 10 per page for optimal UX

---

## Roadmap / Future Enhancements

- [ ] USPTO TSDR API integration for live status verification (pending API approval)
- [ ] Daily automated updates from USPTO daily XML feeds
- [ ] International trademark databases (EUIPO, UKIPO, WIPO Madrid)
- [ ] State-level trademark searches (50 state databases)
- [ ] Logo/image similarity analysis (computer vision AI)
- [ ] Automated monitoring (alerts when similar marks are filed)
- [ ] Advanced linguistics (translations, foreign language phonetic matching)
- [ ] Attorney marketplace integration
- [ ] Bulk search (upload CSV of names)
- [ ] Redis cache for faster efficient
- [ ] Machine learning models for finding similarity  

---

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - See LICENSE file for details

---

## Acknowledgments

- **USPTO** for providing free bulk trademark data via bulkdata.uspto.gov
- **Drizzle ORM** for excellent TypeScript-first database toolkit
- **Next.js Team** for the amazing React framework
- **Supabase** for generous PostgreSQL hosting
- **CompuMark & Corsearch** for inspiring industry-standard risk assessment methodology

---

## Support

For questions or issues:
- Open a GitHub Issue
- Contact: [kds@ncsu.edu]

---
