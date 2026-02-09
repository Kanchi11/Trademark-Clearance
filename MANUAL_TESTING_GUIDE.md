# Complete Manual Testing Guide

## Part 1: Setup Verification

### ✅ Database Files Check

Your database is **fully configured** with all required files:

| File | Purpose | Status |
|------|---------|--------|
| `db/schema.ts` | Table definitions (3 tables) | ✅ Exists |
| `db/index.ts` | Database connection | ✅ Exists |
| `drizzle.config.ts` | Drizzle ORM configuration | ✅ Exists |
| `drizzle/0000_*.sql` | Migration files | ✅ Exist |
| `.env.example` | Configuration template | ✅ Exists |

### ✅ API Endpoints Available

```
POST /api/search              ✅ Text-only search
POST /api/clearance           ✅ Full workflow (deprecated, use clearance-enhanced)
POST /api/clearance-enhanced  ✅ Full workflow with logo upload (LATEST)
POST /api/domain-check        ✅ Domain availability only
POST /api/report              ✅ PDF generation
GET  /api/test-db             ✅ Database connectivity test
```

---

## Part 2: Manual Testing Setup (Step-by-Step)

### Step 1: Check Environment

```bash
# 1. Verify NODE_VERSION
node --version
# Should be: v18+ (v22 is fine)

# 2. Verify npm
npm --version

# 3. Check if .env.local exists
ls -la /Users/kanchanads/Documents/Arcangel/trademark-clearance/.env.local
# If it doesn't exist:
# cp .env.example .env.local
# Then edit with your DATABASE_URL
```

### Step 2: Verify Database Connection

```bash
cd /Users/kanchanads/Documents/Arcangel/trademark-clearance

# 1. Check DATABASE_URL is set
echo $DATABASE_URL
# Should print: postgresql://... (not empty!)

# 2. Test database connection with psql
psql $DATABASE_URL -c "SELECT 1;"
# Should output:
#  ?column?
# ----------
#         1

# If this fails:
# → PostgreSQL not running OR
# → DATABASE_URL incorrect OR
# → Network connectivity issue
```

### Step 3: Install Dependencies (First Time Only)

```bash
npm install
# This installs all packages including canvas for image processing
# Takes 2-5 minutes

# Verify canvas installed:
npm ls canvas
# Should show: canvas@2.11.2
```

### Step 4: Verify Database Schema

```bash
# Push schema to database
npm run db:push

# Output should say:
# ✓ No changes detected
# OR
# ✓ Applied X migration(s)

# Verify tables exist:
psql $DATABASE_URL -c "
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name;
"

# Should output:
#          table_name
# ---------------------------
#  search_results
#  searches
#  uspto_trademarks
# (3 rows)
```

---

## Part 3: Import Real Data

### Option A: Quick Test (1-2K records, 2-5 min)

```bash
npm run setup:real-data
```

**What happens:**
1. Clears any existing synthetic data
2. Downloads real USPTO trademarks (~1-2K)
3. Imports into database
4. Shows success statistics

**Output example:**
```
✅ Cleared

📥 Importing real USPTO trademark data...
   (Downloading from bulkdata.uspto.gov...)

Trying: https://bulkdata.uspto.gov/data/trademark/dailyxml/applications/apc250207.zip
[Downloaded 3.2MB...]
[Parsing XML...]
[Transforming 1247 records...]
[Importing to database...]

✅ Import succeeded!

📊 Database Statistics:
   Total marks imported: 1247
```

### Option B: Verify Import Success

```bash
psql $DATABASE_URL -c "
  SELECT
    COUNT(*) as total_records,
    COUNT(DISTINCT status) as unique_statuses,
    COUNT(DISTINCT owner_name) as unique_owners
  FROM uspto_trademarks;
"

# Output should show:
#  total_records | unique_statuses | unique_owners
# ---------------+-----------------+---------------
#           1247 |               4 |             800+
```

---

## Part 4: Start Development Server

```bash
npm run dev

# Output should show:
# ➜  Local:   http://localhost:3000
# ➜  Ready in 1234ms
```

**Keep this terminal open. Don't close it while testing.**

---

## Part 5: Manual API Testing

### Test 1: Check Database Connectivity

```bash
# In a NEW terminal (keep dev server running):
curl http://localhost:3000/api/test-db

# Expected response:
# {"success":true,"message":"Database connected successfully"}
```

### Test 2: Search for Real Trademarks

```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "markText": "NIKE",
    "niceClasses": [25]
  }'

# Expected response:
{
  "success": true,
  "results": [
    {
      "serialNumber": "75223127",      # REAL USPTO serial
      "markText": "NIKE",
      "ownerName": "NIKE, INC.",       # REAL owner
      "status": "live",                 # REAL status
      "similarityScore": 100,
      "riskLevel": "high"
    },
    // ... more real Nike trademarks
  ],
  "summary": {
    "totalResults": 3,
    "highRisk": 3,
    "mediumRisk": 0,
    "lowRisk": 0,
    "overallRisk": "high"
  }
}
```

**✅ If you get results, the system is working!**

### Test 3: Domain Checking

