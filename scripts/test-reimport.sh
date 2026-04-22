#!/bin/bash
# Wrapper script to run re-import with proper environment

cd "$(dirname "$0")/.."

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Run the import
echo "🔄 Testing status extraction with one file..."
echo ""

npx tsx scripts/import-uspto-sax.ts --file "downloads/apc18840407-20241231-86 2.xml"

echo ""
echo "✅ Test import complete! Checking status distribution..."
echo ""

# Check distribution
curl -s http://localhost:3001/api/debug/status-check | python3 -c "import sys, json; data=json.load(sys.stdin); print('AFTER test import:'); [print(f'  {r[\"status\"]}: {int(r[\"count\"]):,}') for r in data['statusDistribution']]"
