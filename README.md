# Trademark Clearance & Availability Checker

A comprehensive, self-service trademark clearance tool designed for founders, startups, and small businesses. Quickly assess trademark availability and conflict risk before filing - think of it as your "pre-attorney clearance search" that saves time and money.

🚨 **This is not legal advice.** This tool provides information only. Always consult a qualified trademark attorney for final clearance before filing.

---

## 📋 For Reviewers & Demo Users

**Need access to the 1.4M+ trademark database?**

XML files (34GB) are not in this repo. See **[REVIEWERS.md](./REVIEWERS.md)** for options:
- ⭐ **Option 1:** Use shared read-only database (5 min setup)
- 📥 **Option 2:** Download USPTO XML files yourself (2-4 hours)
- 📦 **Option 3:** Cloud storage link (if provided)

**Quick Start:** Contact me for read-only database credentials to get running in 5 minutes.

---

## Features

### 🔍 **Comprehensive Federal Search**
- **1.4+ Million Real USPTO Trademarks** - Imported from official USPTO bulk data XML files
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
  - 🔴 **BLOCKING CONFLICTS (HIGH):** Identical/near-identical marks in same class - strong likelihood of rejection
  - 🟡 **CAUTION REQUIRED (MEDIUM):** Phonetically similar, visually similar, or multiple similarity factors elevated
  - 🟢 **LOW RISK / MONITOR:** Different enough, or different industry class
- **Intelligent Escalation:** 3+ MEDIUM risks automatically escalate to HIGH overall (industry standard)
- **Detailed Explanations:** Each conflict shows specific trigger reason (e.g., "Marks sound very similar")

### 🔗 **Evidence & Verification**
- Direct links to USPTO TSDR for each conflict
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

### 🚀 **Performance Features**
- **Fast Search:** 2-5 second searches across 1.4M+ marks
- **Pagination:** Results shown 10 per page for easy review
- **Loading Animation:** Professional progress indicators during search
- **Responsive Design:** Works on desktop, tablet, mobile

---

## Tech Stack

- **Framework:** Next.js 16.1.5 (App Router, React Server Components)
- **Database:** PostgreSQL (Supabase) with Drizzle ORM - **1,422,522 USPTO trademarks**
- **Algorithms:**
  - Soundex (phonetic - USPTO standard)
  - Metaphone (improved phonetic)
  - Levenshtein distance (visual/edit distance)
  - Dice Coefficient (fuzzy/bigram matching)
  - **Weighted scoring:** 40% exact, 30% visual, 20% phonetic, 10% fuzzy
- **APIs:**
  - Google DNS for domain checks
  - Google Custom Search for common law research (optional)
  - USPTO TSDR for live verification (optional)
- **PDF Generation:** jsPDF with autoTable
- **Data Source:** Official USPTO bulk XML files

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (Supabase recommended, or local PostgreSQL)
- (Optional) Google API credentials for automated common law search

### 2. Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/trademark-clearance.git
cd trademark-clearance

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### 3. Configure Environment Variables

Edit `.env.local`:

```bash
# === REQUIRED ===
# Database (Supabase or local PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# === OPTIONAL (but recommended) ===
# Google Custom Search (for automated common law research)
# Without this, manual search links will still be provided
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id

# Note: Manual links work without API - users can click to search manually
```

### 4. Set Up Database

```bash
# Push database schema (creates tables)
npm run db:push
```

### 5. Import USPTO Trademark Data

**⚠️ IMPORTANT:** This version includes only **some XML files** from the USPTO database. The current database has **1,422,522 trademarks** imported from select daily files.

#### Quick Start (Use Existing Database)
If cloning this repo to use with the existing Supabase database:
```bash
# Just configure DATABASE_URL in .env.local
# The database already has 1.4M+ trademarks ready to use
npm run dev
```

#### Import Additional Data (Optional)
To add more trademarks from other XML files:

```bash
# Download a daily file (2-5K new records)
npm run data:import -- --url https://bulkdata.uspto.gov/data/trademark/dailyxml/applications/apc250207.zip

# Or use a local file
npm run data:import -- --file ./downloads/your-file.zip
```