```bash
curl -X POST http://localhost:3000/api/domain-check \
  -H "Content-Type: application/json" \
  -d '{"markText": "uniquebrand9999"}'

# Expected response:
[
  {
    "domain": "uniquebrand9999.com",
    "available": "AVAILABLE"  # Or "TAKEN" or "UNKNOWN"
  },
  {
    "domain": "uniquebrand9999.net",
    "available": "AVAILABLE"
  },
  // ... .org, .io, .co, .app
]
```

### Test 4: Full Clearance Search

```bash
curl -X POST http://localhost:3000/api/clearance \
  -H "Content-Type: application/json" \
  -d '{
    "markText": "TestBrand123",
    "niceClasses": [35, 42]
  }'

# Expected response includes:
{
  "success": true,
  "results": [...],          # USPTO conflicts
  "domainResults": [...],    # Domain availability
  "socialResults": [...],    # Social media links
  "commonLaw": {...},        # Web search results
  "alternatives": [...]      # Alternative names
}
```

### Test 5: PDF Report Generation

```bash
# First get a search result, then generate PDF
curl -X POST http://localhost:3000/api/report \
  -H "Content-Type: application/json" \
  -d '{
    "results": [
      {
        "serialNumber": "75223127",
        "markText": "NIKE",
        "ownerName": "NIKE, INC.",
        "status": "live",
        "similarityScore": 100,
        "riskLevel": "high"
      }
    ],
    "summary": {
      "totalResults": 1,
      "highRisk": 1,
      "mediumRisk": 0,
      "overallRisk": "high"
    },
    "query": {"markText": "NIKE"}
  }' \
  > report.pdf

# Check the file:
file report.pdf
# Should output: PDF document, version 1.4

# Open it:
open report.pdf  # macOS
# or xdg-open report.pdf  # Linux
# or start report.pdf  # Windows
```

---

## Part 6: Manual UI Testing

### Test 1: Home Page

1. Open browser: http://localhost:3000/
2. Verify:
   - ✅ Welcome message appears
   - ✅ "Search" button visible
   - ✅ No errors in console (F12)

### Test 2: Search Wizard (Full Flow)

**Step 1: Business Info**
1. Click "Search"
2. Enter business name (optional): "My Company"
3. Select industry (optional): Any
4. Click "Next"
5. Verify: ✅ Proceeds to Step 2

**Step 2: Trademark Details**
1. Enter mark text (required): "GOOGLE"
2. Click "Next"
3. Verify: ✅ Proceeds to Step 3

**Step 3: Nice Classes**
1. Select classes: Check "9 - Software", "35 - Advertising"
2. Click "Next"
3. Verify: ✅ Proceeds to Step 4

**Step 4: Review**
1. Verify all data shown correctly
2. Click "Submit"
3. Wait for search to complete (10-30 seconds)
4. Verify: ✅ Redirects to /results

### Test 3: Results Page

1. Verify results table shows:
   - ✅ Trademark names
   - ✅ Similarity scores (0-100)
   - ✅ Risk levels (High/Medium/Low)
   - ✅ Links to USPTO TSDR

2. Verify summary shows:
   - ✅ Total conflicts
   - ✅ High/Medium/Low risk counts
   - ✅ Overall risk rating

3. Verify domains section shows:
   - ✅ Available domains (.com, .net, .org, .io, .co, .app)
   - ✅ Availability status (AVAILABLE/TAKEN/UNKNOWN)

4. Verify PDF export:
   - ✅ "Export PDF" button visible
   - ✅ Click it → PDF downloads

5. Verify "Back to Search":
   - ✅ Click it → Returns to home

---

## Part 7: Database Inspection (Deep Dive)

### Check Data Structure

```bash
# Inspect one record
psql $DATABASE_URL -c "
  SELECT
    serial_number,
    mark_text,
    mark_text_normalized,
    mark_soundex,
    status,
    owner_name,
    nice_classes,
    filing_date
  FROM uspto_trademarks
  LIMIT 1
  \gx;
"

# Output example:
#      serial_number | 75223127
#         mark_text  | NIKE
#  mark_text_normalized | nike
#      mark_soundex  | N200
#           status   | live
#       owner_name   | NIKE, INC.
#     nice_classes   | {25}
#     filing_date    | 1978-02-28
```

### Check Indexes

```bash
psql $DATABASE_URL -c "
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE tablename = 'uspto_trademarks';
"

# Should show indexes on:
# - mark_text_normalized (for LIKE search)
# - mark_soundex (for phonetic search)
# - status (for filtering)
# - nice_classes (for array search)
```

### Check Search Performance

```bash
# Time a real search query
psql $DATABASE_URL << EOF
EXPLAIN ANALYZE
SELECT *
FROM uspto_trademarks
WHERE mark_soundex = 'N200'
AND status = 'live'
AND nice_classes && '{25}'
LIMIT 100;
EOF

# Should complete in <100ms
# If >1000ms, indexes might not be working
```

---

## Part 8: Troubleshooting Checklist

### Problem: "DATABASE_URL not set"

