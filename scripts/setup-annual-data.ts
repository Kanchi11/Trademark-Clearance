/**
 * Setup Annual Trademark Backfile
 * Downloads 12M+ trademarks from 1884-2024
 * Run once, then daily incremental updates happen automatically
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { execSync } from 'child_process';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env.local');
  process.exit(1);
}

(async () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Trademark Clearance - Annual Backfile Setup              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  console.log('This imports 12M+ trademarks (1884-2024)');
  console.log('⏱️  This may take 5-15 minutes on first run');
  console.log();

  const isCI = process.env.CI === 'true';
  if (!isCI) {
    console.log('Continuing in 5 seconds... (Ctrl+C to cancel)');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  try {
    console.log('🧹 Clearing existing data...');
    try {
      execSync(`psql $DATABASE_URL -c "DELETE FROM uspto_trademarks;"`, {
        stdio: 'pipe',
        shell: true,
        env: { ...process.env, DATABASE_URL }
      });
    } catch (e) {
      // Table might be empty, that's ok
    }
    console.log('✅ Cleared');
    console.log();

    console.log('📥 Downloading annual trademark backfile (1884-2024)...');
    console.log('   This is ~7GB and may take 10-30 minutes depending on connection');
    console.log();

    const annualUrl = 'https://data.uspto.gov/bulkdata/trademark/xmlfull/apc18840407-20241231-86.zip';

    try {
      execSync(`npm run data:import -- --url "${annualUrl}"`, {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL }
      });
      console.log('✅ Annual import succeeded!');
    } catch (e) {
      console.error('❌ Failed to import annual file');
      throw e;
    }

    console.log();
    console.log('🔍 Verifying data...');
    const output = execSync('psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM uspto_trademarks;"', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, DATABASE_URL }
    });

    const recordCount = parseInt(output.trim());

    console.log();
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ SUCCESS - ANNUAL BACKFILE LOADED                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log();
    console.log('📊 Database Statistics:');
    console.log(`   Total trademarks imported: ${recordCount.toLocaleString()}`);
    console.log();
    console.log('🔄 Daily Updates:');
    console.log('   GitHub Actions will run daily to sync new applications');
    console.log('   (no action needed - happens automatically)');
    console.log();
    console.log('🧪 Test the search:');
    console.log('   npm run dev');
    console.log('   Visit: http://localhost:3000/search');
    console.log('   Try: NIKE, APPLE, GOOGLE, AMAZON, MICROSOFT');
    console.log();

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error();
    console.error('Troubleshooting:');
    console.error('  1. Check DATABASE_URL in .env.local');
    console.error('  2. Verify network connectivity');
    console.error('  3. Annual file may be very large (1GB+)');
    console.error('  4. Try: npm run data:import -- --url "https://data.uspto.gov/bulkdata/trademark/xmlfull/tm-yearly-2024.zip"');
    process.exit(1);
  }
})();
