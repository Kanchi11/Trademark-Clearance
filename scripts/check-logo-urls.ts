import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function checkLogoUrls() {
  console.log('Checking logo URLs in database...\n');

  // Count total and with logo URLs
  const stats = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      COUNT(logo_url) as with_logo,
      ROUND(COUNT(logo_url) * 100.0 / COUNT(*), 2) as percentage
    FROM uspto_trademarks
  `);

  console.log('📊 Database Stats:');
  console.log(`Total trademarks: ${stats[0].total}`);
  console.log(`With logo URLs: ${stats[0].with_logo}`);
  console.log(`Percentage: ${stats[0].percentage}%\n`);

  // Get samples with logo URLs
  const withLogos = await db.execute(sql`
    SELECT serial_number, mark_text, logo_url
    FROM uspto_trademarks
    WHERE logo_url IS NOT NULL
    LIMIT 5
  `);

  if (withLogos.length > 0) {
    console.log('✅ Sample records WITH logo URLs:');
    withLogos.forEach((row: any) => {
      console.log(`  - ${row.mark_text} (${row.serial_number}): ${row.logo_url}`);
    });
  } else {
    console.log('❌ No records with logo URLs found yet');
  }

  console.log('');

  // Get samples without logo URLs
  const withoutLogos = await db.execute(sql`
    SELECT serial_number, mark_text
    FROM uspto_trademarks
    WHERE logo_url IS NULL
    LIMIT 5
  `);

  console.log('📝 Sample records WITHOUT logo URLs:');
  withoutLogos.forEach((row: any) => {
    console.log(`  - ${row.mark_text} (${row.serial_number})`);
  });

  process.exit(0);
}

checkLogoUrls().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
