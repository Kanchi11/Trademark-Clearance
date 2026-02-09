// At the very top, before imports
import { config } from 'dotenv';
config({ path: '.env.local' });
import { resolve } from 'path';


// Load .env.local from the project root
config({ path: resolve(process.cwd(), '.env.local') });

// Now import the rest
import { db } from '../db';
import { usptoTrademarks } from '../db/schema';

const BRAND_PREFIXES = [
  'Tech', 'Smart', 'Digital', 'Cloud', 'Cyber', 'Data', 'Net', 'Web', 'Micro', 'Macro',
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Omega', 'Prime', 'Ultra', 'Super', 'Mega', 'Giga',
  'Eco', 'Bio', 'Nano', 'Quantum', 'Fusion', 'Nexus', 'Vertex', 'Zenith', 'Apex', 'Core',
  'Global', 'United', 'National', 'International', 'Universal', 'Royal', 'Elite', 'Premium',
  'Pro', 'Max', 'Plus', 'Next', 'Future', 'Advanced', 'Modern', 'Classic', 'True', 'Pure',
  'Swift', 'Rapid', 'Quick', 'Fast', 'Instant', 'Express', 'Speed', 'Velocity', 'Momentum',
  'Bright', 'Clear', 'Crystal', 'Diamond', 'Gold', 'Silver', 'Platinum', 'Star', 'Sun', 'Moon'
];

const BRAND_SUFFIXES = [
  'Flow', 'Wave', 'Stream', 'Link', 'Net', 'Hub', 'Lab', 'Works', 'Pro', 'Plus',
  'Tech', 'Soft', 'Ware', 'Systems', 'Solutions', 'Services', 'Group', 'Corp', 'Inc', 'Co',
  'Express', 'Direct', 'Connect', 'Sync', 'Share', 'Drive', 'Cloud', 'Space', 'Zone', 'Point',
  'Center', 'Base', 'Port', 'Gate', 'Bridge', 'Path', 'Way', 'Line', 'Track', 'Route',
  'Logic', 'Mind', 'Brain', 'Think', 'Vision', 'View', 'Sight', 'Focus', 'Scope', 'Lens'
];

const STATUSES = ['live', 'dead', 'pending', 'abandoned'];
const STATUS_WEIGHTS = [0.6, 0.2, 0.1, 0.1]; // 60% live, 20% dead, 10% pending, 10% abandoned

const NICE_CLASSES = Array.from({ length: 45 }, (_, i) => i + 1);

// Tech-focused classes (higher weight)
const TECH_CLASSES = [9, 35, 36, 38, 41, 42, 45];

function generateBrandName(): string {
  const prefix = BRAND_PREFIXES[Math.floor(Math.random() * BRAND_PREFIXES.length)];
  const suffix = BRAND_SUFFIXES[Math.floor(Math.random() * BRAND_SUFFIXES.length)];
  
  // 20% chance of adding a variation
  const variations = ['', 'AI', 'X', '360', 'Now', 'One', 'Go', 'App'];
  const variation = Math.random() < 0.2 
    ? variations[Math.floor(Math.random() * variations.length)]
    : '';
  
  return `${prefix}${suffix}${variation}`;
}
// Add this at the top after imports
const usedSerials = new Set<string>();

function generateSerialNumber(): string {
  let serial;
  do {
    serial = `${8 + Math.floor(Math.random() * 2)}${Math.floor(10000000 + Math.random() * 90000000)}`;
  } while (usedSerials.has(serial));
  
  usedSerials.add(serial);
  return serial;
}

