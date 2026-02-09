# Troubleshooting Guide & FAQ

## Common Issues & Solutions

### 1. Database Connection Issues

#### Error: `connect ECONNREFUSED 127.0.0.1:5432`
**Cause:** PostgreSQL not running or DATABASE_URL incorrect
**Solutions:**
```bash
# 1. Check DATABASE_URL in .env.local
echo $DATABASE_URL

# 2. Verify Supabase connection
# Go to https://supabase.com → Project Settings → Database

# 3. Test connection locally
psql $DATABASE_URL -c "SELECT 1"

# 4. If using local postgres, start it:
# macOS:
brew services start postgresql
# Linux:
sudo systemctl start postgresql
# Docker:
docker run -d -p 5432:5432 postgres:16-alpine
```

#### Error: `duplicate key value violates unique constraint`
**Cause:** Trying to seed data that already exists
**Solutions:**
```bash
# Clear the table (if local dev)
npm run db:push  # Recreates schema

# Or delete specific records:
psql $DATABASE_URL -c "DELETE FROM uspto_trademarks WHERE serial_number = '88000001';"

# Then reseed:
npm run db:seed
```

#### Error: `permission denied for schema public`
**Cause:** Insufficient database permissions
**Solutions:**
```bash
# Grant permissions (as admin):
GRANT ALL PRIVILEGES ON DATABASE trademarks TO trademark_app;
GRANT USAGE ON SCHEMA public TO trademark_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO trademark_app;

# Or recreate in Supabase:
1. Delete project
2. Create new project
3. Get new connection string
```

---

### 2. Data Import Issues

#### Error: `fetch failed` / `ENOTFOUND bulkdata.uspto.gov`
**Cause:** No internet access or firewall blocking USPTO
**Solutions:**
```bash
# 1. Check internet connection
curl https://bulkdata.uspto.gov/

# 2. Use local XML file instead:
wget https://bulkdata.uspto.gov/data/trademark/dailyxml/applications/apc250207.zip
npm run data:import -- --file ./apc250207.xml

# 3. For offline/restricted networks:
# Download ZIP externally, copy to server, use --file option

# 4. Troubleshoot imports
npm run data:import -- --limit 10  # Test with 10 records first
```

#### Error: `Parsed 0 case-file(s)`
**Cause:** XML file format incompatible or corrupted
**Solutions:**
```bash
# 1. Verify ZIP contains XML:
unzip -l file.zip

# 2. Check XML structure:
head -50 extracted-file.xml

# 3. Try different year/format:
npm run data:import -- --url https://bulkdata.uspto.gov/data/trademark/dailyxml/applications/apc250101.zip

# 4. Validate XML:
xmllint --noout file.xml
```

#### Error: `Upserted 0 rows` or import hangs
**Cause:** Database constraints or network timeout
**Solutions:**
```bash
# 1. Check database connection timeout (Supabase)
# Verify in Supabase dashboard: Logs → Database

# 2. Batch smaller amounts:
npm run data:import -- --limit 1000

# 3. Run from server closer to database:
# SSH into production server and run there

# 4. Increase timeout in scripts/import-uspto-bulk.ts:
const timeoutMs = 120000; // Increase from 60000
```

---

### 3. API Endpoint Issues

#### Error: `POST /api/search` returns 400
**Cause:** Missing or invalid markText field
**Solutions:**
```bash
# Check request body:
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"markText": "APPLE", "niceClasses": [9, 35]}'

# Must include:
# - markText (required, non-empty string)
# - niceClasses (recommended, array of 1-45)

# Valid example:
{
  "markText": "MyBrand",
  "niceClasses": [35, 42],
  "includeUSPTOVerification": true
}
```

