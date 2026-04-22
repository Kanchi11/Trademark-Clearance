/**
 * Pre-compute perceptual hashes for all USPTO logos in the database
 * This is a one-time migration script to enable efficient logo similarity search
 *
 * Run with: npm run populate:logo-hashes
 */

import '@/src/core/setup';
import { db } from '@/db';
import { usptoTrademarks } from '@/db/schema';
import { sql, isNotNull, isNull, or } from 'drizzle-orm';
import { calculateImageHash } from '@/lib/server-logo-comparison';

const BATCH_SIZE = 100; // Process 100 logos at a time
const CONCURRENT_REQUESTS = 10; // Process 10 logos in parallel within each batch

async function populateLogoHashes() {
  console.log('🔄 Pre-computing perceptual hashes for USPTO logos\n');

  // Get total count of logos without hashes
  const totalCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(usptoTrademarks)
    .where(
      sql`${usptoTrademarks.logoUrl} IS NOT NULL AND ${usptoTrademarks.logoHash} IS NULL`
    );

  const total = Number(totalCount[0].count);
  console.log(`Total logos to process: ${total.toLocaleString()}\n`);

  if (total === 0) {
    console.log('✅ All logos already have hashes computed!');
    return;
  }

  let processed = 0;
  let successful = 0;
  let failed = 0;
  let offset = 0;

  const startTime = Date.now();

  while (offset < total) {
    // Fetch batch of logos without hashes
    const batch = await db
      .select({
        id: usptoTrademarks.id,
        serial_number: usptoTrademarks.serialNumber,
        mark_text: usptoTrademarks.markText,
        logo_url: usptoTrademarks.logoUrl,
      })
      .from(usptoTrademarks)
      .where(
        sql`${usptoTrademarks.logoUrl} IS NOT NULL AND ${usptoTrademarks.logoHash} IS NULL`
      )
      .limit(BATCH_SIZE)
      .offset(offset);

    if (batch.length === 0) {
      break;
    }

    // Process batch in chunks for concurrent processing
    for (let i = 0; i < batch.length; i += CONCURRENT_REQUESTS) {
      const chunk = batch.slice(i, i + CONCURRENT_REQUESTS);

      await Promise.all(
        chunk.map(async (logo) => {
          try {
            const hash = await calculateImageHash(logo.logo_url!);

            // Update database with computed hash
            await db
              .update(usptoTrademarks)
              .set({ logoHash: hash })
              .where(sql`${usptoTrademarks.id} = ${logo.id}`);

            successful++;
          } catch (error) {
            failed++;
            // Silently skip failed logos - they might be 404 or inaccessible
          }

          processed++;

          // Log progress every 100 logos
          if (processed % 100 === 0 || processed === total) {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = processed / elapsed;
            const remaining = total - processed;
            const eta = remaining / rate;

            console.log(
              `Progress: ${processed.toLocaleString()}/${total.toLocaleString()} ` +
              `(${((processed / total) * 100).toFixed(1)}%) | ` +
              `✅ ${successful.toLocaleString()} | ` +
              `❌ ${failed.toLocaleString()} | ` +
              `Rate: ${rate.toFixed(1)}/s | ` +
              `ETA: ${formatTime(eta)}`
            );
          }
        })
      );
    }

    offset += BATCH_SIZE;
  }

  const elapsed = (Date.now() - startTime) / 1000;

  console.log('\n' + '='.repeat(60));
  console.log('✅ Hash computation complete!\n');
  console.log(`Total processed: ${processed.toLocaleString()}`);
  console.log(`Successful: ${successful.toLocaleString()}`);
  console.log(`Failed: ${failed.toLocaleString()}`);
  console.log(`Success rate: ${((successful / processed) * 100).toFixed(1)}%`);
  console.log(`Total time: ${formatTime(elapsed)}`);
  console.log(`Average rate: ${(processed / elapsed).toFixed(1)} logos/second`);
  console.log('='.repeat(60));
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Run the script
populateLogoHashes()
  .then(() => {
    console.log('\n👍 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
