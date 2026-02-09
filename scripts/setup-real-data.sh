#!/bin/bash
# scripts/setup-real-data.sh
# Quick script to clear synthetic data and import real USPTO trademarks

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Trademark Clearance - Real Data Setup                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo

# Check DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set!"
  echo "   Set it in .env.local or export it:"
  echo "   export DATABASE_URL='postgresql://...'"
  exit 1
fi

echo "✅ DATABASE_URL detected"
echo

# Step 1: Confirm with user
echo "This script will:"
echo "  1. Clear synthetic sample data (if any)"
echo "  2. Download real USPTO trademark data (~1-2K records)"
echo "  3. Import into your database"
echo
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 1
fi

echo

# Step 2: Clear synthetic data
echo "🧹 Clearing synthetic sample data..."
psql $DATABASE_URL -c "DELETE FROM uspto_trademarks;" 2>/dev/null || true
echo "✅ Cleared"
echo

# Step 3: Import real data
echo "📥 Importing real USPTO trademark data..."
echo "   (Downloading from bulkdata.uspto.gov...)"
echo

# Try to download today's date first, fallback to a known date
TODAY=$(date +%y%m%d)
YESTERDAY=$(date -d yesterday +%y%m%d 2>/dev/null || date -v-1d +%y%m%d 2>/dev/null)

# Try today first
URL="https://bulkdata.uspto.gov/data/trademark/dailyxml/applications/apc${TODAY}.zip"
echo "Trying: $URL"

if npm run data:import -- --url "$URL" 2>/dev/null; then
  echo "✅ Import succeeded!"
elif [ ! -z "$YESTERDAY" ]; then
  echo "⚠️  Today's file not available, trying yesterday..."
  URL="https://bulkdata.uspto.gov/data/trademark/dailyxml/applications/apc${YESTERDAY}.zip"
  npm run data:import -- --url "$URL"
  echo "✅ Import succeeded!"
else
  echo "⚠️  Couldn't download recent data"
  echo "   Try manually: npm run data:import -- --url <URL>"
  exit 1
fi

echo

# Step 4: Verify
echo "🔍 Verifying data..."
RECORD_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM uspto_trademarks;")
echo

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   ✅ SUCCESS                                               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo
echo "📊 Database Statistics:"
echo "   Total marks imported: $RECORD_COUNT"
echo
echo "🧪 Test the search:"
echo "   npm run dev"
echo "   Visit: http://localhost:3000/search"
echo "   Try searching for: NIKE, APPLE, GOOGLE, AMAZON, MICROSOFT"
echo
echo "📚 For annual backfile (production):"
echo "   npm run data:import -- --file ./tm-yearly-2024.zip"
echo