#### Error: `POST /api/clearance` times out (>60 seconds)
**Cause:** External API calls blocking (USPTO TSDR, Google, DNS)
**Solutions:**
```bash
# 1. Disable TSDR verification:
{
  "markText": "TestBrand",
  "niceClasses": [35],
  "includeUSPTOVerification": false  // Skip this
}

# 2. Check external API status:
# - USPTO TSDR: https://tsdr.uspto.gov/
# - Google DNS: Try `dig google.com @8.8.8.8`
# - Upstash Redis: Check status page

# 3. Increase timeout in route handler:
// In app/api/clearance/route.ts
export const maxDuration = 120; // 2 minutes for Vercel

# 4. Check rate limits:
# Upstash may throttle excessive requests
```

#### Error: `404 Not Found` on API endpoint
**Cause:** Route file not created or named incorrectly
**Solutions:**
```bash
# Check file exists:
ls app/api/clearance/route.ts
ls app/api/search/route.ts
ls app/api/domain-check/route.ts

# Must be exactly route.ts (not route.ts.ts or route.tsx)
# Must be in matching folder (app/api/clearance/)
```

#### Error: `413 Payload Too Large`
**Cause:** Request body > 1MB or image upload too large
**Solutions:**
```bash
# For image uploads:
# - Max image size: 5MB (set in lib/image-upload.ts)
# - Compress image before upload
# - Use:  png, jpg, jpeg, gif, webp only

# Check payload size:
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d "$(cat request.json)" -i  # Check Content-Length header
```

---

### 4. Frontend Issues

#### Search wizard doesn't advance to next step
**Causes & Solutions:**
```bash
# 1. Check browser console for errors (F12)
# 2. Verify all required fields filled:
#    - Step 1: Optional
#    - Step 2: markText required
#    - Step 3: niceClasses required (min 1)
#    - Step 4: Just review

# 3. Check network tab (F12 → Network):
#    POST /api/clearance should return 200

# 4. Clear browser cache:
# Ctrl+Shift+Delete (Windows) / Cmd+Shift+Delete (Mac)
```

#### Results page shows "No results" but should have conflicts
**Causes & Solutions:**
```bash
# 1. Check if data was imported:
psql $DATABASE_URL -c "SELECT COUNT(*) FROM uspto_trademarks WHERE mark_text_normalized LIKE '%nike%';"

# 2. If 0 records, import data:
npm run data:import

# 3. Check similarity threshold in lib/similarity.ts:
# Default: Only show > 40% similarity

# 4. Check Nice classes:
# Selected classes must match database records

# 5. Test API directly:
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"markText": "NIKE", "niceClasses": [25]}'
```

#### PDF export fails or is blank
**Causes & Solutions:**
```bash
# 1. Check network tab (F12) for /api/report errors
# 2. Verify jsPDF is installed:
npm list jspdf

# 3. Check browser compatibility (jsPDF needs):
#    - Chrome/Firefox/Safari (Edge)
#    - NOT IE 11

# 4. Create minimal test PDF:
# Visit: http://localhost:3000/api/report (GET, should fail)
# POST from form should work

# 5. Check result data shape:
# PDF endpoint expects specific JSON structure
```

---

### 5. Image/Logo Similarity Issues

#### Image upload fails
**Causes & Solutions:**
```bash
# 1. Check file size:
# Max: 5MB (see lib/image-upload.ts line 8)

# 2. Check file format:
# Allowed: PNG, JPG, JPEG, GIF, WebP

# 3. Verify uploads directory exists:
ls -la public/uploads/

# 4. Check uploads/ permissions (must be writable):
chmod 755 public/uploads/

# 5. Test upload directly:
const formData = new FormData();
formData.append('logo', file); // File from <input type="file">
fetch('/api/search', { method: 'POST', body: formData })
```

