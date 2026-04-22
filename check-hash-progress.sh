#!/bin/bash

cd /Users/kanchanads/Documents/Arcangel/trademark-clearance

echo "📊 Logo Hash Computation Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if process is running
PROCESSES=$(ps aux | grep -E "batch-compute-logo-hashes" | grep -v grep | wc -l | xargs)
if [ "$PROCESSES" -gt 0 ]; then
  echo "✅ Status: RUNNING ($PROCESSES active processes)"
else
  echo "⚪ Status: NOT RUNNING"
fi

echo ""

# Get current database stats
echo "📦 Current Database Status:"
npx tsx check-logo-hash-status.ts 2>/dev/null | grep -E "Total|logo|hash"

echo ""

# Show latest log entries
echo "📝 Latest Progress (last 5 lines):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
tail -5 logo-hash-compute.log 2>/dev/null | grep -E "\[|Processing|ETA" || echo "No log file found"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 To watch live progress: tail -f logo-hash-compute.log"
echo "💡 To stop computation: pkill -f batch-compute-logo-hashes"
