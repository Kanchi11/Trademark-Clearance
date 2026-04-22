/**
 * Populate phonetic data (metaphone) for all existing trademarks
 * This enables better sound-alike matching
 */
import { db } from '@/db';
import { usptoTrademarks } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { calculateMetaphone } from '@/lib/phonetic-matching';

async function populatePhoneticData() {
  console.log('🔄 Populating phonetic data for trademarks...\n');

  try {
    // Get count
    const [{ count }] = await db.execute<{ count: number }>(sql`
      SELECT COUNT(*)::int as count
      FROM uspto_trademarks
      WHERE mark_metaphone IS NULL
    `);

    console.log(`📊 Found ${count.toLocaleString()} trademarks without phonetic data`);
    console.log('⏱️  Estimated time: ~${Math.round(count / 1000)} seconds\n');

    const batchSize = 1000;
    let processed = 0;
    let updated = 0;

    while (processed < count) {
      // Fetch batch
      const batch = await db
        .select({
          id: usptoTrademarks.id,
          markText: usptoTrademarks.markText,
        })
        .from(usptoTrademarks)
        .where(sql`mark_metaphone IS NULL`)
        .limit(batchSize);

      if (batch.length === 0) break;

      // Update each record
      for (const record of batch) {
        const metaphone = calculateMetaphone(record.markText);

        if (metaphone) {
          await db
            .update(usptoTrademarks)
            .set({ markMetaphone: metaphone })
            .where(sql`id = ${record.id}`);

          updated++;
        }

        processed++;

        // Progress update every 1000
        if (processed % 1000 === 0) {
          const progress = ((processed / count) * 100).toFixed(1);
          console.log(`   Progress: ${processed.toLocaleString()}/${count.toLocaleString()} (${progress}%) - Updated: ${updated.toLocaleString()}`);
        }
      }
    }

    console.log(`\n✅ Phonetic data population complete!`);
    console.log(`   Total processed: ${processed.toLocaleString()}`);
    console.log(`   Successfully updated: ${updated.toLocaleString()}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

populatePhoneticData().catch(console.error);
