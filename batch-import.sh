#!/bin/bash

cd /Users/kanchanads/Documents/Arcangel/trademark-clearance

echo "🚀 Batch importing all USPTO XML files..."
echo ""

count=0
total=0

for file in downloads/*.xml; do
  ((count++))
  echo "[$count/22] Importing $(basename "$file")..."
  
  # Run import and extract final count
  result=$(npx tsx scripts/import-uspto-sax.ts --file "$file" 2>&1 | grep "Done. Total rows inserted:")
  rows=$(echo "$result" | grep -oP '\d+$' || echo "0")
  total=$((total + rows))
  
  echo "  ✅ Imported $rows rows (Running total: $total)"
  echo ""
done

echo "🎉 All imports complete!"
echo "📊 Total records imported: $total"
