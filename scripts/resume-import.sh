#!/bin/bash
# Resume re-import from file 3 (after crash)
# Using ultra-small batches (50) + connection pool limits

cd "$(dirname "$0")/.."

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

echo "🔄 Resuming re-import (ultra-conservative mode for Supabase)"
echo "============================================================"
echo ""
echo "Starting from file #3 (files 1-2 already completed)"
echo "Batch size: 50 (10x slower but Supabase-friendly)"
echo "Connection pool: Limited to 5 concurrent connections"
echo "File pause: 10 seconds between files"
echo ""

XML_DIR="downloads"

# Get list of all XML files
FILES=($(ls -1 "$XML_DIR"/*.xml | sort))
TOTAL_FILES=${#FILES[@]}

# Start from file index 2 (file #3, since array is 0-indexed)
START_INDEX=2
CURRENT=$START_INDEX

echo "Total files: $TOTAL_FILES"
echo "Resuming from: file #$((START_INDEX + 1))"
echo ""

START_TIME=$(date +%s)

for ((i=$START_INDEX; i<$TOTAL_FILES; i++)); do
  xml_file="${FILES[$i]}"
  CURRENT=$((i + 1))
  FILENAME=$(basename "$xml_file")
  FILESIZE=$(ls -lh "$xml_file" | awk '{print $5}')

  FILE_START=$(date +%s)

  echo "[$CURRENT/$TOTAL_FILES] Processing: $FILENAME ($FILESIZE)"
  echo "  Started: $(date +%H:%M:%S)"

  npx tsx scripts/import-uspto-sax.ts --file "$xml_file"
  EXIT_CODE=$?

  FILE_END=$(date +%s)
  FILE_DURATION=$((FILE_END - FILE_START))

  if [ $EXIT_CODE -eq 0 ]; then
    echo "  ✅ Completed: $(date +%H:%M:%S) (${FILE_DURATION}s)"
  else
    echo "  ❌ FAILED: $(date +%H:%M:%S)"
    echo ""
    echo "Import failed on file: $FILENAME"
    echo "You can resume later from file #$CURRENT"
    exit 1
  fi

  # Brief pause between files to let database recover
  echo "  ⏸️  Pausing 10s before next file..."
  sleep 10
  echo ""
done

END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))
MINUTES=$((TOTAL_DURATION / 60))
SECONDS=$((TOTAL_DURATION % 60))

echo ""
echo "✅ Re-import complete!"
echo "Total time: ${MINUTES}m ${SECONDS}s"
echo ""
echo "Checking final status distribution..."
sleep 3
curl -s http://localhost:3001/api/debug/status-check 2>&1 | python3 -c "import sys, json; d=json.load(sys.stdin); d.get('statusDistribution') and [print(f'{r[\"status\"]}: {int(r[\"count\"]):,}') for r in d['statusDistribution']] or print('Database still recovering...')" 2>/dev/null

echo ""
echo "✅ Done! Status codes now corrected based on USPTO data."
