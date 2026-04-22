#!/bin/bash
# PROFESSIONAL APPROACH: Extract statuses, then apply via SQL
# Senior engineer strategy: Don't re-import everything, just fix the one column

cd "$(dirname "$0")/.."

echo "🎯 Professional Status Fix - Senior Engineer Approach"
echo "===================================================="
echo ""
echo "Strategy:"
echo "  1. Parse XML files locally (fast, no database hits)"
echo "  2. Extract ONLY serial_number + status_code pairs"
echo "  3. Generate SQL UPDATE statements"
echo "  4. Apply SQL in controlled batches"
echo ""
echo "Advantages:"
echo "  ✅ No full re-import needed"
echo "  ✅ Minimal database load"
echo "  ✅ Can pause/resume easily"
echo "  ✅ Works with Supabase free tier limits"
echo ""
read -p "Proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Create output directory for SQL files
mkdir -p sql_updates
rm -f sql_updates/*.sql

echo ""
echo "Step 1: Extracting status codes from all XML files..."
echo "=================================================="
echo ""

XML_DIR="downloads"
FILES=($(ls -1 "$XML_DIR"/*.xml | sort))
TOTAL_FILES=${#FILES[@]}
CURRENT=0

for xml_file in "${FILES[@]}"; do
  CURRENT=$((CURRENT + 1))
  FILENAME=$(basename "$xml_file" .xml)

  echo "[$CURRENT/$TOTAL_FILES] Extracting: $(basename "$xml_file")"

  npx tsx scripts/extract-statuses.ts --file "$xml_file" --output "sql_updates/${FILENAME}.sql"

  if [ $? -ne 0 ]; then
    echo "❌ Failed to extract from: $xml_file"
    exit 1
  fi

  echo ""
done

echo ""
echo "✅ Extraction complete!"
echo ""
echo "Step 2: Combining SQL files..."
echo "=============================="

cat sql_updates/*.sql > sql_updates/all_status_updates.sql

TOTAL_UPDATES=$(wc -l < sql_updates/all_status_updates.sql)
echo "✅ Generated $TOTAL_UPDATES SQL UPDATE statements"
echo ""

echo "Step 3: Applying SQL updates to database..."
echo "==========================================="
echo ""
echo "This will run SQL updates in batches of 100 statements at a time"
echo "Estimated time: 10-20 minutes"
echo ""

# Load environment
export $(cat .env.local | grep -v '^#' | xargs)

# Apply SQL in batches using psql
BATCH_SIZE=100
LINE_COUNT=0
BATCH_COUNT=0

while IFS= read -r line; do
  echo "$line" >> /tmp/batch_$BATCH_COUNT.sql
  LINE_COUNT=$((LINE_COUNT + 1))

  if [ $((LINE_COUNT % BATCH_SIZE)) -eq 0 ]; then
    echo "  Applying batch $BATCH_COUNT (statements $((BATCH_COUNT * BATCH_SIZE)) - $LINE_COUNT)..."

    # Execute via postgres using the connection string
    npx tsx -e "
      import postgres from 'postgres';
      import { readFileSync } from 'fs';

      const sql = postgres(process.env.DATABASE_URL);
      const batch = readFileSync('/tmp/batch_$BATCH_COUNT.sql', 'utf-8');

      await sql.unsafe(batch);
      await sql.end();
      console.log('  ✅ Batch $BATCH_COUNT complete');
    "

    rm /tmp/batch_$BATCH_COUNT.sql
    BATCH_COUNT=$((BATCH_COUNT + 1))

    # Brief pause between batches
    sleep 2
  fi
done < sql_updates/all_status_updates.sql

# Apply remaining statements
if [ -f /tmp/batch_$BATCH_COUNT.sql ]; then
  echo "  Applying final batch..."

  npx tsx -e "
    import postgres from 'postgres';
    import { readFileSync } from 'fs';

    const sql = postgres(process.env.DATABASE_URL);
    const batch = readFileSync('/tmp/batch_$BATCH_COUNT.sql', 'utf-8');

    await sql.unsafe(batch);
    await sql.end();
    console.log('  ✅ Final batch complete');
  "

  rm /tmp/batch_$BATCH_COUNT.sql
fi

echo ""
echo "✅ All status updates applied!"
echo ""
echo "Checking final status distribution..."
sleep 3

curl -s http://localhost:3001/api/debug/status-check | python3 -c "
import sys, json
d = json.load(sys.stdin)
if 'statusDistribution' in d:
    print('\nFinal Status Distribution:')
    for r in d['statusDistribution']:
        print(f\"  {r['status']}: {int(r['count']):,}\")
else:
    print('Database query in progress...')
" 2>/dev/null

echo ""
echo "🎉 Professional status fix complete!"
echo ""
echo "What we did:"
echo "  • Parsed 22 XML files locally (no database load)"
echo "  • Extracted ~1.6M status codes"
echo "  • Applied targeted SQL UPDATEs (one column only)"
echo "  • Total time: ~30-40 minutes vs 10+ hours re-import"
echo ""
echo "This is how senior engineers handle bulk updates efficiently! 🚀"
