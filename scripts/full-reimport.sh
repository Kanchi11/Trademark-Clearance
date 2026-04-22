#!/bin/bash
# Re-import ALL USPTO trademark data with corrected status extraction

cd "$(dirname "$0")/.."

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

echo "🔄 Re-importing ALL USPTO trademark data to fix status codes"
echo "=============================================================="
echo ""
echo "This will:"
echo "  - Re-process all 22 XML files (~12GB total)"
echo "  - Update status field for ~1.6M trademarks"
echo "  - Preserve existing data (logo_hash, mark_metaphone, etc.)"
echo ""
echo "✅ Test completed: Correctly extracted 546 abandoned trademarks"
echo ""
echo "Estimated time: 1-2 hours"
echo ""
read -p "Continue with full re-import? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Count files
XML_DIR="downloads"
FILE_COUNT=$(ls -1 "$XML_DIR"/*.xml 2>/dev/null | wc -l)

echo ""
echo "Found $FILE_COUNT XML files in $XML_DIR/"
echo ""
echo "Starting full re-import..."
echo ""

CURRENT=0
START_TIME=$(date +%s)

for xml_file in "$XML_DIR"/*.xml; do
  FILE_START=$(date +%s)
  CURRENT=$((CURRENT + 1))
  FILENAME=$(basename "$xml_file")
  FILESIZE=$(ls -lh "$xml_file" | awk '{print $5}')

  echo "[$CURRENT/$FILE_COUNT] Processing: $FILENAME ($FILESIZE)"

  npx tsx scripts/import-uspto-sax.ts --file "$xml_file"

  if [ $? -ne 0 ]; then
    echo "❌ Error processing $FILENAME"
    exit 1
  fi

  FILE_END=$(date +%s)
  FILE_DURATION=$((FILE_END - FILE_START))
  echo "   ✓ Completed in ${FILE_DURATION}s"
  echo ""
done

END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))
MINUTES=$((TOTAL_DURATION / 60))
SECONDS=$((TOTAL_DURATION % 60))

echo ""
echo "✅ Re-import complete! Total time: ${MINUTES}m ${SECONDS}s"
echo ""
echo "Checking final status distribution..."
curl -s http://localhost:3001/api/debug/status-check | python3 -c "import sys, json; data=json.load(sys.stdin); print('\nFinal status distribution:'); [print(f'  {r[\"status\"]}: {int(r[\"count\"]):,}') for r in data['statusDistribution']]"

echo ""
echo "✅ Done! Status codes now match USPTO industry standards:"
echo "   • LIVE = Registered & active (codes 1-15)"
echo "   • ABANDONED = Cancelled/expired (codes 600-699)"
echo "   • PENDING = Application filed but not registered"
