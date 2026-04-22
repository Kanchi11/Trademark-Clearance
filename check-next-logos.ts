import postgres from 'postgres';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  ssl: 'require'
});

async function checkNextLogos() {
  // Get next 10 logos that would be processed
  const logos = await sql`
    SELECT t.serial_number, t.logo_url, t.filing_date
    FROM uspto_trademarks t
    WHERE t.logo_url IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM trademark_logo_hashes h 
        WHERE h.serial_number = t.serial_number
      )
    ORDER BY t.id
    LIMIT 10
  `;
  
  console.log('📋 Next 10 logos to be processed:\n');
  logos.forEach((logo: any, i: number) => {
    console.log(`${i+1}. Serial: ${logo.serial_number}`);
    console.log(`   Filed: ${logo.filing_date || 'Unknown'}`);
    console.log(`   URL: ${logo.logo_url.substring(0, 80)}...`);
    console.log('');
  });
  
  // Check filing date distribution
  const dateStats = await sql`
    SELECT 
      EXTRACT(YEAR FROM filing_date) as year,
      COUNT(*) as count
    FROM uspto_trademarks t
    WHERE t.logo_url IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM trademark_logo_hashes h 
        WHERE h.serial_number = t.serial_number
      )
    GROUP BY EXTRACT(YEAR FROM filing_date)
    ORDER BY year DESC
    LIMIT 10
  `;
  
  console.log('\n📅 Filing year distribution of remaining logos:');
  dateStats.forEach((stat: any) => {
    console.log(`  ${stat.year || 'Unknown'}: ${stat.count} logos`);
  });
  
  await sql.end();
}

checkNextLogos();