#### Image similarity score is 0 or unexpected
**Causes & Solutions:**
```bash
# 1. Check image was processed:
# In app/api/clearance/route.ts, add logging:
console.log('Logo URL:', logoUrl);

# 2. Verify Canvas library installed:
npm list canvas

# 3. Image requirements:
#    - Min 50x50 pixels
#    - Max 5MB
#    - Valid format

# 4. Check DCT hash generation:
# lib/image-similarity.ts line 120-150

# 5. Test locally:
import { calculateImageSimilarity, loadImage } from '@/lib/image-similarity';
const buffer1 = fs.readFileSync('logo1.png');
const buffer2 = fs.readFileSync('logo2.png');
const score = await calculateImageSimilarity(buffer1, buffer2);
console.log('Similarity:', score);  // Should be 0-100
```

---

### 6. Performance Issues

#### Search is slow (>30 seconds)
**Causes & Solutions:**
```bash
# 1. Check database query speed:
psql $DATABASE_URL -c "\timing on"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM uspto_trademarks WHERE mark_soundex = 'N200';"

# Should return < 1 second

# 2. Check indexes exist:
psql $DATABASE_URL -c "\d+ uspto_trademarks"
# Should show: idx_mark_soundex, idx_mark_text_normalized

# 3. Create missing indexes:
CREATE INDEX idx_mark_soundex ON uspto_trademarks(mark_soundex);
CREATE INDEX idx_mark_text_normalized ON uspto_trademarks(mark_text_normalized);

# 4. Analyze query plan:
EXPLAIN ANALYZE SELECT * FROM uspto_trademarks
WHERE mark_soundex = 'N200' LIMIT 100;

# 5. Disable TSDR verification (slow):
# Set includeUSPTOVerification: false

# 6. Check CPU/Memory:
# Vercel dashboard → Monitoring
# Should use < 1GB memory
```

#### Memory usage increasing over time
**Causes & Solutions:**
```bash
# 1. Check memory on server:
free -h  # Linux
vm_stat  # macOS

# 2. Restart application:
npm stop && npm start

# 3. Clear Redis cache:
redis-cli FLUSHALL  # Local Redis
# OR Upstash dashboard → Purge

# 4. Check for memory leaks:
# Review app/api/*/route.ts for unreleased resources

# 5. Limit concurrent operations:
# Edit src/core/services/TrademarkSearchService.ts
# Reduce batch size or concurrency
```

#### Database connection pooling exhausted
**Error:** `remaining connection slots are reserved`
**Causes & Solutions:**
```bash
# 1. Check active connections:
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Should be < (max_connections - 10)
# Supabase default: 100 max

# 2. Increase connection limit:
# Supabase dashboard → Settings → Database → Connection Limits

# 3. Check for hanging queries:
psql $DATABASE_URL -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"

# 4. Kill hanging queries:
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE query LIKE '%SELECT%' AND query_start < now() - interval '10 minutes';
```

---

### 7. Rate Limiting Issues

#### Error: `429 Too Many Requests`
**Cause:** Rate limit exceeded
**Solutions:**
```bash
# 1. Check rate limit config in .env:
RATE_LIMIT_WINDOW_MS=60000  # Per minute
RATE_LIMIT_MAX_REQUESTS=60

# 2. Increase limits (if needed):
# Only for trusted internal usage
RATE_LIMIT_MAX_REQUESTS=200

# 3. Check which IP is hitting limit:
# View in Upstash Redis dashboard

# 4. Implement request queuing on client:
// queue requests instead of hammering API
const queue = [];
const process = async () => {
  if (queue.length > 0) {
    await fetch(...queue.pop());
    setTimeout(process, 1000); // 1 sec between requests
  }
};
```

---

### 8. External Service Issues

#### USPTO TSDR API not responding
**Symptoms:** `/api/search` hangs or returns partial results
**Solutions:**
```bash
# 1. Check USPTO status:
curl https://tsdr.uspto.gov/statsxml?caseNumber=88000001

# 2. Disable TSDR verification temporarily:
includeUSPTOVerification: false

# 3. Check firewall/proxy:
# Some networks block USPTO
# Verify from server: curl -v https://tsdr.uspto.gov/

# 4. Implement retry logic:
# Already handled in lib/uspto-verification.ts
# Check retry count in logs
```

