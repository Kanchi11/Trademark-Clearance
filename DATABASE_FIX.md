## 🔧 **QUICK FIX: Database Connection Issue**

### Problem
Your search is failing because the pgbouncer connection is timing out.  
Current URL: `postgresql://...@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true`

### Solution
You need to use the **direct connection** URL instead of pgbouncer for this app.

### Steps:

1. **Go to Supabase Dashboard:**
   - Visit https://supabase.com/dashboard
   - Select your project

2. **Get Direct Connection String:**
   - Click "Project Settings" → "Database"
   - Scroll to "Connection string"
   - Choose **"Connection pooling"** → **"Session mode"**
   - OR use **"Direct connection"** (port 5432)
   - Copy the connection string

3. **Update .env.local:**
   ```bash
   # Replace this line in /Users/kanchanads/Documents/Arcangel/trademark-clearance/.env.local:
   
   # OLD (pgbouncer - transaction mode):
   DATABASE_URL=postgresql://postgres.shdscvascrpyxdbnwioi:Santhwanam%4011@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
   
   # NEW (session mode or direct):
   DATABASE_URL=postgresql://postgres.shdscvascrpyxdbnwioi:Santhwanam%4011@aws-1-us-east-2.pooler.supabase.com:5432/postgres
   # OR use session mode:
   DATABASE_URL=postgresql://postgres.shdscvascrpyxdbnwioi:Santhwanam%4011@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&pool_mode=session
   ```

4. **Restart Server:**
   ```bash
   # Kill existing server
   pkill -f "next dev"
   
   # Start fresh
   cd /Users/kanchanads/Documents/Arcangel/trademark-clearance
   npm run dev
   ```

### Why This Fixes It:
- **Transaction mode** (port 6543 with pgbouncer) doesn't support prepared statements properly
- **Session mode** or **Direct connection** (port 5432) allows full PostgreSQL features
- Your complex UNION ALL queries need session-level features

### Alternative Quick Fix (if you can't change URL):

Add `?pgbouncer=true&pool_mode=session` to your current URL instead of just `?pgbouncer=true`

---

**After updating, search should work in ~2-5 seconds!** ✅