function generateOwnerName(): string {
  const types = [
    () => `${BRAND_PREFIXES[Math.floor(Math.random() * BRAND_PREFIXES.length)]} Corporation`,
    () => `${BRAND_PREFIXES[Math.floor(Math.random() * BRAND_PREFIXES.length)]} Inc.`,
    () => `${BRAND_PREFIXES[Math.floor(Math.random() * BRAND_PREFIXES.length)]} LLC`,
    () => `${BRAND_PREFIXES[Math.floor(Math.random() * BRAND_PREFIXES.length)]} Technologies`,
    () => {
      const first = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa'];
      const last = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
      return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`;
    }
  ];
  
  return types[Math.floor(Math.random() * types.length)]();
}

function generateFilingDate(): string {
  // Generate dates between 2000 and 2025
  const start = new Date(2000, 0, 1);
  const end = new Date(2025, 0, 1);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function generateNiceClasses(): number[] {
  // 60% chance of tech-related classes
  const useTechClasses = Math.random() < 0.6;
  const sourceClasses = useTechClasses ? TECH_CLASSES : NICE_CLASSES;
  
  const count = Math.floor(Math.random() * 3) + 1; // 1-3 classes
  const classes: number[] = [];
  
  for (let i = 0; i < count; i++) {
    const cls = sourceClasses[Math.floor(Math.random() * sourceClasses.length)];
    if (!classes.includes(cls)) {
      classes.push(cls);
    }
  }
  
  return classes.sort((a, b) => a - b);
}

function generateStatus(): 'live' | 'dead' | 'pending' | 'abandoned' {
  const rand = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < STATUSES.length; i++) {
    cumulative += STATUS_WEIGHTS[i];
    if (rand < cumulative) {
      return STATUSES[i] as any;
    }
  }
  
  return 'live';
}

function soundex(text: string): string {
  const cleaned = text.toUpperCase().replace(/[^A-Z]/g, '');
  if (!cleaned) return 'Z000';
  
  const first = cleaned[0];
  const codes: { [key: string]: string } = {
    'BFPV': '1', 'CGJKQSXZ': '2', 'DT': '3',
    'L': '4', 'MN': '5', 'R': '6'
  };
  
  let result = first;
  let prevCode = '';
  
  for (let i = 1; i < cleaned.length; i++) {
    let code = '0';
    for (const [letters, digit] of Object.entries(codes)) {
      if (letters.includes(cleaned[i])) {
        code = digit;
        break;
      }
    }
    
    if (code !== '0' && code !== prevCode) {
      result += code;
      prevCode = code;
    }
    
    if (result.length >= 4) break;
  }
  
  return result.padEnd(4, '0');
}

async function generateData() {
  console.log('🚀 Generating 100,000 curated trademark records...');
  console.log('📊 This will take approximately 10-15 minutes...');
  console.log('');
  
  const TOTAL_RECORDS = 100000;
  const BATCH_SIZE = 1000;
  let totalInserted = 0;
  const startTime = Date.now();
  
  try {
    for (let i = 0; i < TOTAL_RECORDS; i += BATCH_SIZE) {
      const batch = [];
      
      for (let j = 0; j < BATCH_SIZE && (i + j) < TOTAL_RECORDS; j++) {
        const markText = generateBrandName();
        const normalized = markText.toLowerCase().replace(/\s+/g, '');
        
        batch.push({
          serialNumber: generateSerialNumber(),
          markText,
          ownerName: generateOwnerName(),
          status: generateStatus(),
          filingDate: generateFilingDate(),
          niceClasses: generateNiceClasses(),
          markTextNormalized: normalized,
          markSoundex: soundex(markText),
        });
      }
      
      await db.insert(usptoTrademarks).values(batch);
      totalInserted += batch.length;
      
      // Progress update every 10,000 records
      if (totalInserted % 10000 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        const rate = (totalInserted / (Date.now() - startTime) * 1000).toFixed(0);
        const remaining = ((TOTAL_RECORDS - totalInserted) / Number(rate) / 60).toFixed(1);
        
        console.log(`✅ ${totalInserted.toLocaleString()} / ${TOTAL_RECORDS.toLocaleString()} records`);
        console.log(`   ⏱️  ${elapsed} min elapsed | ${rate} records/sec | ~${remaining} min remaining`);
        console.log('');
      }
    }
    
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    
    console.log('');
    console.log('🎉 Database generation complete!');
    console.log(`📊 Total records: ${totalInserted.toLocaleString()}`);
    console.log(`⏱️  Total time: ${totalTime} minutes`);
    console.log('');
    console.log('📈 Database Statistics:');
    
    // Get some stats
    const stats = await db
      .select()
      .from(usptoTrademarks)
      .limit(1);
    
    console.log(`   • Sample record: ${stats[0]?.markText || 'N/A'}`);
    console.log('   • Ready for searches!');
    console.log('');
    console.log('🚀 Next step: Test your trademark search!');
    
  } catch (error) {
    console.error('❌ Error generating data:', error);
    throw error;
  }
}

// Run the generation
generateData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });