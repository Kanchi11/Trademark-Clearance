// scripts/seed-sample.ts
// DEV ONLY: Small sample data for local UI testing. For production use real data: npm run data:import

// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Now import database
import { db } from '../db';
import { usptoTrademarks } from '../db/schema';

// Simple Soundex implementation
function soundex(str: string): string {
  const a = str.toLowerCase().split('');
  const firstLetter = a.shift();
  
  if (!firstLetter) return '';
  
  const codes: Record<string, string> = {
    a: '', e: '', i: '', o: '', u: '', h: '', w: '', y: '',
    b: '1', f: '1', p: '1', v: '1',
    c: '2', g: '2', j: '2', k: '2', q: '2', s: '2', x: '2', z: '2',
    d: '3', t: '3',
    l: '4',
    m: '5', n: '5',
    r: '6'
  };
  
  const coded = a
    .map(letter => codes[letter])
    .filter((code, index, array) => code !== '' && code !== array[index - 1]);
  
  return (firstLetter.toUpperCase() + coded.join('') + '000').slice(0, 4);
}

const sampleTrademarks = [
  {
    serialNumber: '88000001',
    markText: 'NIKE',
    status: 'live' as const,
    ownerName: 'Nike, Inc.',
    niceClasses: [25, 35],
    filingDate: '1971-01-22',
  },
  {
    serialNumber: '88000002',
    markText: 'APPLE',
    status: 'live' as const,
    ownerName: 'Apple Inc.',
    niceClasses: [9, 35, 42],
    filingDate: '1977-01-03',
  },
  {
    serialNumber: '88000003',
    markText: 'GOOGLE',
    status: 'live' as const,
    ownerName: 'Google LLC',
    niceClasses: [9, 35, 38, 42],
    filingDate: '2003-06-04',
  },
  {
    serialNumber: '88000004',
    markText: 'MICROSOFT',
    status: 'live' as const,
    ownerName: 'Microsoft Corporation',
    niceClasses: [9, 42],
    filingDate: '1983-11-15',
  },
  {
    serialNumber: '88000005',
    markText: 'TECHFLOW',
    status: 'live' as const,
    ownerName: 'TechFlow Inc.',
    niceClasses: [9, 42],
    filingDate: '2018-03-15',
  },
  {
    serialNumber: '88000006',
    markText: 'FLOWTECH',
    status: 'live' as const,
    ownerName: 'FlowTech Corp.',
    niceClasses: [9, 42],
    filingDate: '2019-07-22',
  },
  {
    serialNumber: '88000007',
    markText: 'TECHSTREAM',
    status: 'live' as const,
    ownerName: 'TechStream LLC',
    niceClasses: [9, 42],
    filingDate: '2020-02-10',
  },
  {
    serialNumber: '88000008',
    markText: 'CODEFLOW',
    status: 'live' as const,
    ownerName: 'CodeFlow Technologies',
    niceClasses: [9, 42],
    filingDate: '2017-11-30',
  },
  {
    serialNumber: '88000009',
    markText: 'NYKE',
    status: 'dead' as const,
    ownerName: 'Generic Sports Co.',
    niceClasses: [25],
    filingDate: '2015-05-20',
  },
  {
    serialNumber: '88000010',
    markText: 'APLE',
    status: 'dead' as const,
    ownerName: 'Fruit Company Inc.',
    niceClasses: [9],
    filingDate: '2010-08-15',
  },
];

async function seedSampleData() {
  console.log('🌱 Seeding sample data...');
  
  try {
    for (const tm of sampleTrademarks) {
      const normalized = tm.markText.toLowerCase().replace(/\s+/g, '');
      const soundexCode = soundex(tm.markText);
      
      await db.insert(usptoTrademarks).values({
        serialNumber: tm.serialNumber,
        markText: tm.markText,
        markTextNormalized: normalized,
        markSoundex: soundexCode,
        status: tm.status,
        ownerName: tm.ownerName,
        niceClasses: tm.niceClasses,
        filingDate: tm.filingDate,
      });
      
      console.log(`✓ Added: ${tm.markText} (Soundex: ${soundexCode})`);
    }
    
    console.log('\n✅ Sample data seeded successfully!');
    console.log(`📊 Total records: ${sampleTrademarks.length}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedSampleData();