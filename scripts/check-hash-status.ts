/**
 * Quick diagnostic: Check logo hash completion status
 */
import { db } from '@/db';
import { usptoTrademarks } from '@/db/schema';
import { sql, isNotNull, isNull } from 'drizzle-orm';

async function checkHashStatus() {
  console.log('🔍 Checking logo hash status...\n');

  // Get counts
  const [stats] = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE logo_url IS NOT NULL) as total_logos,
      COUNT(*) FILTER (WHERE logo_hash IS NOT NULL) as hashed_logos,
      COUNT(*) FILTER (WHERE logo_url IS NOT NULL AND logo_hash IS NULL) as missing_hashes,
      ROUND(100.0 * COUNT(*) FILTER (WHERE logo_hash IS NOT NULL) / NULLIF(COUNT(*) FILTER (WHERE logo_url IS NOT NULL), 0), 1) as completion_pct
    FROM uspto_trademarks
  `);

  const result = stats as any;

  console.log('📊 Logo Hash Statistics:');
  console.log(`   Total logos: ${Number(result.total_logos).toLocaleString()}`);
  console.log(`   Hashed: ${Number(result.hashed_logos).toLocaleString()}`);
  console.log(`   Missing: ${Number(result.missing_hashes).toLocaleString()}`);
  console.log(`   Completion: ${result.completion_pct}%`);

  // Check sample query performance
  const niceClasses = [9, 35, 42];

  console.log(`\n⚡ Testing query performance for classes [${niceClasses.join(', ')}]...`);
  const startTime = Date.now();

  const logosWithHashes = await db
    .select({
      serial_number: usptoTrademarks.serialNumber,
      logo_hash: usptoTrademarks.logoHash,
    })
    .from(usptoTrademarks)
    .where(
      sql`logo_hash IS NOT NULL AND nice_classes && ARRAY[${sql.raw(niceClasses.join(','))}]::integer[]`
    );

  const queryTime = Date.now() - startTime;

  console.log(`   Query returned: ${logosWithHashes.length.toLocaleString()} logos`);
  console.log(`   Query time: ${queryTime}ms`);
  console.log(`   Throughput: ${((logosWithHashes.length / queryTime) * 1000).toFixed(0)} logos/sec`);

  process.exit(0);
}

checkHashStatus().catch(console.error);
