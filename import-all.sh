#!/bin/bash

# Re-import all USPTO XML files with logo URL extraction
# This will update existing records with logo URLs

DATABASE_URL="postgresql://postgres.shdscvascrpyxdbnwioi:Santhwanam%4011@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
export DATABASE_URL

total_files=$(ls downloads/*.xml | wc -l | tr -d ' ')
current=0

echo "========================================="
echo "USPTO Data Re-import with Logo URLs"
echo "========================================="
echo "Total files: $total_files"
echo "Started at: $(date)"
echo "========================================="
echo ""

for file in downloads/*.xml; do
  current=$((current + 1))
  filename=$(basename "$file")
  
  echo ""
  echo "[$current/$total_files] Processing: $filename"
  echo "Started: $(date)"
  echo "----------------------------------------"
  
  npx tsx scripts/import-uspto-sax.ts --file "$file"
  
  if [ $? -eq 0 ]; then
    echo "✅ Completed: $filename"
  else
    echo "❌ Failed: $filename"
  fi
  
  echo "Finished: $(date)"
  echo "----------------------------------------"
done

echo ""
echo "========================================="
echo "All imports completed!"
echo "Finished at: $(date)"
echo "========================================="
