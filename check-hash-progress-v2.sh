#!/bin/bash

echo "📊 Logo Hash Computation Status (New Table Structure)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if process is running
if pgrep -f "batch-compute-logo-hashes" > /dev/null; then
    echo "✅ Status: RUNNING ($(pgrep -f "batch-compute-logo-hashes" | wc -l | xargs) active processes)"
else
    echo "❌ Status: NOT RUNNING"
fi

echo ""
echo "📦 Database Status:"

# Quick hash count from new table
npx tsx -e "
import postgres from 'postgres';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  ssl: 'require'
});

async function check() {
  const [stats] = await sql\`
    SELECT 
      (SELECT COUNT(*) FROM uspto_trademarks WHERE logo_url IS NOT NULL) as total_logos,
      (SELECT COUNT(*) FROM trademark_logo_hashes) as computed_hashes,
      (SELECT COUNT(*) FROM uspto_trademarks WHERE logo_url IS NOT NULL) - 
      (SELECT COUNT(*) FROM trademark_logo_hashes) as remaining
  \`;
  
  console.log(\`🖼️  Total logos: \${stats.total_logos}\`);
  console.log(\`#️⃣  Computed hashes: \${stats.computed_hashes}\`);
  console.log(\`⏳ Remaining: \${stats.remaining}\`);
  console.log(\`📈 Progress: \${((stats.computed_hashes / stats.total_logos) * 100).toFixed(2)}%\`);
  
  const [dbSize] = await sql\`
    SELECT pg_size_pretty(pg_database_size(current_database())) as size,
           pg_database_size(current_database()) as bytes
  \`;
  console.log(\`\n📦 Database: \${dbSize.size} (\${((parseInt(dbSize.bytes) / 536870912) * 100).toFixed(1)}% of 512 MB)\`);
  
  await sql.end();
}

check().catch(console.error);
" 2>/dev/null

echo ""
echo "📝 Latest Progress (last 5 lines):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
tail -5 logo-hash-compute-final.log

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 To watch live: tail -f logo-hash-compute-final.log"
echo "💡 To stop: pkill -f batch-compute-logo-hashes"
echo "💡 To check table: npx tsx check-hash-table.ts"
