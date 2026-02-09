// lib/database-search.ts

import { db } from '@/db';
import { usptoTrademarks } from '@/db/schema';
import { or, sql } from 'drizzle-orm';
import { soundex, getMetaphone } from './similarity';

export interface TrademarkResult {
  id: number;
  serialNumber: string;
  markText: string;
  ownerName: string | null;
  status: string;
  filingDate: string | null;
  niceClasses: number[];
  source?: string;
}

export async function searchDatabase(
  markText: string,
  niceClasses: number[]
): Promise<TrademarkResult[]> {
  
  const markSoundex = soundex(markText);
  const markMetaphone = getMetaphone(markText);
  const normalizedMark = markText.toLowerCase().replace(/\s+/g, '');
  
  console.log('🔍 Searching database for:', markText);
  
  const results = await db
    .select()
    .from(usptoTrademarks)
    .where(
      or(
        sql`${usptoTrademarks.markTextNormalized} = ${normalizedMark}`,
        sql`${usptoTrademarks.markSoundex} = ${markSoundex}`,
        sql`${usptoTrademarks.markTextNormalized} LIKE ${`%${normalizedMark}%`}`,
        sql`${normalizedMark} LIKE '%' || ${usptoTrademarks.markTextNormalized} || '%'`
      )
    )
    .limit(100);
  
  console.log(`📊 Database found ${results.length} candidates`);
  
  return results.map(r => ({
    id: r.id,
    serialNumber: r.serialNumber,
    markText: r.markText,
    ownerName: r.ownerName,
    status: r.status,
    filingDate: r.filingDate,
    niceClasses: r.niceClasses,
    source: 'database'
  }));
}