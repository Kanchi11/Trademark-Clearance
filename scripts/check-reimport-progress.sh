#!/bin/bash
# Monitor the re-import progress

echo "📊 Re-import Progress Monitor"
echo "=============================="
echo ""

# Check if process is running
if pgrep -f "import-uspto-sax.ts" > /dev/null; then
    echo "✅ Re-import process is RUNNING"
else
    echo "⚠️  Re-import process is NOT running (may have completed or failed)"
fi

echo ""
echo "Latest log output (last 30 lines):"
echo "-----------------------------------"
tail -30 /tmp/full-reimport.log

echo ""
echo "-----------------------------------"
echo ""

# Check current status distribution
echo "Current status distribution:"
curl -s http://localhost:3001/api/debug/status-check 2>/dev/null | python3 -c "import sys, json; data=json.load(sys.stdin); [print(f'  {r[\"status\"]}: {int(r[\"count\"]):,}') for r in data['statusDistribution']]" 2>/dev/null || echo "  (Unable to fetch - server may be busy)"

echo ""
echo "To view full log: tail -f /tmp/full-reimport.log"
echo "Estimated completion: 1-2 hours from start"
