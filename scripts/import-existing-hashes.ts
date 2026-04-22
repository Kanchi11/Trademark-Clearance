/**
 * Import existing logo hashes from public/logo-hashes.json to Neon database
 * This avoids recomputing 52K+ hashes that were already computed in Supabase
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: join(process.cwd(), '.env.local') });

const BATCH_SIZE = 100;

async function importExistingHashes() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 5, ssl: 'require' });

  try {
    console.log('🚀 Starting logo hash import from JSON to Neon\n');

    // Load existing hashes from JSON
    const hashesPath = join(process.cwd(), 'public', 'logo-hashes.json');
    console.log(`📂 Loading hashes from: ${hashesPath}`);
    
    const hashesJson = readFileSync(hashesPath, 'utf-8');
    const hashes: Record<string, string> = JSON.parse(hashesJson);
    
    const totalHashes = Object.keys(hashes).length;
    console.log(`✓ Loaded ${totalHashes.toLocaleString()} hashes from JSON\n`);

    // Convert to array for batch processing
    const hashEntries = Object.entries(hashes);
    let imported = 0;
    let notFound = 0;
    let errors = 0;

    console.log('📝 Starting batch import...\n');

    // Process in batches
    for (let i = 0; i < hashEntries.length; i += BATCH_SIZE) {
      const batch = hashEntries.slice(i, i + BATCH_SIZE);
      
      try {
        // Update each record in the batch
        for (const [id, hash] of batch) {
          try {
            const result = await sql`
              UPDATE uspto_trademarks 
              SET logo_hash = ${hash}
              WHERE id = ${parseInt(id)}
              RETURNING id
            `;
            
            if (result.length > 0) {
              imported++;
            } else {
              notFound++;
            }
          } catch (err) {
            errors++;
          }
        }

        // Progress update every 1000 records
        if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= hashEntries.length) {
          const progress = Math.min(i + BATCH_SIZE, hashEntries.length);
          const percent = ((progress / totalHashes) * 100).toFixed(1);
          console.log(`Progress: ${progress.toLocaleString()} / ${totalHashes.toLocaleString()} (${percent}%) - Imported: ${imported.toLocaleString()}`);
        }
      } catch (batchError) {
        console.error(`❌ Batch error at ${i}-${i + BATCH_SIZE}:`, batchError);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Import Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📊 Results:`);
    console.log(`   ✓ Successfully imported: ${imported.toLocaleString()}`);
    console.log(`   ⚠️  Not found in database: ${notFound.toLocaleString()}`);
    console.log(`   ❌ Errors: ${errors.toLocaleString()}`);
    console.log(`\n💾 Total hashes now in Neon: ${imported.toLocaleString()}`);

    // Verify final count
    const finalCount = await sql`SELECT COUNT(*) as count FROM uspto_trademarks WHERE logo_hash IS NOT NULL`;
    console.log(`\n🔍 Verification: ${finalCount[0].count} records have logo_hash in database`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

importExistingHashes();
