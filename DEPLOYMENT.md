# Production Deployment Checklist & Guide

## Overview
This is a production-ready trademark clearance checker built with Next.js, PostgreSQL, and real USPTO data. This guide covers deployment, scaling, monitoring, and security.

**Tech Stack:**
- **Frontend:** Next.js 16, React 19, Tailwind CSS, Radix UI
- **Backend:** Node.js, Drizzle ORM, PostgreSQL (Supabase)
- **Data:** Real USPTO trademark bulk XML
- **Cache:** Redis (Upstash) - optional
- **Monitoring:** Pino logging, Datadog/NewRelic compatible
- **Authentication:** OAuth optional (future)

---

## Phase 1: Environment & Infrastructure Setup

### 1.1 Database Setup (PostgreSQL)

**Option A: Supabase (Recommended for Quick Start)**
```bash
# 1. Create Supabase project: https://supabase.com
# 2. Get connection string from: Settings → Database → Connection String
# 3. Set in .env.local:
DATABASE_URL=postgresql://user:password@host:5432/db?pgbouncer=true
```

**Option B: Self-Hosted PostgreSQL**
```bash
# Docker setup:
docker run -d \
  --name trademark-db \
  -e POSTGRES_PASSWORD=secure_password \
  -e POSTGRES_DB=trademarks \
  -p 5432:5432 \
  postgres:16-alpine

# Connection string:
DATABASE_URL=postgresql://postgres:secure_password@localhost:5432/trademarks
```

**Initialize Database:**
```bash
npm run db:push  # Creates schema (idempotent)
```

### 1.2 Redis Setup (Optional but Recommended for Production)

**Option A: Upstash (Recommended)**
```bash
# Create free account: https://upstash.com
# Get credentials from dashboard
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx
```

**Option B: Docker Redis**
```bash
docker run -d \
  --name trademark-redis \
  -p 6379:6379 \
  redis:7-alpine
```

**Option C: AWS ElastiCache**
- Recommended for high-traffic production
- Enables cluster mode for scaling
- Automatic failover

### 1.3 Google APIs (Optional for Common Law Search)

```bash
# 1. Create Google Cloud project
# 2. Enable Custom Search API
# 3. Create API key + Search Engine ID
# 4. Set in .env.local:
GOOGLE_API_KEY=xxx
GOOGLE_SEARCH_ENGINE_ID=xxx
# Note: Free tier = 100 queries/day
```

### 1.4 Environment Variables

Create `.env.local` (or `.env.production` for production):

```bash
# Database (REQUIRED)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis (optional, in-memory cache used if not set)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Google Custom Search (optional)
GOOGLE_API_KEY=
GOOGLE_SEARCH_ENGINE_ID=

# Next.js (recommended for production)
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Logging (optional)
LOG_LEVEL=info  # error, warn, info, debug, trace

# Rate limiting (optional)
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000  # 1 minute
RATE_LIMIT_MAX_REQUESTS=60  # 60 requests per minute
```

**Security: Never commit `.env.local` to git!**
```bash
# Add to .gitignore:
.env.local
.env.production.local
```

---

## Phase 2: Data Import

### 2.1 Import Real USPTO Data

**One-time production import:**
```bash
# Option 1: Download latest daily feed (1-2 hours)
npm run data:import

# Option 2: Specify custom URL
npm run data:import -- --url https://bulkdata.uspto.gov/data/trademark/dailyxml/applications/apc250207.zip

# Option 3: Use local file
npm run data:import -- --file ./apc250207.xml

# Option 4: Limit records for testing
npm run data:import -- --limit 50000
```

**Full backfile import (one-time):**
```bash
# Download annual XML files from:
# https://developer.uspto.gov/product/trademark-annual-xml-applications

# Process each year:
npm run data:import -- --file ./tm-yearly-2023.xml
npm run data:import -- --file ./tm-yearly-2024.xml
npm run data:import -- --file ./tm-yearly-2025.xml
```

**Setup automatic daily updates:**
```bash
# Create a cron job (Linux/Mac):
0 2 * * * cd /path/to/app && npm run data:import >> /var/log/trademark-import.log 2>&1

# Or use GitHub Actions (schedule daily):
name: Daily USPTO Import
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily
jobs:
  import:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run data:import
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**Verify import:**
```bash
# Check record count
psql $DATABASE_URL -c "SELECT COUNT(*) FROM uspto_trademarks;"

# Sample records
psql $DATABASE_URL -c "SELECT * FROM uspto_trademarks LIMIT 5;"
```

---

## Phase 3: Build & Deploy

### 3.1 Local Build Testing

```bash
# Install dependencies
npm install

