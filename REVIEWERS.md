# For Reviewers & Demo Users

Welcome! This document explains how to get the trademark data to run this application.

## The Challenge: 34GB of XML Files

The XML files containing 1.4M+ USPTO trademarks are **34GB total** and cannot be stored in GitHub. Here are your options to access the data:

---

## Option 1: Use Shared Database (Fastest - Recommended) ⭐

**Setup Time:** 5 minutes
**Best For:** Reviewers, demos, quick testing

### How It Works:
I can provide a **read-only connection** to the existing Supabase database with 1.4M+ trademarks already imported.

### Steps:
1. Clone the repo:
   ```bash
   git clone https://github.com/Kanchi11/Trademark-Clearance.git
   cd trademark-clearance
   npm install
   ```

2. Create `.env.local` and add the database URL I provide:
   ```bash
   # .env.local
   DATABASE_URL=postgresql://[I'll send you this]
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 and search!

**Note:** Contact me (GitHub issue or email) for the read-only database credentials.

---

## Option 2: Download USPTO Files Yourself (Full Control)

**Setup Time:** 2-4 hours (download + import)
**Best For:** Production use, full dataset access

### Steps:

1. **Clone and setup:**
   ```bash
   git clone https://github.com/Kanchi11/Trademark-Clearance.git
   cd trademark-clearance
   npm install
   ```

2. **Create your own Supabase database:**
   - Go to [supabase.com](https://supabase.com)
   - Create free account
   - Create new project
   - Get DATABASE_URL from Settings → Database

3. **Add to `.env.local`:**
   ```bash
   DATABASE_URL=postgresql://your-supabase-url
   ```

4. **Push schema:**
   ```bash
   npm run db:push
   ```

5. **Download USPTO XML files:**

   **Option A: Single Daily File (Quick Test - 2-5K records)**
   ```bash
   npm run data:import -- --url https://bulkdata.uspto.gov/data/trademark/dailyxml/applications/apc250207.zip
   ```

   **Option B: Annual Backfiles (Full Dataset - 10M+ records)**

   Visit: [USPTO Annual XML Files](https://bulkdata.uspto.gov/data/trademark/dailyxml/applications/)

   Download specific files:
   - Files #01-#20: Historical marks (Nike, Apple, Microsoft, etc.)
   - Files #21-#60: Mid-era marks
   - Files #61-#86: Recent marks

   Place in `/downloads` folder and run:
   ```bash
   npm run batch-import
   ```

6. **Run the app:**
   ```bash
   npm run dev
   ```

---

## Option 3: Cloud Storage Link (If I Provide One)

**Setup Time:** 1-2 hours (download + import)

If I upload a curated subset to Google Drive/Dropbox:

1. Download ZIP from the link I provide
2. Extract to `/downloads` folder
3. Run: `npm run batch-import`

**Note:** I haven't created this yet, but can if there's demand.

---

## Option 4: Sample Data Script (Quick Demo)

**Setup Time:** 10 minutes
**Best For:** Just want to see the UI, don't care about real searches

**Coming Soon:** I can create a script that generates ~1000 fake trademark records just for UI testing.

---

## Comparison Table

| Option | Setup Time | Data Size | Real Data | Best For |
|--------|------------|-----------|-----------|----------|
| **Shared DB** | 5 min | 0 GB (cloud) | ✅ 1.4M real | Reviewers, demos |
| **USPTO Files** | 2-4 hours | 10-34 GB | ✅ Full dataset | Production |
| **Cloud Link** | 1-2 hours | 1-5 GB | ✅ Curated subset | Testing |
| **Sample Data** | 10 min | <1 MB | ❌ Fake data | UI only |

---

## Recommended Approach for Different Users

### Code Reviewers / Demo Users
→ **Option 1: Shared Database**
Get immediate access, test all features, no downloads

### Contributors / Developers
→ **Option 2: Download USPTO Files**
Full control, can modify data, offline access

### Quick UI Testers
→ **Option 4: Sample Data** (when available)
Just want to click around the interface

---

## Why Can't XML Files Be in GitHub?

- **Size Limit:** GitHub has a 100MB file limit, 1GB repo limit
- **Our Files:** 34GB total (86 files)
- **Solution:** External downloads + shared database

---

## Need Help?

- **Open an issue:** https://github.com/Kanchi11/Trademark-Clearance/issues
- **Ask for database access:** Tag me in an issue requesting reviewer access
- **Questions about USPTO files:** See README.md "How XML Parsing Works"

---

## What You Get With Shared Database

When using the shared read-only database, you get:

✅ **1,422,522 USPTO trademarks** ready to search
✅ **All search algorithms** (exact, phonetic, visual, fuzzy)
✅ **Full risk assessment** (HIGH/MEDIUM/LOW)
✅ **Domain availability checks**
✅ **Social media handle checks**
✅ **PDF export**
✅ **All features working** - exactly like production

You CAN'T:
❌ Modify the database (insert/update/delete)
❌ Import additional XML files to this database

**For full control:** Use Option 2 and create your own database.

---

## Questions?

Contact me via GitHub issues: https://github.com/Kanchi11/Trademark-Clearance/issues
