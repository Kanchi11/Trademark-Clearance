/**
 * Clear all cached search results
 * This fixes issues where old cached results without logo data are being returned
 */
import { clearCacheNamespace } from '@/lib/cache';

async function clearSearchCache() {
  console.log('🗑️  Clearing all cached trademark search results...\n');

  try {
    await clearCacheNamespace('trademark');
    console.log('✅ Cache cleared successfully!');
    console.log('');
    console.log('📝 Why this matters:');
    console.log('   - We just fixed a bug where searches with logos were using cached results');
    console.log('   - Old cached entries were created WITHOUT logo similarity data');
    console.log('   - Clearing the cache ensures all new searches check logos properly');
    console.log('');
    console.log('🔄 Next time you search:');
    console.log('   - Logo similarity will run fresh every time');
    console.log('   - Results will be cached with logo data included');
  } catch (error) {
    console.error('❌ Failed to clear cache:', error);
  }

  process.exit(0);
}

clearSearchCache().catch(console.error);