# Build
npm run build

# Start production server
npm start

# Should see: ready - started server on 0.0.0.0:3000
```

### 3.2 Vercel Deployment (Recommended)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel --prod

# 3. Set environment variables in Vercel dashboard:
#    Settings → Environment Variables
#    - DATABASE_URL
#    - UPSTASH_REDIS_REST_URL
#    - UPSTASH_REDIS_REST_TOKEN
#    - GOOGLE_API_KEY
#    - GOOGLE_SEARCH_ENGINE_ID
```

### 3.3 Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

**Deploy:**
```bash
docker build -t trademark-clearance .
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=xxx \
  -e NODE_ENV=production \
  trademark-clearance
```

### 3.4 AWS/DigitalOcean/Railway

See platform-specific guides:
- **AWS:** Use Elastic Beanstalk or ECS
- **DigitalOcean:** Use App Platform
- **Railway:** Use GitHub auto-deploy
- **Heroku:** Use `git push heroku main`

---

## Phase 4: Security Hardening

### 4.1 API Security

```bash
# 1. Enable HTTPS only (Vercel auto)
# 2. Add security headers in next.config.ts:
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
];

# 3. Add CORS headers (if needed)
# 4. Implement rate limiting
# 5. Input validation (Zod schemas already in place)
```

### 4.2 Database Security

```bash
# 1. Use least-privilege user for app:
CREATE USER trademark_app WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE trademarks TO trademark_app;
GRANT USAGE ON SCHEMA public TO trademark_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO trademark_app;

# 2. Enable SSL connections:
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# 3. Backup strategy:
- Daily automated backups (Supabase auto-handles)
- Store backups in separate region
- Test restore procedures monthly
```

### 4.3 Secrets Management

```bash
# Use environment secrets, NOT hardcoded values
# Platforms:
# - Vercel: Project Settings → Environment Variables
# - AWS: Secrets Manager / Parameter Store
# - GitHub Actions: Settings → Secrets
# - DigitalOcean: App → Settings → Variables
```

### 4.4 Rate Limiting

```bash
# Configured in lib/rate-limiter.ts (Upstash-based)
# Limits:
# - 60 requests/minute per IP
# - 1,000 requests/hour per API key
# - 10,000 requests/day per API key

# Customize in .env:
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
```

---

## Phase 5: Monitoring & Logging

### 5.1 Logging Setup

**Already integrated with Pino:**
```bash
# In app/api/*/route.ts files
import { logger } from '@/lib/logger';

logger.info('Search completed', {
  markText: 'NIKE',
  resultCount: 42,
  duration: 1234
});

logger.error('Search failed', { error, markText });
```

**Viewing logs:**

```bash
# Local development
npm run dev  # Logs appear in console

# Production (Vercel)
vercel logs  # View live logs

# Production (Docker)
docker logs -f trademark-clearance
```

### 5.2 Datadog Integration (Optional)

```bash
# 1. Install Datadog agent
npm install @datadog/browser-rum @datadog/browser-logs

# 2. Initialize in app layout
import { datadogConfig } from '@/lib/monitoring/datadog';
datadogConfig.init();

# 3. Logs auto-sent to Datadog
```

### 5.3 Error Tracking (Sentry Alternative)

```bash
# Install Sentry
npm install @sentry/nextjs

# Configure in app/layout.tsx
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### 5.4 Key Metrics to Monitor

```
- API response time (p50, p95, p99)
- Search success rate %
- Database query time
- Cache hit rate %
- Error rate by endpoint
- USPTO TSDR verification success rate
- Domain check availability
- PDF generation duration
- Rate limit hits
```

---

## Phase 6: Performance Optimization

### 6.1 Database Optimization

```sql
-- Add indexes for fast searches
CREATE INDEX idx_mark_text_normalized ON uspto_trademarks(mark_text_normalized);
CREATE INDEX idx_mark_soundex ON uspto_trademarks(mark_soundex);
CREATE INDEX idx_status ON uspto_trademarks(status);
CREATE INDEX idx_nice_classes ON uspto_trademarks USING GIN(nice_classes);

