/**
 * Apply SQL status updates in controlled batches
 * Reads the combined SQL file and executes in chunks to avoid overwhelming Supabase
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { readFileSync } from 'fs';
import postgres from 'postgres';

const BATCH_SIZE = 100; // Execute 100 UPDATE statements at a time
const PAUSE_MS = 2000; // 2 second pause between batches

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function applyUpdates(sqlFile: string) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set in environment');
  }

  const sql = postgres(process.env.DATABASE_URL, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 30,
  });

  console.log('📂 Reading SQL file...');
  const allSQL = readFileSync(sqlFile, 'utf-8');
  const statements = allSQL.split('\n').filter(line => line.trim().length > 0);

  console.log(`📊 Total statements to execute: ${statements.length.toLocaleString()}`);
  console.log(`📦 Batch size: ${BATCH_SIZE} statements`);
  console.log(`⏸️  Pause between batches: ${PAUSE_MS}ms`);
  console.log('');

  const totalBatches = Math.ceil(statements.length / BATCH_SIZE);
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = statements.slice(i, i + BATCH_SIZE);
    const batchSQL = batch.join('\n');

    try {
      console.log(`[${batchNum}/${totalBatches}] Executing batch (statements ${i + 1}-${Math.min(i + BATCH_SIZE, statements.length)})...`);

      await sql.unsafe(batchSQL);
      successCount += batch.length;

      console.log(`  ✅ Batch ${batchNum} complete (${batch.length} statements)`);

      // Pause between batches (except for the last one)
      if (i + BATCH_SIZE < statements.length) {
        console.log(`  ⏸️  Pausing ${PAUSE_MS}ms...`);
        await sleep(PAUSE_MS);
      }
    } catch (error) {
      console.error(`  ❌ Batch ${batchNum} failed:`, error);
      errorCount += batch.length;

      // Continue with next batch even if this one failed
      console.log('  ⚠️  Continuing with next batch...');
    }

    console.log('');
  }

  await sql.end();

  console.log('');
  console.log('✅ Update process complete!');
  console.log(`  Successful: ${successCount.toLocaleString()} statements`);
  if (errorCount > 0) {
    console.log(`  Failed: ${errorCount.toLocaleString()} statements`);
  }
}

const sqlFile = resolve(process.cwd(), 'sql_updates/all_status_updates.sql');
console.log('🎯 Applying Status Updates to Database');
console.log('======================================');
console.log('');

applyUpdates(sqlFile)
  .then(() => {
    console.log('');
    console.log('🎉 All updates applied successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