```bash
# Check if .env.local exists and is readable:
cat /Users/kanchanads/Documents/Arcangel/trademark-clearance/.env.local | grep DATABASE_URL

# If not there, add it:
echo 'DATABASE_URL=postgresql://...' >> .env.local

# Verify it's set:
source .env.local && echo $DATABASE_URL
```

### Problem: "Connection refused" (PostgreSQL)

```bash
# Check if PostgreSQL is running:
# macOS: brew services list
# Linux: systemctl status postgresql
# Or check Supabase dashboard

# If Supabase: Get connection string from:
# Supabase Dashboard → Project → Settings → Database → Connection String
```

### Problem: "No results" from API

```bash
# Check if data was imported:
psql $DATABASE_URL -c "SELECT COUNT(*) FROM uspto_trademarks;"

# If 0 records:
npm run setup:real-data

# If still 0, check for errors:
npm run data:import 2>&1 | head -50
```

### Problem: API returns 500 error

```bash
# Check server logs (in dev terminal):
# Look for error message in terminal where `npm run dev` is running

# Common causes:
# 1. DATABASE_URL invalid
# 2. Database query failed
# 3. Missing required field in request

# Check logs:
tail -50 /var/log/trademark-app.log  # If deployed
```

### Problem: Search is very slow (>30 seconds)

```bash
# Check index performance:
psql $DATABASE_URL -c "
  EXPLAIN ANALYZE
  SELECT COUNT(*) FROM uspto_trademarks
  WHERE mark_soundex = 'N200';
"

# If it says "Seq Scan" instead of index:
# Indexes might not be created properly
# Recreate them:
psql $DATABASE_URL << 'EOF'
CREATE INDEX IF NOT EXISTS idx_mark_soundex ON uspto_trademarks(mark_soundex);
ANALYZE uspto_trademarks;
EOF
```

---

## Part 9: Quick Verification Tests

Run these commands to verify everything is working:

```bash
# Test 1: Database connection
npm run dev &  # Start in background
sleep 2
curl -s http://localhost:3000/api/test-db | grep -q "success" && echo "✅ DB Connection OK" || echo "❌ DB Connection Failed"

# Test 2: Data exists
psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM uspto_trademarks;" | grep -q "[1-9]" && echo "✅ Data Imported" || echo "❌ No Data"

# Test 3: API works
curl -s -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"markText":"GOOGLE","niceClasses":[9]}' | \
  grep -q "results" && echo "✅ API Working" || echo "❌ API Failed"

# Test 4: Database indexes exist
psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename='uspto_trademarks';" | \
  grep -q "4" && echo "✅ Indexes Created" || echo "⚠️  Check indexes"
```

---

## Part 10: What Should You See at Each Step

### After `npm run setup:real-data`

```
✅ Database has real USPTO trademarks
✅ Total records: 1,000+
✅ Status values: live, dead, pending, abandoned
✅ Ready for searches
```

### After `npm run dev`

```
✅ Server listening on http://localhost:3000
✅ Next.js compiled successfully
✅ Ready to accept requests
```

### After searching "NIKE"

```
✅ API responds in <5 seconds
✅ Results include:
   - NIKE (100% match, High Risk)
   - NIKE PLUS (88% match, High Risk)
   - Plus other variations
✅ All results have real serial numbers (75223127, etc.)
✅ All results link to real USPTO TSDR
```

### After exporting PDF

```
✅ PDF downloads
✅ PDF contains:
   - Search term
   - Conflicts table
   - Risk summary
   - Domain results
   - Legal disclaimer
✅ PDF is attorney-ready
```

---

## Summary Table: What Works & What to Check

| Component | Status | How to Test |
|-----------|--------|-----------|
| Database Schema | ✅ Ready | `npm run db:push` → "No changes detected" |
| API Routes | ✅ Ready | `curl http://localhost:3000/api/test-db` → 200 OK |
| Real Data | ✅ Ready | `npm run setup:real-data` → "Import succeeded" |
| Similarity Scoring | ✅ Ready | Search "NIKE" → scores 100, 88, 65, etc. |
| Risk Assessment | ✅ Ready | Results show "high", "medium", "low" |
| PDF Export | ✅ Ready | Click "Export PDF" → PDF downloads |
| Domain Check | ✅ Ready | Searches show .com/.net/.org availability |
| Social Links | ✅ Ready | Results show Twitter/Instagram links |

---

## Expected Database Size After Import

| Metric | Expected | Actual |
|--------|----------|--------|
| Records (1 day) | 1-2K | ? |
| Records (1 year) | 100K+ | ? |
| Database Size (1 day) | 5-10 MB | ? |
| Database Size (1 year) | 200-500 MB | ? |
| Query Time (<100 records) | <100ms | ? |
| Query Time (100K records) | <500ms | ? |

---

## Next Steps After Verification

✅ **If everything works:**
1. Try different search terms (APPLE, AMAZON, GOOGLE)
2. Test different Nice classes
3. Export a PDF report
4. Share with stakeholders

❌ **If something doesn't work:**
1. Check troubleshooting section above
2. Review server logs (browser console F12 + terminal)
3. Verify DATABASE_URL is correct
4. Verify PostgreSQL is running

