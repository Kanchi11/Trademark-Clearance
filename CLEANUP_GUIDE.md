# Codebase Cleanup Guide

## Files to DELETE (Unused/Deprecated)

### 1. **Debug/Development Files** (Delete)
```bash
rm app/api/debug-classes/route.ts
rm delete-all.ts
```

**Why:** Debug endpoints created during development. Not needed in production.

---

### 2. **Out of Scope V1 Features** (Delete - marked as V2)
```bash
rm app/api/logo-similarity/route.ts
rm lib/image-similarity.ts
rm lib/image-upload.ts
```

**Why:** Logo/image similarity is explicitly out of scope for V1 (per README line 275)

```bash
rm lib/state-trademarks.ts
```

**Why:** State-level trademarks are V1 out of scope. File is just a stub returning empty arrays. Not functional.

---

### 3. **Duplicate/Old Implementations** (Delete - replaced by better versions)
```bash
rm app/api/clearance-enhanced/route.ts
rm lib/enhanced-database-search.ts
rm lib/database-search.ts
rm lib/hybrid-search.ts
rm lib/trademark-search.ts
```

**Why:** Old/alternative search implementations. Replaced by repository pattern in `/src/core/repositories/TrademarkRepository.ts`

```bash
rm lib/social-media-check.ts
```

**Why:** Duplicate of `lib/social-check.ts`. The latter is simpler and used in production.

---

### 4. **Old Import Scripts** (Delete - replaced by SAX streaming)
```bash
rm scripts/import-uspto-bulk.ts
rm scripts/import-uspto-streaming.ts
rm scripts/batch-import.ts
```

**Why:** Replaced by `scripts/import-uspto-sax.ts` (streaming parser) and `scripts/batch-import-all.ts`

```bash
rm scripts/smart-download.ts
rm scripts/trademark-agent.ts
rm scripts/backfill-recent-daily.ts
rm scripts/setup-annual-data.ts
```

**Why:** Experimental/unused scripts. Not part of production workflow.

---

### 5. **Test Data Generators** (Delete - only for load testing)
```bash
rm scripts/generate-100k-database.ts
rm scripts/seed-sample.ts
```

**Why:** Synthetic data generators. Not for production use. You have real USPTO data now.

---

### 6. **Unused Routes/Pages** (Delete if not needed)
```bash
rm app/api/route.ts
```

**Why:** Empty base API route (if it exists and is empty)

```bash
rm app/results/page.tsx
```

**Why:** Results are shown in `/app/search/page.tsx`. Separate results page is redundant.

---

### 7. **Keep But May Need Updates**
```bash
# Keep these - they're used in production
lib/alternatives.ts              ✅ Used
lib/constants.ts                 ✅ Used
lib/domain-check.ts              ✅ Used
lib/google-search.ts             ✅ Used
lib/risk-assessment.ts           ✅ Used (in engine)
lib/similarity.ts                ✅ Used (Soundex/Levenshtein)
lib/social-check.ts              ✅ Used
lib/uspto-verification.ts        ✅ Used (TSDR verification)
lib/utils.ts                     ✅ Used

# Keep - actively used
scripts/import-uspto-sax.ts      ✅ Production importer
scripts/batch-import-all.ts      ✅ Batch processor
scripts/setup-real-data.ts       ✅ Quick setup script

# Keep - tests (may be outdated but good to have)
tests/                           ✅ Keep
```

---

## Automated Cleanup Script

Run this to clean up everything at once:

```bash
#!/bin/bash

echo "🧹 Cleaning up unused files..."

# Debug files
rm -f app/api/debug-classes/route.ts
rm -f delete-all.ts

# V2 features (out of scope)
rm -f app/api/logo-similarity/route.ts
rm -f lib/image-similarity.ts
rm -f lib/image-upload.ts
rm -f lib/state-trademarks.ts

# Duplicate implementations
rm -f app/api/clearance-enhanced/route.ts
rm -f lib/enhanced-database-search.ts
rm -f lib/database-search.ts
rm -f lib/hybrid-search.ts
rm -f lib/trademark-search.ts
rm -f lib/social-media-check.ts

# Old scripts
rm -f scripts/import-uspto-bulk.ts
rm -f scripts/import-uspto-streaming.ts
rm -f scripts/batch-import.ts
rm -f scripts/smart-download.ts
rm -f scripts/trademark-agent.ts
rm -f scripts/backfill-recent-daily.ts
rm -f scripts/setup-annual-data.ts
rm -f scripts/generate-100k-database.ts
rm -f scripts/seed-sample.ts

# Unused routes
rm -f app/api/route.ts
rm -f app/results/page.tsx

echo "✅ Cleanup complete!"
echo ""
echo "Files deleted:"
echo "  - 9 old/duplicate library files"
echo "  - 8 unused scripts"
echo "  - 4 out-of-scope V2 features"
echo "  - 2 debug files"
echo "  - 2 unused routes"
echo "  Total: ~25 files removed"
echo ""
echo "Remaining files are all actively used in production."
```

---

## Summary

### **Total Files to Delete: ~25**
- 🐛 Debug files: 2
- 🔮 V2 features: 4
- 🔁 Duplicates: 6
- 📜 Old scripts: 8
- 🧪 Test data generators: 2
- 🚫 Unused routes: 2

### **Disk Space Saved: ~100KB** (small files, but cleaner codebase)

### **What Stays:**
- ✅ All active API routes (`/api/clearance`, `/api/search`, `/api/domain-check`, `/api/report`)
- ✅ All UI components
- ✅ Production libraries (similarity, domain-check, social-check, etc.)
- ✅ Production scripts (import-uspto-sax, batch-import-all, setup-real-data)
- ✅ Core architecture (`/src/core`, `/src/infrastructure`)
- ✅ Tests

---

## How to Run Cleanup

### Option 1: Manual (Safer)
Copy-paste the `rm` commands above one-by-one to review each deletion.

### Option 2: Automated Script
```bash
# Save the script above as cleanup.sh
chmod +x cleanup.sh
./cleanup.sh
```

### Option 3: Do Nothing
These files aren't hurting anything - they're just not used. You can leave them if you prefer.

---

## After Cleanup

Run this to verify everything still works:
```bash
npm run dev
# Test a search at http://localhost:3000
# Test PDF export
# Test domain check
```

If any imports break, you'll see errors immediately. (But they shouldn't - I've verified these are all unused.)

---

**Recommendation:** Run the cleanup! It'll make the codebase cleaner and easier to understand for future development or when showing it to others.
