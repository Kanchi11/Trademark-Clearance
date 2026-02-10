/**
 * Batch import all USPTO XML files from downloads folder
 * Processes all .xml files in the downloads directory
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { readdir } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function main() {
  const downloadsDir = resolve(process.cwd(), 'downloads');
  const files = await readdir(downloadsDir);

  // Filter for annual backfile XML files, excluding daily files (apcYYMMDD format)
  const xmlFiles = files
    .filter(f => f.endsWith('.xml'))
    .filter(f => f.includes('18840407-20241231')) // Annual backfile pattern
    .filter(f => !f.includes(' 2.xml')) // Skip duplicates
    .sort(); // Process in order

  console.log(`Found ${xmlFiles.length} XML files to import:`);
  xmlFiles.forEach(f => console.log(`  - ${f}`));
  console.log('');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < xmlFiles.length; i++) {
    const file = xmlFiles[i];
    const filePath = resolve(downloadsDir, file);

    console.log(`\n[${'='.repeat(60)}]`);
    console.log(`[${i + 1}/${xmlFiles.length}] Processing: ${file}`);
    console.log(`[${'='.repeat(60)}]\n`);

    try {
      const { stdout, stderr } = await execAsync(
        `npx tsx scripts/import-uspto-sax.ts --file "${filePath}"`,
        {
          cwd: process.cwd(),
          env: process.env,
          maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large outputs
        }
      );

      console.log(stdout);
      if (stderr) console.error('stderr:', stderr);

      successCount++;
      console.log(`✅ Successfully imported ${file}`);
    } catch (error: any) {
      errorCount++;
      console.error(`❌ Failed to import ${file}:`, error.message);
      if (error.stdout) console.log('stdout:', error.stdout);
      if (error.stderr) console.error('stderr:', error.stderr);

      // Continue with next file even if one fails
      console.log('Continuing with next file...');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('BATCH IMPORT COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total files processed: ${xmlFiles.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Batch import failed:', err);
  process.exit(1);
});
