#!/bin/bash
# Monitor import progress and notify when complete

cd "$(dirname "$0")/.."

LOG_FILE="import-full-progress.log"

echo "📊 Monitoring USPTO Import Progress"
echo "===================================="
echo ""
echo "Press Ctrl+C to stop monitoring (import will continue in background)"
echo ""

LAST_COUNT=0

while true; do
  if [ ! -f "$LOG_FILE" ]; then
    echo "⏳ Waiting for import to start..."
    sleep 5
    continue
  fi

  # Check if import is complete
  if grep -q "🎉 Import Complete!" "$LOG_FILE"; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ IMPORT COMPLETE!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Count successful imports
    SUCCESS_COUNT=$(grep -c "imported successfully" "$LOG_FILE" 2>/dev/null || echo 0)
    FAIL_COUNT=$(grep -c "failed to import" "$LOG_FILE" 2>/dev/null || echo 0)

    echo "📊 Final Results:"
    echo "   ✅ Successful: $SUCCESS_COUNT files"
    echo "   ❌ Failed: $FAIL_COUNT files"
    echo ""

    # Send desktop notification (macOS)
    osascript -e 'display notification "All USPTO trademark data imported successfully!" with title "Import Complete" sound name "Glass"' 2>/dev/null

    echo "🎉 All done! Verifying status distribution..."
    npx tsx scripts/check-status-distribution.ts

    exit 0
  fi

  # Check current progress
  CURRENT_FILE=$(tail -100 "$LOG_FILE" | grep -o "\[[0-9]*/[0-9]*\]" | tail -1)
  LAST_PARSED=$(tail -20 "$LOG_FILE" | grep "Parsed" | tail -1 | grep -o "[0-9]*" | head -1)

  clear
  echo "📊 USPTO Import Progress Monitor"
  echo "=================================="
  echo ""
  echo "Current file: $CURRENT_FILE"
  echo "Last parsed count: $LAST_PARSED trademarks"
  echo ""
  echo "Recent activity:"
  echo "----------------"
  tail -15 "$LOG_FILE" | grep -E "(Importing|Parsed|imported successfully|failed to import)" | tail -10
  echo ""
  echo "⏰ Next update in 30 seconds... (Ctrl+C to stop monitoring)"

  sleep 30
done
