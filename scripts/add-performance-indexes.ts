/**
 * Add database indexes for faster trademark searches
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function addIndexes() {
  console.log('🔧 Adding performance indexes to uspto_trademarks table...\n');

  try {
    // 1. Index on mark_text for exact/prefix searches
    console.log('📊 Creating index on mark_text...');
    await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mark_text
      ON uspto_trademarks (mark_text)
    `);
    console.log('   ✅ idx_mark_text created');

    // 2. Index on mark_text_normalized for case-insensitive searches
    console.log('📊 Creating index on mark_text_normalized...');
    await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mark_text_normalized
      ON uspto_trademarks (mark_text_normalized)
    `);
    console.log('   ✅ idx_mark_text_normalized created');

    // 3. Index on mark_soundex for phonetic searches
    console.log('📊 Creating index on mark_soundex...');
    await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mark_soundex
      ON uspto_trademarks (mark_soundex)
    `);
    console.log('   ✅ idx_mark_soundex created');

    // 4. Index on mark_metaphone for advanced phonetic searches
    console.log('📊 Creating index on mark_metaphone...');
    await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mark_metaphone
      ON uspto_trademarks (mark_metaphone)
    `);
    console.log('   ✅ idx_mark_metaphone created');

    // 5. Index on status for filtering
    console.log('📊 Creating index on status...');
    await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status
      ON uspto_trademarks (status)
    `);
    console.log('   ✅ idx_status created');

    // 6. Index on nice_classes (GIN index for array searches)
    console.log('📊 Creating GIN index on nice_classes...');
    await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nice_classes
      ON uspto_trademarks USING GIN (nice_classes)
    `);
    console.log('   ✅ idx_nice_classes created');

    // 7. Full-text search index on goods_services
    console.log('📊 Creating full-text search index on goods_services...');
    await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goods_services_fts
      ON uspto_trademarks USING GIN (to_tsvector('english', COALESCE(goods_services, '')))
    `);
    console.log('   ✅ idx_goods_services_fts created');

    // 8. Composite index for common query pattern (status + nice_classes)
    console.log('📊 Creating composite index on status + nice_classes...');
    await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_nice_classes
      ON uspto_trademarks (status, nice_classes)
    `);
    console.log('   ✅ idx_status_nice_classes created');

    console.log('\n✅ All indexes created successfully!');
    console.log('\n📈 Expected performance improvements:');
    console.log('   • Text searches: 10-50x faster');
    console.log('   • Phonetic searches: 20-100x faster');
    console.log('   • Status filtering: 5-20x faster');
    console.log('   • Nice class filtering: 10-50x faster');
    console.log('   • Overall search time: ~200ms instead of 5-30 seconds');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  }

  process.exit(0);
}

addIndexes();
