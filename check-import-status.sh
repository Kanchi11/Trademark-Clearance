#!/bin/bash

cd /Users/kanchanads/Documents/Arcangel/trademark-clearance

echo "📊 Import Status Report"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if import is running
PROCESSES=$(ps aux | grep -E "import-all-good|import-uspto-sax" | grep -v grep | wc -l | xargs)
if [ "$PROCESSES" -gt 0 ]; then
  echo "✅ Import Status: RUNNING ($PROCESSES active processes)"
else
  echo "⚪ Import Status: NOT RUNNING"
fi

echo ""

# Get current database count
echo "📦 Current Database Records:"
npx tsx quick-count.ts 2>/dev/null || echo "Unable to query database"

echo ""

# Show latest log entries
echo "📝 Latest Import Activity (last 10 lines):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
tail -10 full-import.log 2>/dev/null || echo "No log file found"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 To watch live progress: tail -f full-import.log"
echo "💡 To stop import: pkill -f import-all-good"