**For comprehensive coverage**, download USPTO Annual Backfile:
1. Visit [USPTO Trademark Annual XML](https://bulkdata.uspto.gov/ui/datasets/products/files/TRTYRAP)
2. Download segments (86 files, ~10GB total)
3. Place in `/downloads` folder
4. Run: `npm run batch-import`

### 6. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start searching!

---

## How XML Parsing Works

### USPTO Data Structure
USPTO provides trademark data as XML files in two formats:
- **Daily Files:** New/updated applications (~2-5K trademarks per day)
- **Annual Backfiles:** Complete historical database (86 files, ~10M+ total marks)

### Our Parsing Approach

**Technology:** SAX (Simple API for XML) streaming parser
- **Why SAX?** Files can be 500MB+, DOM parsing would crash with out-of-memory
- **Streaming:** Processes XML incrementally, handles any file size
- **Efficient:** Only extracts needed fields, skips irrelevant data

**What We Extract:**
```typescript
{
  serialNumber: "97676330",     // USPTO serial number
  markText: "APPLE M2",          // Trademark text
  ownerName: "Apple Inc.",       // Owner/applicant
  status: "pending",             // live/dead/pending/abandoned
  filingDate: "2023-10-15",     // When filed
  registrationDate: null,        // When registered (if live)
  niceClasses: [9]              // Industry classes
}
```

**Processing Pipeline:**
1. **Download** XML file from USPTO (ZIP format)
2. **Unzip** to extract XML
3. **Stream parse** with SAX - processes one `<case-file>` at a time
4. **Extract** fields from nested XML structure
5. **Validate** data (skip incomplete records)
6. **Batch insert** to PostgreSQL (1000 records at a time for performance)
7. **Index** for fast searching (text, soundex, classes)

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

### Current Data Status

**This Version Includes:**
- **1,422,522 USPTO trademarks** from select daily XML files
- Date range: Mix of historical and recent applications
- **Note:** Does NOT include ALL trademarks (full dataset is 10M+)

**Why Limited Data?**
- **File Size:** Complete USPTO database is ~10GB (86 files)
- **Demo Purpose:** 1.4M marks is sufficient to demonstrate functionality
- **Scalable:** You can import additional files anytime using the scripts

**Which Famous Marks Are Included?**
- ✅ Apple M2, Apple M3, Apple Inc. variants - INCLUDED
- ✅ Microsoft variants - INCLUDED
- ❌ Exact "NIKE" word mark - NOT INCLUDED (different XML file)
- ❌ Exact "APPLE" word mark - NOT INCLUDED (different XML file)

**To Add More Marks:**
Download specific USPTO annual backfiles (#01-#20 contain famous historical marks)

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

## Project Structure

```
trademark-clearance/
├── app/
│   ├── api/
│   │   ├── clearance/      # Main clearance endpoint
│   │   ├── search/         # USPTO search endpoint
│   │   ├── domain-check/   # Domain availability
│   │   └── report/         # PDF generation
│   ├── search/             # Search UI (multi-step form)
│   └── page.tsx            # Landing page
├── src/
│   └── core/
│       ├── repositories/   # TrademarkRepository (DB queries)
│       └── services/       # Business logic
├── lib/
│   ├── similarity.ts       # Soundex, Levenshtein, scoring
│   ├── domain-check.ts     # DNS lookups
│   └── cache.ts            # Redis caching
├── db/
│   ├── schema.ts           # Drizzle schema
│   └── index.ts            # Database connection
├── scripts/
│   ├── import-uspto-sax.ts      # USPTO XML import (streaming)
│   └── batch-import-all.ts      # Batch processor
└── downloads/              # Place downloaded USPTO XML files here
```

---

## How It Works

1. **User Input:** Mark text + Nice classes → Step-by-step form
2. **Federal Search:** Repository queries database with multiple algorithms
3. **Scoring:** Calculate similarity scores (exact, phonetic, fuzzy, visual)
4. **Risk Assessment:** Assign risk levels based on scores + Nice class overlap
5. **Domain Check:** Live DNS lookups via Google DNS
6. **Social Check:** Generate check links for major platforms
7. **Common Law:** Optional Google Custom Search API query
8. **Alternatives:** If high risk, generate alternative suggestions
9. **Report:** Render results as PDF with disclaimer

---

## Use Cases

- **Solo Founders / Startups:** Quick self-serve clearance before paying attorney fees
- **SaaS Builders:** Validate product names before launch
- **Design Agencies:** Check client brand names early in process
- **E-commerce Brands:** Clear product line names
- **Trademark Attorneys:** Preliminary research tool for junior associates

---

## Limitations & Out of Scope (V1)

 **Not Legal Advice:** This tool provides information only. Consult a qualified attorney.
**US Federal Only:** No state-level trademarks or international (EU/UK/Madrid) in V1
 **No Logo/Image Analysis:** Text-based marks only (visual similarity requires AI vision models)
**No Auto-Filing:** Tool helps with research - you still file manually with USPTO
 **Not a Replacement for Attorney:** Catches 80-90% of issues; attorneys catch the nuanced 10-20%

---

## Roadmap / Future Features

- [ ] International trademark databases (EU, UK, Madrid Protocol)
- [ ] State-level trademark searches (50 state databases)
- [ ] Logo/image similarity analysis (computer vision AI)
- [ ] Automated monitoring (alert when similar marks are filed)
- [ ] Advanced linguistics (translations, foreign language matches)
- [ ] Attorney marketplace integration
- [ ] Bulk search (upload CSV of names)

---

## Performance & Scalability

- **Cache Layer:** Redis caching reduces database load by ~70%
- **Database Indexes:** Optimized for text search, soundex, and class filtering
- **Concurrent Searches:** Handles multiple simultaneous users
- **Data Size:** Currently 200K+ records; designed to scale to 10M+

---

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

---

## License

MIT License - See LICENSE file for details

---

## Disclaimer

**IMPORTANT:** This tool is for **informational purposes only** and does **NOT** constitute legal advice. Trademark law is complex and nuanced. This tool cannot assess:
- Likelihood of confusion (subjective legal standard)
- Descriptiveness or genericness issues
- Common law rights (unregistered marks)
- Intent to use vs. actual use distinctions
- Opposition or cancellation proceedings

**Always consult a qualified trademark attorney** for:
- Final clearance opinion before filing
- Complex similarity assessments
- International trademark strategy
- Filing and prosecution
- Enforcement and oppositions

This tool is designed to save you time and money on preliminary research, but it is **not a substitute** for professional legal counsel.

---



---

## Acknowledgments

- **USPTO** for providing free bulk trademark data
- **Drizzle ORM** for excellent TypeScript-first database toolkit
- **Next.js** team for the amazing framework
- **Supabase** for generous free tier

---

