# USPTO API Setup - Official & Reliable Method

This is the **official and recommended** approach for automated trademark data downloads.

## 3-Step Setup

### Step 1: Get Free API Key (2 minutes)

1. Go to: **https://open.data.internalservices.com/**
2. Click **"Get API Key"** button
3. Sign up with your email
4. Copy your API key from the dashboard
5. Add to `.env.local`:

```env
USPTO_API_KEY=your_api_key_here
DATABASE_URL=...existing...
```

### Step 2: Download Data Automatically

Once you have the API key, one command downloads everything:

```bash
# Download yesterday's applications
npm run api:download -- --daily

# Download last 7 days
npm run api:download -- --days 7

# Download everything (1884-2024) - ~7GB
npm run api:download -- --annual
```

### Step 3: Done!

The script will:
1. Query USPTO API for available files
2. Download all ZIP files
3. Extract XML from ZIPs
4. Import into database
5. Show final trademark count

---

## What This Does

```
npm run api:download -- --daily

🔍 Queries USPTO API for yesterday's trademarks
📥 Downloads ZIP file (~5-50MB)
📦 Extracts XML from ZIP
📊 Imports into database
✅ Shows count of trademarks added
```

---

## API Endpoint

The script uses:

```
GET https://api.uspto.gov/api/v1/datasets/products/trtyrap
Parameters:
  - fileDataFromDate: Start date (YYYY-MM-DD)
  - fileDataToDate: End date (YYYY-MM-DD)
  - includeFiles: true (returns file URLs)
Header:
  - x-api-key: Your API key
```

---

## Example: Complete Flow

```bash
# 1. Create .env.local with API key
echo "USPTO_API_KEY=sk_..." >> .env.local
echo "DATABASE_URL=..." >> .env.local

# 2. Import annual backfile (12M+ trademarks)
npm run api:download -- --annual
# ⏳ Takes 10-30 minutes first time
# 📊 Result: Database with 12M+ trademarks

# 3. Set GitHub Actions for daily updates
# (See .github/workflows/daily-trademark-sync.yml)
# Now runs automatically every day at 3 AM UTC
```

---

## GitHub Actions Integration

Update `.github/workflows/daily-trademark-sync.yml` to use API:

```yaml
- name: Import daily trademark data
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    USPTO_API_KEY: ${{ secrets.USPTO_API_KEY }}
  run: |
    npm run api:download -- --daily
```

Add `USPTO_API_KEY` as a GitHub secret (same as DATABASE_URL).

---

## Advantages Over Other Methods

| Method | Pros | Cons |
|--------|------|------|
| **API (Current)** | ✅ Official, reliable, no web scraping | Requires API key |
| Manual Download | ✅ Zero setup | ❌ Manual work daily |
| Web Scraping | ✅ No API key needed | ❌ Fragile, breaks easily |
| FTP | ✅ Reliable | ❌ Outdated, slow |

---

## Troubleshooting

**Q: "x-api-key: <your-api-key>" error?**
- Copy your actual API key (not the placeholder)
- Add to .env.local: `USPTO_API_KEY=your_actual_key`

**Q: API key not working?**
- Get a new key: https://open.data.internalservices.com/
- Keys can take a few minutes to activate

**Q: No files found?**
- Check date range is correct
- Verify API key has permissions
- Try smaller date range first

**Q: Download is slow?**
- Annual file is 7GB+ - normal for first run
- Daily files are fast (~5-50MB)
- Improvement: Use `--days 30` instead of `--annual`

---

## Production Checklist

- [x] API key obtained and added to .env.local
- [x] API key added to GitHub secrets (if using CI/CD)
- [x] Initial data load (annual or 7+ days)
- [x] GitHub Actions workflow configured (optional)
- [x] Daily/weekly updates scheduled

---

## Next Steps

1. Get API key: https://open.data.internalservices.com/
2. Add to .env.local
3. Run: `npm run api:download -- --annual`
4. Wait for import (10-30 minutes)
5. Start the app: `npm run dev`
6. Visit: http://localhost:3000/search
7. Search for: NIKE, APPLE, GOOGLE

That's it! 🎉
