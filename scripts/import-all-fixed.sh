#!/bin/bash
# Import all USPTO XML files with FIXED status mapping
# This will correctly map statuses: 600-699=abandoned, 1-15=live, rest=pending

cd "$(dirname "$0")/.."

echo "🚀 Starting USPTO Import with FIXED Status Mapping"
echo "===================================================="
echo ""
echo "Database: NEW Supabase (psksupeawsueyqvtwudc)"
echo "Files to import: 22 XML files"
echo "Status mapping: FIXED ✅"
echo "  - Codes 600-699 → abandoned"
echo "  - Codes 1-15    → live"
echo "  - All others    → pending"
echo ""
echo "⏰ Estimated time: 4-6 hours"
echo ""

# Get all XML files (zsh compatible)
FILES=($(find downloads -name "*.xml" -type f | sort))

TOTAL=${#FILES[@]}
CURRENT=0

echo "📂 Found $TOTAL XML files to import"
echo ""

# Import each file
for xml_file in "${FILES[@]}"; do
  CURRENT=$((CURRENT + 1))
  FILENAME=$(basename "$xml_file")

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "[$CURRENT/$TOTAL] Importing: $FILENAME"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  npx tsx scripts/import-uspto-sax.ts "$xml_file"

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
echo "Next steps:"
echo "  1. Verify status distribution with: npx tsx scripts/check-status-distribution.ts"
echo "  2. Test search functionality"
echo ""
