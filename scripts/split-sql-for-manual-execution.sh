#!/bin/bash
# Split the large SQL file into smaller chunks for manual execution
# Senior engineer approach: When programmatic access fails, use the platform's tools

cd "$(dirname "$0")/.."

SQL_FILE="sql_updates/all_status_updates.sql"
OUTPUT_DIR="sql_updates/chunks"

echo "📂 Splitting SQL file into manageable chunks"
echo "============================================="
echo ""

# Create chunks directory
mkdir -p "$OUTPUT_DIR"
rm -f "$OUTPUT_DIR"/*.sql

# Split into files of 50 statements each (small enough for Supabase dashboard)
CHUNK_SIZE=50
LINE_NUM=0
CHUNK_NUM=1

while IFS= read -r line; do
  if [ -n "$line" ]; then
    echo "$line" >> "$OUTPUT_DIR/chunk_$(printf "%03d" $CHUNK_NUM).sql"
    LINE_NUM=$((LINE_NUM + 1))

    if [ $((LINE_NUM % CHUNK_SIZE)) -eq 0 ]; then
      echo "  Created chunk $CHUNK_NUM (statements $((LINE_NUM - CHUNK_SIZE + 1))-$LINE_NUM)"
      CHUNK_NUM=$((CHUNK_NUM + 1))
    fi
  fi
done < "$SQL_FILE"

# Handle remaining statements
if [ $((LINE_NUM % CHUNK_SIZE)) -ne 0 ]; then
  echo "  Created chunk $CHUNK_NUM (statements $((CHUNK_NUM * CHUNK_SIZE - CHUNK_SIZE + 1))-$LINE_NUM)"
fi

echo ""
echo "✅ Split into $CHUNK_NUM chunks of $CHUNK_SIZE statements each"
echo ""
echo "📋 MANUAL EXECUTION INSTRUCTIONS:"
echo "=================================="
echo ""
echo "Since programmatic access to Supabase is timing out, use their dashboard:"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/[your-project]/sql"
echo "2. Open each chunk file in order: chunk_001.sql, chunk_002.sql, etc."
echo "3. Copy the SQL content"
echo "4. Paste into the SQL Editor"
echo "5. Click 'Run'"
echo "6. Wait for success confirmation"
echo "7. Move to next chunk"
echo ""
echo "Advantages:"
echo "  ✅ No connection pool issues"
echo "  ✅ Can monitor progress visually"
echo "  ✅ Can pause/resume anytime"
echo "  ✅ Supabase dashboard is optimized for this"
echo ""
echo "Chunks are in: $OUTPUT_DIR/"
echo "Total chunks: $CHUNK_NUM"
echo ""

# Show first chunk as example
echo "Example (chunk_001.sql first 5 statements):"
echo "--------------------------------------------"
head -5 "$OUTPUT_DIR/chunk_001.sql"
echo "..."
echo ""
