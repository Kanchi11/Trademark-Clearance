/**
 * Check logo coverage in database
 */

import '@/src/core/setup';
import { db } from '@/db';
import { usptoTrademarks } from '@/db/schema';
import { sql, and, isNotNull } from 'drizzle-orm';

async function checkLogoCoverage() {
  console.log('📊 Logo Coverage Analysis\n');

  // Total trademarks
  const totalCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(usptoTrademarks);

  console.log(`Total trademarks in database: ${totalCount[0].count.toLocaleString()}`);

  // Trademarks with logos
  const logosCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(usptoTrademarks)
    .where(isNotNull(usptoTrademarks.logoUrl));

  console.log(`Trademarks with logos: ${logosCount[0].count.toLocaleString()}`);
  console.log(`Logo coverage: ${((Number(logosCount[0].count) / Number(totalCount[0].count)) * 100).toFixed(2)}%\n`);

  // Coverage by common Nice classes
  const commonClasses = [9, 25, 35, 41, 42];

  console.log('Logo coverage by Nice class:');
  for (const niceClass of commonClasses) {
    const classTotal = await db
      .select({ count: sql<number>`count(*)` })
      .from(usptoTrademarks)
      .where(sql`${niceClass} = ANY(${usptoTrademarks.niceClasses})`);

    const classWithLogos = await db
      .select({ count: sql<number>`count(*)` })
      .from(usptoTrademarks)
      .where(
        and(
          isNotNull(usptoTrademarks.logoUrl),
          sql`${niceClass} = ANY(${usptoTrademarks.niceClasses})`
        )
      );

    const coverage = (Number(classWithLogos[0].count) / Number(classTotal[0].count)) * 100;

    console.log(`  Class ${niceClass}: ${classWithLogos[0].count.toLocaleString()}/${classTotal[0].count.toLocaleString()} (${coverage.toFixed(2)}%)`);
  }

  // Check for specific test case - Nike-like logos
  console.log('\n🔍 Searching for design-heavy trademarks (likely logos):');

  const designMarks = await db
    .select({
      serial: usptoTrademarks.serialNumber,
      mark: usptoTrademarks.markText,
      classes: usptoTrademarks.niceClasses,
      logo: usptoTrademarks.logoUrl,
    })
    .from(usptoTrademarks)
    .where(
      and(
        isNotNull(usptoTrademarks.logoUrl),
        sql`${usptoTrademarks.niceClasses} && ARRAY[25]::integer[]`, // Class 25 = clothing (Nike territory)
        sql`length(${usptoTrademarks.markText}) < 3` // Short names often indicate design marks
      )
    )
    .limit(10);

  console.log(`Found ${designMarks.length} design-heavy marks in Class 25:`);
  designMarks.forEach((mark, i) => {
    console.log(`  ${i + 1}. "${mark.mark}" (${mark.serial}) - Classes: [${mark.classes?.join(', ')}]`);
  });
}

checkLogoCoverage()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
