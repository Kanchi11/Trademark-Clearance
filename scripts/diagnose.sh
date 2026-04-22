#!/bin/bash
# Quick server diagnostic
cd /Users/kanchanads/Documents/Arcangel/trademark-clearance

echo "🔍 Checking for syntax errors..."
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20

echo ""
echo "🔍 Checking environment..."
if [ -f .env.local ]; then
  echo "✅ .env.local exists"
else
  echo "❌ .env.local missing"
fi

echo ""
echo "🔍 Checking database connection..."
export $(grep -v '^#' .env.local 2>/dev/null | xargs)
if [ -n "$DATABASE_URL" ]; then
  echo "✅ DATABASE_URL is set"
else
  echo "❌ DATABASE_URL not set"
fi

echo ""
echo "📊 Testing database query..."
npx tsx -e "
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';

async function test() {
  try {
    const result = await db.execute(sql\`SELECT 1 as test\`);
    console.log('✅ Database connection works');
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
  process.exit(0);
}

test();
"