-- Analyze query plans
EXPLAIN ANALYZE SELECT * FROM uspto_trademarks
WHERE mark_text_normalized LIKE '%nike%'
AND status = 'live';
```

### 6.2 API Response Optimization

```bash
# 1. Enable gzip compression (Next.js auto)
# 2. Cache searches by query hash (Redis)
# 3. Batch USPTO TSDR verification (5 concurrent max)
# 4. Return paginated results (default 100 per page)
```

### 6.3 Image Optimization

```bash
# Already implemented:
# - Canvas-based image resize (32x32)
# - Grayscale conversion
# - Perceptual hash (64-bit)
# - ~100 bytes per image hash
```

---

## Phase 7: Scaling Strategies

### 7.1 Horizontal Scaling

**Database:**
- Use connection pooling (Supabase auto-pools)
- Read replicas for heavy queries
- Partition large tables if > 100M rows

**Cache:**
- Upstash Redis (auto-scales)
- Configure max memory policy: `allkeys-lru`

**Frontend:**
- Vercel auto-scales (serverless)
- CDN for static assets (Vercel edge network)

### 7.2 Load Testing

```bash
# Install k6
npm install -g k6

# Run load test
k6 run load-test.js

# Or use Apache Bench
ab -n 1000 -c 100 http://localhost:3000/api/search
```

### 7.3 Caching Strategy

```
- Search queries: Cache 1 hour (by parameterized hash)
- USPTO data: No cache (updated via daily imports)
- Domain availability: Cache 24 hours
- Social links: Cache 7 days (static links)
- PDF reports: Generate on-demand (no cache)
```

---

## Phase 8: Maintenance & Operations

### 8.1 Database Maintenance

```bash
# Weekly VACUUM
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Check bloat
psql $DATABASE_URL -c "\dx"

# Monitor connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Max connections: 100 (Supabase default)
```

### 8.2 Backup & Disaster Recovery

```bash
# Supabase auto-backups: 7-day retention
# Restore from Supabase dashboard: Backups

# Manual backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup-20250207.sql
```

### 8.3 Incident Response

**Search is slow:**
- Check DB connections (max 100)
- Clear cache if corrupted
- Check USPTO TSDR verification (can timeout)

**High error rate:**
- Check external API status (USPTO, Google)
- Verify DB connectivity
- Check rate limits

**Out of storage:**
- Delete old search records (keep 90 days)
- Archive image uploads
- Compress logs

---

## Phase 9: Cost Optimization

**Typical Monthly Costs:**

| Service | Cost | Notes |
|---------|------|-------|
| Supabase | $25 | Database, auth, backups |
| Upstash Redis | $0-10 | Free tier + overage |
| Vercel | $0-20 | Free to ~100k requests |
| Domain | $10-15 | .com/.io |
| **Total** | **$50-75** | |

**Cost reduction:**
- Use AWS Lambda + RDS (cheaper for low traffic)
- Self-host on DigitalOcean ($6/mo droplet)
- Use PostgreSQL backfile (load once, daily updates)
- Reduce image storage (delete 90+ day uploads)

---

## Phase 10: Compliance & Legal

### 10.1 Data Privacy

- **GDPR:** No user tracking, searches not stored by default
- **CCPA:** Privacy policy on site
- **Disclaimer:** Included in PDF reports

### 10.2 Terms of Service

Include in `/public/tos.txt`:
```
1. Not legal advice - consult attorney
2. USPTO data is public domain
3. No warranties for accuracy
4. Rate limits apply
5. User responsible for their filings
```

### 10.3 Liability Waiver

In report PDF:
```
DISCLAIMER: This tool is for informational purposes only and does
NOT constitute legal advice. Always consult a qualified trademark
attorney for final clearance before filing.
```

---

## Deployment Checklist

```bash
□ Database setup (Supabase/PostgreSQL)
□ Run db:push (schema creation)
□ Import USPTO data (npm run data:import)
□ Set all environment variables
□ npm run build (verify no errors)
□ Enable HTTPS/SSL
□ Implement rate limiting
□ Setup logging/monitoring
□ Configure backups
□ Add security headers
□ Test all API endpoints
□ Load test (k6/ab)
□ Setup CI/CD pipeline
□ Document runbooks
□ Plan incident response
□ Setup alerts
□ Configure auto-scaling
□ Verify compliance (GDPR/CCPA)
```

---

## Support & Resources

- **Documentation:** README.md in repo
- **Issues:** GitHub Issues
- **Monitoring:** Check Vercel/platform dashboard
- **Logs:** See Logging section above
- **Performance:** Monitor /api/metrics endpoint (custom)

---

## Quick Start Production Commands

```bash
# One-time setup
npm install
npm run db:push
npm run data:import

# Build for production
npm run build

# Run production server
NODE_ENV=production npm start

# Monitor logs
tail -f /var/log/trademark-app.log

# Backup database
pg_dump $DATABASE_URL > backup.sql

# Check health
curl https://yourdomain.com/api/health
```
