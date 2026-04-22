#!/bin/bash

cd /Users/kanchanads/Documents/Arcangel/trademark-clearance

echo "🔍 Analyzing XML files for real trademark data..."
echo ""

# Files with significant trademark data (based on earlier analysis)
GOOD_FILES=(
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
total=${#GOOD_FILES[@]}

for file in "${GOOD_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    continue
  fi
  
  ((count++))
  filename=$(basename "$file")
  echo "[$count/$total] 🚀 Importing $filename..."
  
  # Run import and capture output
  npx tsx scripts/import-uspto-sax.ts --file "$file" 2>&1 | grep -E "(Upserted batch:|Done\.|Total)"
  
  echo ""
done

echo "✅ Import complete! Checking database..."
npx tsx check-neon-data.ts
