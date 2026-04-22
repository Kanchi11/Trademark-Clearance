#!/bin/bash
# Monitor the professional status fix progress

echo "📊 Professional Status Fix - Progress Monitor"
echo "============================================="
echo ""

# Check extraction phase
if pgrep -f "extract-statuses.ts" > /dev/null; then
    CURRENT_FILE=$(tail -50 /tmp/professional-fix.log | grep "Extracting:" | tail -1)
    echo "✅ Extraction Phase: RUNNING"
    echo "   $CURRENT_FILE"
    echo ""
    echo "Latest progress:"
    tail -10 /tmp/professional-fix.log | grep -E "Extracted|Status breakdown|SQL written"
else
    echo "⏸️  Extraction Phase: Completed or not started"
fi

echo ""
echo "---"
echo ""

# Check SQL files generated
if [ -d "sql_updates" ]; then
    FILE_COUNT=$(ls -1 sql_updates/*.sql 2>/dev/null | grep -v "all_status" | wc -l | xargs)
    if [ "$FILE_COUNT" -gt 0 ]; then
        echo "📝 SQL Files Generated: $FILE_COUNT"
        ls -lh sql_updates/*.sql | grep -v "all_status" | tail -5 | awk '{print "   " $9, $5}'
    fi

    if [ -f "sql_updates/all_status_updates.sql" ]; then
        TOTAL_LINES=$(wc -l < sql_updates/all_status_updates.sql)
        FILE_SIZE=$(ls -lh sql_updates/all_status_updates.sql | awk '{print $5}')
        echo ""
        echo "📦 Combined SQL File:"
        echo "   Lines: $TOTAL_LINES"
        echo "   Size: $FILE_SIZE"
    fi
fi

echo ""
echo "Full log: tail -f /tmp/professional-fix.log"
