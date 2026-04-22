#!/bin/bash
# Re-import USPTO trademark data with corrected status extraction
# This will update the status field for all trademarks

cd "$(dirname "$0")/.."

echo "🔄 Re-importing USPTO trademark data to fix status codes"
echo "=================================================="
echo ""
echo "This will:"
echo "  - Re-process 22 XML files"
echo "  - Update status field for ~1.6M trademarks"
echo "  - Preserve existing data (logo_hash, mark_metaphone, etc.)"
echo ""
echo "Estimated time: 30-60 minutes"
echo ""

# Count files
XML_DIR="downloads"
FILE_COUNT=$(ls -1 "$XML_DIR"/*.xml 2>/dev/null | wc -l)

echo "Found $FILE_COUNT XML files in $XML_DIR/"
echo ""
echo "Starting import..."
echo ""

CURRENT=0
for xml_file in "$XML_DIR"/*.xml; do
  CURRENT=$((CURRENT + 1))
  FILENAME=$(basename "$xml_file")

  echo "[$CURRENT/$FILE_COUNT] Processing: $FILENAME"

  npx tsx scripts/import-uspto-sax.ts --file "$xml_file"

  if [ $? -ne 0 ]; then
    echo "❌ Error processing $FILENAME"
    exit 1
  fi

  echo ""
done

echo ""
echo "✅ Re-import complete!"
echo ""
echo "Checking status distribution..."
npx tsx scripts/check-status-dist.ts

echo ""
echo "✅ Done! Check the status distribution above."
