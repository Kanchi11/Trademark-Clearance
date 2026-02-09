#!/bin/bash
# Daily Trademark Download & Import (No API Key Needed)
#
# What it does:
#   1. Calculates yesterday's date
#   2. Downloads yesterday's trademark applications
#   3. Imports into database
#   4. Logs results

set -e

# Configuration
PROJECT_DIR="/Users/kanchanads/Documents/Arcangel/trademark-clearance"
DOWNLOAD_DIR="$PROJECT_DIR/downloads"
LOG_FILE="$PROJECT_DIR/logs/daily-import.log"

# Load environment
source "$PROJECT_DIR/.env.local" 2>/dev/null || true
export DATABASE_URL

# Create directories if they don't exist
mkdir -p "$DOWNLOAD_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Log everything
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

# Print timestamp
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Daily Trademark Import - $(date)"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Get yesterday's date in format YYMMDD
YESTERDAY=$(date -v-1d +%y%m%d 2>/dev/null || date -d yesterday +%y%m%d 2>/dev/null)

if [ -z "$YESTERDAY" ]; then
  echo "❌ Error: Could not calculate yesterday's date"
  exit 1
fi

FILENAME="apc${YESTERDAY}.zip"
URL="https://data.uspto.gov/bulkdata/trademark/dailyxml/TRTDXFAP/${FILENAME}"
FILEPATH="$DOWNLOAD_DIR/$FILENAME"

echo "📅 Date: $YESTERDAY"
echo "📥 File: $FILENAME"
echo "🔗 URL: $URL"
echo ""

# Try to download
echo "⬇️  Downloading..."
if curl -f -s -S -o "$FILEPATH" "$URL"; then
  FILESIZE=$(du -h "$FILEPATH" | cut -f1)
  echo "✅ Downloaded ($FILESIZE)"
  echo ""

  # Import into database
  echo "📊 Importing into database..."
  cd "$PROJECT_DIR"

  # Check if file is valid ZIP
  if ! file "$FILEPATH" | grep -q "Zip"; then
    echo "⚠️  File appears to be invalid (not a ZIP file)"
    echo "    Content type: $(file "$FILEPATH")"
    rm "$FILEPATH"

    echo ""
    echo "💡 Note: Direct download from data.uspto.gov doesn't work reliably"
    echo "   Use the XML file you already downloaded instead:"
    echo ""
    echo "   npm run data:import -- --file /Users/kanchanads/Downloads/apc18840407-20241231-86.xml"
    echo ""
    exit 1
  fi

  # Try import and show errors if it fails
  if DATABASE_URL="$DATABASE_URL" npm run data:import -- --file "$FILEPATH"; then
    echo "✅ Import successful"

    # Cleanup
    rm "$FILEPATH"
    echo "🧹 Cleaned up temporary file"
  else
    echo "❌ Import failed"
    echo "   Check the errors above for details"
    exit 1
  fi
else
  echo "⚠️  Download failed (file may not exist yet for this date)"
  echo "   This is normal on weekends/holidays when no applications filed"
fi

echo ""
echo "✅ Task completed at $(date)"
echo ""
