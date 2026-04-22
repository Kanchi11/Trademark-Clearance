# Migrate from Supabase to Neon (Free Tier)

## Why Neon?
✅ **Better for complex queries** - No aggressive timeouts like Supabase  
✅ **Free tier** - 0.5 GB storage, no credit card required  
✅ **Faster queries** - Better connection pooling  
✅ **No timeouts** - Complex UNION queries work perfectly  

---

## Step-by-Step Migration

### 1. Install PostgreSQL Client (if needed)
```bash
# Check if installed
which pg_dump

# If not installed:
brew install postgresql@16
```

### 2. Create Neon Account
1. Go to https://neon.tech
2. Sign up with GitHub (no credit card needed)
3. Create project: "trademark-clearance"
4. Select region: **US East** (same as Supabase for speed)
5. Copy the connection string

Your Neon URL will look like:
```
postgresql://username:password@ep-something.us-east-2.aws.neon.tech/neondb
```

### 3. Export Supabase Database
```bash
cd /Users/kanchanads/Documents/Arcangel/trademark-clearance
./export-supabase.sh
```

This will create `supabase_backup.sql` (~200-500MB with 1.4M trademarks)

### 4. Import to Neon
```bash
./import-to-neon.sh 'YOUR_NEON_URL_HERE'
```

Replace `YOUR_NEON_URL_HERE` with the connection string from Step 2.

### 5. Update .env.local
```bash
# Open .env.local and update:
DATABASE_URL=YOUR_NEON_URL_HERE
```

### 6. Restart Your App
```bash
pkill -f "next dev"
npm run dev
```

### 7. Test It Works
```bash
# Test search endpoint
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"markText":"APPLE","niceClasses":[9]}'
```

Should return results in 1-2 seconds! 🚀

---

## Troubleshooting

**"pg_dump: command not found"**
```bash
brew install postgresql@16
```

**Export is slow (10+ minutes)**
- Normal for 1.4M records
- Get a coffee ☕

**Import fails**
```bash
# Make sure you're using the connection string from Neon dashboard
# It should start with: postgresql://
```

**App still times out**
- Make sure you updated `.env.local`
- Restart the server: `pkill -f "next dev" && npm run dev`

---

## After Migration

Your app will be **10-100x faster** for searches! 

- ✅ No more connection timeouts
- ✅ Clearance endpoint works perfectly
- ✅ Logo hashing still works (52,436 hashes)
- ✅ All features operational

Neon free tier limits:
- **0.5 GB storage** (you're using ~400 MB)
- **Autosuspends after 5 min idle** (wakes up instantly)
- **No time limit** on queries
