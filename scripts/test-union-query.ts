import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from  'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { rawClient } from '../db/index.js';
import { soundex, getMetaphone } from '../lib/similarity.js';

async function testUnionQuery() {
  console.log('Testing UNION ALL query...\n');

  const markText = 'Nike';
  const normalized = markText.toLowerCase().trim().replace(/\s+/g, '');
  const soundexCode = soundex(markText);
  const metaphoneCode = getMetaphone(markText);
  const classes = [9];

  console.log('Search parameters:');
  console.log(`  markText: ${markText}`);
  console.log(`  normalized: ${normalized}`);
  console.log(`  soundex: ${soundexCode}`);
  console.log(`  metaphone: ${metaphoneCode}`);
  console.log(`  classes: ${classes.join(',')}\n`);

  const classFilterSql = classes && classes.length > 0
    ? `AND nice_classes && ARRAY[${classes.join(',')}]::integer[]`
    : '';

  const queryString = `
    -- Query 1: Exact normalized match (uses idx_mark_text_normalized - FASTEST)
    SELECT id, serial_number, mark_text, mark_text_normalized, mark_soundex, mark_metaphone,
           status, filing_date, registration_date, owner_name, nice_classes, goods_services,
           uspto_url, logo_url, logo_hash, logo_color_histogram, logo_aspect_ratio, created_at,
           100 as relevance_score
    FROM "uspto_trademarks"
    WHERE mark_text_normalized = '${normalized}' ${classFilterSql}
    LIMIT 50

    UNION ALL

    -- Query 2: Metaphone phonetic match (uses idx_mark_metaphone)
    SELECT id, serial_number, mark_text, mark_text_normalized, mark_soundex, mark_metaphone,
           status, filing_date, registration_date, owner_name, nice_classes, goods_services,
           uspto_url, logo_url, logo_hash, logo_color_histogram, logo_aspect_ratio, created_at,
           85 as relevance_score
    FROM "uspto_trademarks"
    WHERE mark_metaphone = '${metaphoneCode}'
      AND mark_text_normalized != '${normalized}' ${classFilterSql}
    LIMIT 50

    UNION ALL

    -- Query 3: Soundex phonetic match (uses idx_mark_soundex)
    SELECT id, serial_number, mark_text, mark_text_normalized, mark_soundex, mark_metaphone,
           status, filing_date, registration_date, owner_name, nice_classes, goods_services,
           uspto_url, logo_url, logo_hash, logo_color_histogram, logo_aspect_ratio, created_at,
           75 as relevance_score
    FROM "uspto_trademarks"
    WHERE mark_soundex = '${soundexCode}'
      AND mark_text_normalized != '${normalized}'
      AND (mark_metaphone != '${metaphoneCode}' OR mark_metaphone IS NULL) ${classFilterSql}
    LIMIT 50

    UNION ALL

    -- Query 4: Starts with match (uses idx_mark_text_normalized prefix scan)
    SELECT id, serial_number, mark_text, mark_text_normalized, mark_soundex, mark_metaphone,
           status, filing_date, registration_date, owner_name, nice_classes, goods_services,
           uspto_url, logo_url, logo_hash, logo_color_histogram, logo_aspect_ratio, created_at,
           70 as relevance_score
    FROM "uspto_trademarks"
    WHERE mark_text_normalized LIKE '${normalized}%'
      AND mark_text_normalized != '${normalized}' ${classFilterSql}
    LIMIT 30

    UNION ALL

    -- Query 5: Contains match (slower but limited early)
    SELECT id, serial_number, mark_text, mark_text_normalized, mark_soundex, mark_metaphone,
           status, filing_date, registration_date, owner_name, nice_classes, goods_services,
           uspto_url, logo_url, logo_hash, logo_color_histogram, logo_aspect_ratio, created_at,
           60 as relevance_score
    FROM "uspto_trademarks"
    WHERE mark_text_normalized LIKE '%${normalized}%'
      AND mark_text_normalized != '${normalized}'
      AND mark_text_normalized NOT LIKE '${normalized}%' ${classFilterSql}
    LIMIT 30

    -- Sort combined results by relevance
    ORDER BY relevance_score DESC, filing_date DESC NULLS LAST
    LIMIT 200
  `;

  try {
    const startTime = Date.now();
    console.log('Executing query with rawClient.unsafe()...');

    const rows = await rawClient.unsafe(queryString);
    const duration = Date.now() - startTime;

   console.log(`\n✅ Query completed successfully in ${duration}ms`);
    console.log(`   Found ${rows.length} results`);

    if (rows.length > 0) {
      console.log(`\n  Top 3 results:`);
      rows.slice(0, 3).forEach((row: any, idx: number) => {
        console.log(`  ${idx + 1}. ${row.mark_text} (${row.serial_number}) - Score: ${row.relevance_score}`);
      });
    }

  } catch (error: any) {
    console.error('\n❌ Query failed with error:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Detail: ${error.detail || 'N/A'}`);
    console.error(`   Hint: ${error.hint || 'N/A'}`);
    console.error(`\n   Full error object:`);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

testUnionQuery();
