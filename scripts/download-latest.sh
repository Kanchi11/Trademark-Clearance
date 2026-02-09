#!/bin/bash
# Download latest USPTO trademark data and import

set -e

PROJECT_DIR="/Users/kanchanads/Documents/Arcangel/trademark-clearance"
DOWNLOAD_DIR="$PROJECT_DIR/downloads"

mkdir -p "$DOWNLOAD_DIR"

echo "🔍 Available downloads at:"
echo "   https://data.uspto.gov/bulkdata/trademark/dailyxml/applications/"
echo ""
echo "📥 Manual Download Steps:"
echo "   1. Visit the link above"
echo "   2. Right-click the ZIP file you want"
echo "   3. Select 'Save Link As...'"
echo "   4. Save to: $DOWNLOAD_DIR"
echo ""
echo "🚀 After downloading, run:"
echo "   npm run data:import -- --file $DOWNLOAD_DIR/apc*.zip"
echo ""
