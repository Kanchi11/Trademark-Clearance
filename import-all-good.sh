#!/bin/bash

cd /Users/kanchanads/Documents/Arcangel/trademark-clearance

echo "🚀 Starting batch import of USPTO trademark data to Neon"
echo "📅 $(date)"
echo ""

# Files with confirmed trademark data (100K+ records each)
FILES=(
  "downloads/apc18840407-20241231-05.xml"
  "downloads/apc18840407-20241231-09.xml"
  "downloads/apc18840407-20241231-62.xml"
  "downloads/apc18840407-20241231-69.xml"
  "downloads/apc18840407-20241231-72.xml"
  "downloads/apc18840407-20241231-73.xml"
  "downloads/apc18840407-20241231-75.xml"
  "downloads/apc18840407-20241231-77.xml"
  "downloads/apc18840407-20241231-78.xml"
  "downloads/apc18840407-20241231-79.xml"
  "downloads/apc18840407-20241231-81.xml"
  "downloads/apc18840407-20241231-82.xml"
  "downloads/apc18840407-20241231-83.xml"
  "downloads/apc18840407-20241231-84.xml"
)

count=0
total=0

for file in "${FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "⚠️  File not found: $(basename $file), skipping..."
    continue
  fi
  
  ((count++))
  filename=$(basename "$file")
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "[$count/14] 📦 Processing: $filename"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  start_time=$(date +%s)
  
  # Run import
  npx tsx scripts/import-uspto-sax.ts --file "$file" 2>&1 | while read line; do
    if [[ "$line" =~ "Parsed" ]] || [[ "$line" =~ "Upserted batch" ]] || [[ "$line" =~ "Done" ]]; then
      echo "  $line"
    fi
  done
  
  end_time=$(date +%s)
  duration=$((end_time - start_time))
  
  # Get final count from the last line
  echo "  ⏱️  Duration: ${duration}s"
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ALL IMPORTS COMPLETE!"
echo "📅 $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Checking final database status..."
npx tsx quick-count.ts

echo ""
echo "🎉 Import process finished!"
