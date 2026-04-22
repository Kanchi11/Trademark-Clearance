#!/bin/bash
# Import all USPTO XML files with FIXED status mapping

cd "$(dirname "$0")/.."

echo "🚀 Starting USPTO Import with FIXED Status Mapping"
echo "===================================================="
echo ""
echo "Database: NEW Supabase (psksupeawsueyqvtwudc)"
echo "Status mapping: FIXED ✅"
echo "  - Codes 600-699 → abandoned"
echo "  - Codes 1-15    → live"
echo "  - All others    → pending"
echo ""

# Get all XML files
FILES=($(find downloads -name "*.xml" -type f | sort))
TOTAL=${#FILES[@]}

echo "📂 Found $TOTAL XML files to import"
echo "⏰ Estimated time: 4-6 hours"
echo ""

CURRENT=0

# Import each file
for xml_file in "${FILES[@]}"; do
  CURRENT=$((CURRENT + 1))
  FILENAME=$(basename "$xml_file")

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "[$CURRENT/$TOTAL] Importing: $FILENAME"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  npx tsx scripts/import-uspto-sax.ts --file "$xml_file"

  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ $FILENAME imported successfully"
    echo ""
  else
    echo ""
    echo "❌ $FILENAME failed to import"
    echo "⚠️  Continuing with next file..."
    echo ""
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Import Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
