/**
 * Quick Database Sample Finder
 * Shows you real trademarks you can test with
 */

import '@/src/core/setup';
import { db } from '@/db';
import { usptoTrademarks } from '@/db/schema';
import { sql, and, isNotNull, or, like } from 'drizzle-orm';

async function findTestExamples() {
  console.log('\n🎯 Sample Trademarks for Testing\n');
  console.log('═'.repeat(70));

  // Famous brands for high-risk testing
  console.log('\n📍 FAMOUS BRANDS (High-Risk Tests):');
  const famous = await db
    .select({
      mark_text: usptoTrademarks.markText,
      serial_number: usptoTrademarks.serialNumber,
      nice_classes: usptoTrademarks.niceClasses,
      status: usptoTrademarks.status,
    })
    .from(usptoTrademarks)
    .where(
      or(
        like(usptoTrademarks.markText, '%APPLE%'),
        like(usptoTrademarks.markText, '%NIKE%'),
        like(usptoTrademarks.markText, '%STARBUCKS%'),
        like(usptoTrademarks.markText, '%AMAZON%'),
        like(usptoTrademarks.markText, '%GOOGLE%')
      )
    )
    .limit(10);

  famous.forEach(tm => {
    console.log(`   ✓ ${tm.mark_text} (${tm.serial_number})`);
    console.log(`     Classes: [${tm.nice_classes?.slice(0, 5).join(', ')}]`);
    console.log(`     Status: ${tm.status}\n`);
  });

  // Tech-related marks
  console.log('\n💻 TECH MARKS (Medium-Risk Tests):');
  const tech = await db
    .select({
      mark_text: usptoTrademarks.markText,
      serial_number: usptoTrademarks.serialNumber,
      nice_classes: usptoTrademarks.niceClasses,
    })
    .from(usptoTrademarks)
    .where(
      or(
        like(usptoTrademarks.markText, '%TECH%'),
        like(usptoTrademarks.markText, '%CLOUD%'),
        like(usptoTrademarks.markText, '%SMART%'),
        like(usptoTrademarks.markText, '%DATA%')
      )
    )
    .limit(8);

  tech.forEach(tm => {
    console.log(`   ✓ ${tm.mark_text} (${tm.serial_number})`);
  });

  // Marks with logos
  console.log('\n\n🎨 MARKS WITH LOGOS (Logo Similarity Tests):');
  const logos = await db
    .select({
      mark_text: usptoTrademarks.markText,
      serial_number: usptoTrademarks.serialNumber,
      logo_url: usptoTrademarks.logoUrl,
      nice_classes: usptoTrademarks.niceClasses,
    })
    .from(usptoTrademarks)
    .where(isNotNull(usptoTrademarks.logoUrl))
    .limit(5);

  logos.forEach(tm => {
    console.log(`   ✓ ${tm.mark_text} (${tm.serial_number})`);
    console.log(`     Logo: ${tm.logo_url?.substring(0, 60)}...`);
    console.log(`     Classes: [${tm.nice_classes?.slice(0, 3).join(', ')}]\n`);
  });

  // Different Nice classes
  console.log('\n🏭 POPULAR NICE CLASSES:\n');
  const classes = [
    { num: 9, desc: 'Computer software, electronics', example: 'Apple, Microsoft' },
    { num: 25, desc: 'Clothing, footwear', example: 'Nike, Adidas' },
    { num: 35, desc: 'Retail services, advertising', example: 'Walmart, Amazon' },
    { num: 42, desc: 'Software development, SaaS', example: 'Salesforce, Slack' },
    { num: 43, desc: 'Restaurant services', example: 'McDonald\'s, Starbucks' },
  ];

  classes.forEach(cls => {
    console.log(`   Class ${cls.num}: ${cls.desc}`);
    console.log(`   Examples: ${cls.example}\n`);
  });

  // Test recommendations
  console.log('\n═'.repeat(70));
  console.log('\n🧪 RECOMMENDED TESTS:\n');
  console.log('1. HIGH RISK - Try "APPLE" in Class 9');
  console.log('   → Should show many conflicts\n');
  
  console.log('2. MEDIUM RISK - Try "CloudTech" in Classes 9, 42');
  console.log('   → Should show phonetic matches\n');
  
  console.log('3. LOW RISK - Try "YourBrandName2026" in Class 42');
  console.log('   → Should show few/no conflicts\n');
  
  console.log('4. LOGO TEST - Upload any logo and search in Class 9');
  console.log('   → Should find visually similar marks\n');

  console.log('═'.repeat(70));
  console.log('\n📖 Full guide: See DEMO_EXAMPLES.md for detailed scenarios\n');
}

findTestExamples()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
