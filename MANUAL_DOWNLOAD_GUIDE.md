# Manual Download + Automated Import Workflow

Since the USPTO data portal requires JavaScript to generate download links, here's the practical workflow:

## Quick Start (3 Steps)

### Step 1: Download ZIP Files Manually

1. Go to: https://data.uspto.gov/bulkdata/datasets
2. Find: **"Trademark Full Text XML Data (No Images) – Daily Applications"** (TRTDXFAP)
3. Click on any recent files (e.g., last 3-7 days)
4. Click each file to download (browser handles the redirect)
5. Save all files to: `./downloads/` folder in your project

**Example:**
```
./downloads/
  ├── apc260208.zip
  ├── apc260207.zip
  ├── apc260206.zip
  └── apc260205.zip
```

### Step 2: Create Downloads Folder

```bash
mkdir -p downloads
```

### Step 3: Import All Files

```bash
# Clears database and imports all ZIP files from ./downloads/ folder
npm run import:batch
```

---

## Complete Automation with Manual Download

Here's how to set it up for daily updates with manual weekly downloads:

### Week 1: Load Annual + Recent Daily
```bash
# Download Annual from: https://data.uspto.gov/bulkdata/datasets
# Look for: "Trademark Full Text XML Data (No Images) – Annual Applications"
# Download part 1 (or any complete recent part) - usually starts with apc18840407...
# Save to: ./downloads/annual-backfile.zip

npm run import:file -- ./downloads/annual-backfile.zip

# Now download last 7 days of daily files and import
npm run import:batch
```

### Every Day (Automated Option in Future)
Once we have the annual baseline loaded, add this to cron:
```bash
# Create a script to run daily at 2 AM
0 2 * * * cd /Users/kanchanads/Documents/Arcangel/trademark-clearance && npm run download:daily
```

---

## Lightweight Option: Use Recent Daily Files Only

If annual is too large, just use recent daily files:

```bash
# Download last 30-60 days of daily files from the portal
# This gives you ~100K-500K trademarks (sufficient for most testing)

# Put all in ./downloads/ folder
npm run import:batch

# Then set GitHub Actions to add new daily files going forward
```

---

## Commands Available

```bash
# Import a single ZIP file
npm run import:file -- ./downloads/apc260208.zip

# Import all ZIP files from ./downloads/ folder (will add to database)
npm run import:batch

# Download specific days (when proxy/API works)
npm run download:trademarks -- --daily      # Yesterday
npm run download:trademarks -- --days 7     # Last 7 days
npm run download:trademarks -- --annual     # Annual backfile
```

---

## What We Recommend

| Scenario | Approach |
|----------|----------|
| **Testing** | Download 2-3 recent daily files, run `npm run import:batch` |
| **Development** | Download last 30 days, get ~200K trademarks |
| **Production** | Download annual + last 7 days, then GitHub Actions for daily updates |

---

## Troubleshooting

**Q: Files aren't importing?**
- Check `.env.local` has DATABASE_URL set
- Verify ZIP files are valid: `file ./downloads/*.zip`
- Check database connection: `psql $DATABASE_URL -c "SELECT 1;"`

**Q: Database shows old data after import?**
- That's correct! Imports ADD to database, don't replace
- To clear: `psql $DATABASE_URL -c "DELETE FROM uspto_trademarks;"`
- Then import fresh

**Q: How many files to download?**
- Minimum: 1 daily file (~5MB, ~100-500 trademarks)
- Recommended: 7 daily files (~50MB, ~1K-2K trademarks)
- Complete: Annual file + last 7 days (~500MB, ~2M+ trademarks)

---

## Next: GitHub Actions Integration

Once you have data loaded locally and working, we can:
1. Add GitHub Actions workflow to trigger weekly
2. You download files manually from portal
3. Upload to GitHub Actions
4. It imports and pushes to Supabase

This works around the JavaScript limitation of the portal.
