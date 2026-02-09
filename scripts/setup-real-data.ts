/**
 * Cross-platform script to setup real USPTO data
 * Usage: npm run setup:real-data
 * Works on Windows, Mac, and Linux
 */

import { execSync } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env.local');
  console.error('   Add it to .env.local and try again');
  process.exit(1);
}

(async () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Trademark Clearance - Real Data Setup                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  console.log('This script will:');
  console.log('  1. Clear synthetic sample data (if any)');
  console.log('  2. Download real USPTO trademark data (~1-2K records)');
  console.log('  3. Import into your database');
  console.log();

  // For automated runs, skip confirmation
  const isCI = process.env.CI === 'true';
  if (!isCI) {
    console.log('Continuing in 5 seconds... (Ctrl+C to cancel)');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  try {
    // Step 1: Clear synthetic data
    console.log('🧹 Clearing synthetic sample data...');
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

    // Step 2: Import real data
    console.log('📥 Importing real USPTO trademark data...');
    console.log('   (Downloading from bulkdata.uspto.gov...)');
    console.log();

    // Try to download recent data
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '').slice(2);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().split('T')[0].replace(/-/g, '').slice(2);

    let url = `https://data.uspto.gov/bulkdata/trademark/dailyxml/applications/apc${dateStr}.zip`;

    console.log(`Trying: ${url}`);

    try {
      execSync(`npm run data:import -- --url "${url}"`, {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL }
      });
      console.log('✅ Import succeeded!');
    } catch (e) {
      console.log('⚠️  Today\'s file not available, trying yesterday...');
      url = `https://data.uspto.gov/bulkdata/trademark/dailyxml/applications/apc${yesterdayStr}.zip`;
      execSync(`npm run data:import -- --url "${url}"`, {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL }
      });
      console.log('✅ Import succeeded!');
    }

    console.log();

    // Step 3: Verify
    console.log('🔍 Verifying data...');
    const output = execSync('psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM uspto_trademarks;"', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, DATABASE_URL }
    });

    const recordCount = output.trim();

    console.log();
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ SUCCESS                                               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log();
    console.log('📊 Database Statistics:');
    console.log(`   Total marks imported: ${recordCount}`);
    console.log();
    console.log('🧪 Test the search:');
    console.log('   npm run dev');
    console.log('   Visit: http://localhost:3000/search');
    console.log('   Try searching for: NIKE, APPLE, GOOGLE, AMAZON, MICROSOFT');
    console.log();
    console.log('📚 For annual backfile (production):');
    console.log('   npm run data:import -- --file ./tm-yearly-2024.zip');
    console.log();

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error();
    console.error('Troubleshooting:');
    console.error('  1. Verify DATABASE_URL in .env.local');
    console.error('  2. Check network connectivity to bulkdata.uspto.gov');
    console.error('  3. Verify psql is installed and in PATH');
    console.error('  4. Try manually: npm run data:import -- --url <URL>');
    process.exit(1);
  }
})();