#### Google DNS failing
**Symptoms:** Domain check returns all "UNKNOWN"
**Solutions:**
```bash
# 1. Test DNS lookup:
dig @8.8.8.8 google.com

# 2. Check firewall:
# Some networks block Google DNS (8.8.8.8)

# 3. Use different DNS:
# Edit lib/domain-check.ts, try 1.1.1.1 (Cloudflare)

# 4. Disable domain check:
# Remove from /api/clearance if not critical
```

#### Google Custom Search rate limited
**Symptoms:** Common law search returns `dailyLimitExceeded`
**Solutions:**
```bash
# 1. Check API quota:
# Google Cloud Console → Custom Search → Quotas

# Free tier: 100 queries/day
# Paid: $5 per 1000 queries

# 2. Upgrade to paid in Google Cloud:
# Search → Custom Search → Billing

# 3. Or disable Google search:
GOOGLE_API_KEY=  # Leave empty
# Common law search will only show manual links
```

---

### 9. Deployment Issues

#### Deploy fails: "Build timed out"
**Cause:** npm install or build taking > 15 minutes
**Solutions:**
```bash
# 1. Verify package.json has no problematic packages
npm audit

# 2. Use npm ci instead of npm install:
# In Vercel: Settings → Build & Development Settings

# 3. Remove unused dependencies:
npm prune --production

# 4. Increase timeout (Vercel):
# Settings → Build & Development Settings → Build Command
# vercel build --timeout 1800  # 30 minutes
```

#### Deploy fails: "Module not found"
**Cause:** Missing required files or imports
**Solutions:**
```bash
# 1. Local build test:
npm run build

# 2. Check file paths (case-sensitive on Linux!):
# Windows: /lib/Similarity.ts works
# Linux: /lib/Similarity.ts fails (must be /lib/similarity.ts)

# 3. Verify imports in route files:
grep -r "import.*from" app/api/ | grep "../"
```

#### Environment variables not loading
**Cause:** Variables not set or wrong format
**Solutions:**
```bash
# 1. Vercel: Settings → Environment Variables (add all)
# 2. Heroku: Config Vars (add all)
# 3. Docker: Pass as -e flags

# 4. Test locally:
echo $DATABASE_URL
echo $NEXT_PUBLIC_APP_URL

# 5. Never commit .env.local!
git status | grep .env
```

---

## Health Check

**Test if deployment is healthy:**

```bash
# 1. Check home page
curl https://yourdomain.com/

# 2. Test search API
curl -X POST https://yourdomain.com/api/search \
  -H "Content-Type: application/json" \
  -d '{"markText": "TEST"}'

# 3. Check database
curl https://yourdomain.com/api/test-db

# 4. View logs
# Vercel: vercel logs
# Docker: docker logs container-name

# 5. Monitor resources
# CPU: Should be < 50% average
# Memory: Should be < 500MB
# Response time: Should be < 5s (p50), < 10s (p95)
```

---

## Support Contacts

- **Documentation:** README.md, DEPLOYMENT.md
- **Issues:** Check GitHub Issues
- **Supabase Help:** https://supabase.com/help
- **Upstash Support:** https://upstash.com/support
- **Vercel Support:** https://vercel.com/support
- **Node.js Docs:** https://nodejs.org/docs/

---

## Debugging Checklist

When something breaks:

```
□ Check .env variables are set
□ Verify DATABASE_URL works: psql $DATABASE_URL -c "SELECT 1"
□ Check logs (F12 console, server logs, platform dashboard)
□ Test API endpoint directly with curl
□ Verify dependencies installed: npm list [package]
□ Check network tab in browser (F12)
□ Review recent code changes (git diff)
□ Clear cache: browser cache, Redis, database query cache
□ Restart server
□ Review error messages carefully (search online)
□ Test locally: npm run dev
□ Check external service status (USPTO, Google)
□ Monitor resource usage (CPU, memory, connections)
```
