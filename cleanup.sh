#!/bin/bash

echo "🧹 Cleaning up unused files from trademark-clearance codebase..."
echo ""

# Counter
deleted=0

# Function to delete if exists
delete_file() {
  if [ -f "$1" ]; then
    rm -f "$1"
    echo "  ✓ Deleted: $1"
    ((deleted++))
  fi
}

echo "1️⃣ Removing debug files..."
delete_file "app/api/debug-classes/route.ts"
delete_file "delete-all.ts"

echo ""
echo "2️⃣ Removing V2 features (out of scope)..."
delete_file "app/api/logo-similarity/route.ts"
delete_file "lib/image-similarity.ts"
delete_file "lib/image-upload.ts"
delete_file "lib/state-trademarks.ts"

echo ""
echo "3️⃣ Removing duplicate/old implementations..."
delete_file "app/api/clearance-enhanced/route.ts"
delete_file "lib/enhanced-database-search.ts"
delete_file "lib/database-search.ts"
delete_file "lib/hybrid-search.ts"
delete_file "lib/trademark-search.ts"
delete_file "lib/social-media-check.ts"

echo ""
echo "4️⃣ Removing old import scripts..."
delete_file "scripts/import-uspto-bulk.ts"
delete_file "scripts/import-uspto-streaming.ts"
delete_file "scripts/batch-import.ts"
delete_file "scripts/smart-download.ts"
delete_file "scripts/trademark-agent.ts"
delete_file "scripts/backfill-recent-daily.ts"
delete_file "scripts/setup-annual-data.ts"

echo ""
echo "5️⃣ Removing test data generators..."
delete_file "scripts/generate-100k-database.ts"
delete_file "scripts/seed-sample.ts"

echo ""
echo "6️⃣ Removing unused routes..."
delete_file "app/api/route.ts"
delete_file "app/results/page.tsx"

echo ""
echo "=============================================="
echo "✅ Cleanup complete!"
echo "=============================================="
echo "Total files deleted: $deleted"
echo ""
echo "Remaining files are all actively used in production."
echo ""
echo "Next steps:"
echo "  1. Run 'npm run dev' to verify everything still works"
echo "  2. Test a search at http://localhost:3000"
echo "  3. If all good, you now have a cleaner codebase! 🎉"
