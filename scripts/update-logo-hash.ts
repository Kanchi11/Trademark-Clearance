/**
 * Update hash for a specific logo in the database
 * Use this if a logo's hash is wrong or missing
 */
import { calculateImageHash } from '@/lib/server-logo-comparison';
import { db } from '@/db';
import { usptoTrademarks } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function updateLogoHash() {
  const serialNumber = process.argv[2];

  if (!serialNumber) {
    console.error('❌ Please provide a serial number');
    console.log('\nUsage:');
    console.log('  npx tsx scripts/update-logo-hash.ts SERIAL_NUMBER');
    process.exit(1);
  }

  console.log(`🔄 Updating logo hash for serial number: ${serialNumber}\n`);

  try {
    // Get the trademark record
    const [trademark] = await db
      .select()
      .from(usptoTrademarks)
      .where(eq(usptoTrademarks.serialNumber, serialNumber))
      .limit(1);

    if (!trademark) {
      console.error(`❌ No trademark found with serial number: ${serialNumber}`);
      process.exit(1);
    }

    console.log(`Found: ${trademark.markText}`);
    console.log(`Logo URL: ${trademark.logoUrl || 'No logo'}\n`);

    if (!trademark.logoUrl) {
      console.error('❌ This trademark has no logo URL');
      process.exit(1);
    }

    // Calculate new hash
    console.log('📊 Calculating new hash...');
    const newHash = await calculateImageHash(trademark.logoUrl);
    console.log(`   New hash: ${newHash}`);
    console.log(`   Old hash: ${trademark.logoHash || 'none'}\n`);

    // Update in database
    console.log('💾 Updating database...');
    await db
      .update(usptoTrademarks)
      .set({ logoHash: newHash })
      .where(eq(usptoTrademarks.serialNumber, serialNumber));

    console.log('✅ Hash updated successfully!\n');

    // Verify
    const [updated] = await db
      .select({ logoHash: usptoTrademarks.logoHash })
      .from(usptoTrademarks)
      .where(eq(usptoTrademarks.serialNumber, serialNumber))
      .limit(1);

    console.log(`Verified hash in DB: ${updated.logoHash}`);
    console.log(`Match: ${updated.logoHash === newHash ? '✅' : '❌'}`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

updateLogoHash().catch(console.error);
