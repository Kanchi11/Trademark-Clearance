#!/bin/bash
# Export Supabase database to SQL file

echo "📦 Exporting Supabase database..."

# Direct connection URL (bypass pooler for pg_dump)
SUPABASE_URL="postgresql://postgres:Santhwanam@11@db.shdscvascrpyxdbnwioi.supabase.co:5432/postgres"

# Check if pg_dump is installed
if ! command -v pg_dump &> /dev/null; then
    echo "❌ pg_dump not found. Installing PostgreSQL client..."
    echo "Run: brew install postgresql@16"
    exit 1
fi

echo "Exporting schema and data..."
pg_dump "$SUPABASE_URL" \
    --schema=public \
    --no-owner \
    --no-acl \
    --verbose \
    --file=supabase_backup.sql

if [ $? -eq 0 ]; then
    echo "✅ Export complete: supabase_backup.sql"
    ls -lh supabase_backup.sql
else
    echo "❌ Export failed"
    exit 1
fi
