/**
 * Test search for "apple" to debug the failure
 */

async function testAppleSearch() {
  console.log('\n🔍 Testing "APPLE" Search\n');
  console.log('═'.repeat(70));

  try {
    console.log('\n[Step 1] Sending request to clearance API...\n');
    
    const requestBody = {
      markText: 'APPLE',
      niceClasses: [9], // Computers/Software
      description: 'Test search',
      forceRefresh: false,
    };

    console.log('Request:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('http://localhost:3000/api/clearance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('\n[Step 2] Response received');
    console.log(`Status: ${response.status} ${response.statusText}\n`);

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ API ERROR:\n');
      console.error(JSON.stringify(data, null, 2));
      console.error('\n');
      return;
    }

    console.log('✅ Success!\n');
    console.log('Results summary:');
    console.log(`  - Total conflicts: ${data.results?.length || 0}`);
    console.log(`  - High risk: ${data.summary?.highRisk || 0}`);
    console.log(`  - Medium risk: ${data.summary?.mediumRisk || 0}`);
    console.log(`  - Low risk: ${data.summary?.lowRisk || 0}`);
    console.log(`  - Overall risk: ${data.summary?.overallRisk || 'unknown'}`);

    if (data.results && data.results.length > 0) {
      console.log('\n📊 Top 5 matches:');
      data.results.slice(0, 5).forEach((r: any, i: number) => {
        console.log(`\n  ${i + 1}. ${r.markText} (${r.serialNumber})`);
        console.log(`     Similarity: ${r.similarityScore}%`);
        console.log(`     Risk: ${r.riskLevel}`);
        console.log(`     Status: ${r.status}`);
      });
    }

    console.log('\n' + '═'.repeat(70));
    console.log('\n✅ Search completed successfully!\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:\n');
    console.error(error);
    console.error('\n');
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.error('💡 Solution: Make sure the dev server is running:');
        console.error('   cd /Users/kanchanads/Documents/Arcangel/trademark-clearance');
        console.error('   npm run dev\n');
      } else if (error.message.includes('fetch')) {
        console.error('💡 Check if the API endpoint exists:');
        console.error('   app/api/clearance/route.ts\n');
      }
    }
  }
}

// Run the test
testAppleSearch()
  .then(() => {
    console.log('Test completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
