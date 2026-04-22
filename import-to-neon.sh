#!/bin/bash
# Import database to Neon

echo "📥 Importing to Neon database..."

if [ -z "$1" ]; then
    echo "❌ Error: Neon connection URL required"
    echo "Usage: ./import-to-neon.sh 'postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb'"
    exit 1
fi

NEON_URL="$1"

if [ ! -f "supabase_backup.sql" ]; then
    echo "❌ Error: supabase_backup.sql not found"
    echo "Run ./export-supabase.sh first"
    exit 1
fi

echo "Importing to Neon..."
psql "$NEON_URL" < supabase_backup.sql

if [ $? -eq 0 ]; then
    echo "✅ Import complete!"
    echo ""
    echo "Update your .env.local:"
    echo "DATABASE_URL=$NEON_URL"
else
    echo "❌ Import failed"
    exit 1
fi
