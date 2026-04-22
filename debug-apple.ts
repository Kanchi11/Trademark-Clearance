/**
 * Debug tool - test database connection and search directly
 */

import '@/src/core/setup';
import { container } from '@/src/core/container';
import { TYPES } from '@/src/core/types';
import { TrademarkSearchService } from '@/src/core/services/TrademarkSearchService';

async function debugAppleSearch() {
  console.log('\n🔍 Direct Database Search Debug\n');
  console.log('═'.repeat(70));

  try {
    // Test 1: Check environment
    console.log('\n[Test 1] Environment Check:');
    console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
    console.log(`  REDIS_URL: ${process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL ? '✅ Set' : '⚠️  Optional'}`);

    // Test 2: Check container
    console.log('\n[Test 2] Dependency Injection Container:');
    const searchService = container.get<TrademarkSearchService>(TYPES.TrademarkSearchService);
    console.log('  ✅ Service retrieved from container');

    // Test 3: Perform search
    console.log('\n[Test 3] Searching for "APPLE" in Class 9...\n');
    
    const startTime = Date.now();
    const result = await searchService.performSearch({
      markText: 'APPLE',
      niceClasses: [9],
      includeUSPTOVerification: false,
      forceRefresh: false,
    });
    const duration = Date.now() - startTime;

    console.log(`  ✅ Search completed in ${duration}ms\n`);
    console.log('Results:');
    console.log(`  - Total conflicts: ${result.conflicts.length}`);
    console.log(`  - High risk: ${result.summary.highRisk}`);
    console.log(`  - Medium risk: ${result.summary.mediumRisk}`);
    console.log(`  - Low risk: ${result.summary.lowRisk}`);
    console.log(`  - Overall risk: ${result.summary.overallRisk}`);

    if (result.conflicts.length > 0) {
      console.log('\nTop 5 matches:');
      result.conflicts.slice(0, 5).forEach((conflict, i) => {
        console.log(`  ${i + 1}. ${conflict.markText} (${conflict.serialNumber})`);
        console.log(`     Similarity: ${conflict.similarityScore}%`);
        console.log(`     Risk: ${conflict.riskLevel}`);
      });
    }

    console.log('\n' + '═'.repeat(70));
    console.log('\n✅ SUCCESS! The search service is working.\n');
    console.log('💡 If the API is failing but this works, the issue is in:');
    console.log('   - app/api/clearance/route.ts');
    console.log('   - Common law/domain/social checks (timing out?)');
    console.log('   - Logo similarity check (if logo uploaded)\n');

  } catch (error) {
    console.log('\n' + '═'.repeat(70));
    console.error('\n❌ ERROR FOUND:\n');
    console.error(error);
    console.error('\n');

    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }

    console.log('\n💡 Common fixes:');
    console.log('1. Check DATABASE_URL in .env.local');
    console.log('2. Make sure database is accessible');
    console.log('3. Run: npm run db:push (to sync schema)');
    console.log('4. Check if tables exist in database\n');
  }
}

debugAppleSearch()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
