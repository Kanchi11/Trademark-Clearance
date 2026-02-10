import { injectable } from 'inversify';
import { ITrademarkRepository } from './ITrademarkRepository';
import { db } from '../../../db';
import { usptoTrademarks } from '../../../db/schema';
import { or, and, eq, ilike, sql } from 'drizzle-orm';
import { soundex } from '../../../lib/similarity';
import { logger } from '../../infrastructure/monitoring/logger';

@injectable()
export class TrademarkRepository implements ITrademarkRepository {
  /**
   * Search by mark text: exact normalized, partial (ILIKE), and phonetic (Soundex).
   * Optional Nice class overlap filter.
   */
  async searchByMark(markText: string, classes?: number[]): Promise<any[]> {
    const normalized = markText.toLowerCase().trim().replace(/\s+/g, '');
    const soundexCode = soundex(markText);
    const partialPattern = `%${normalized}%`;

    const markConditions = [
      eq(usptoTrademarks.markTextNormalized, normalized),
      ilike(usptoTrademarks.markText, partialPattern),
      eq(usptoTrademarks.markSoundex, soundexCode),
    ];

    // Filter by Nice class overlap if classes provided
    const whereClause =
      classes && classes.length > 0
        ? and(
            or(...markConditions),
            sql`${usptoTrademarks.niceClasses} && ARRAY[${sql.join(classes.map((c) => sql`${c}`), sql`, `)}]::integer[]`
          )
        : or(...markConditions);

    const rows = await db
      .select()
      .from(usptoTrademarks)
      .where(whereClause)
      .limit(200);

    logger.debug(
      { markText, normalized, soundexCode, classes, count: rows.length },
      'Repository searchByMark completed'
    );
    return rows;
  }

  async findBySerialNumber(serialNumber: string): Promise<any | null> {
    try {
      const results = await db
        .select()
        .from(usptoTrademarks)
        .where(sql`${usptoTrademarks.serialNumber} = ${serialNumber}`)
        .limit(1);

      return results[0] || null;

    } catch (error) {
      logger.error({ err: error, serialNumber }, 'Find by serial number failed');
      throw error;
    }
  }

  async count(): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(usptoTrademarks);

      return result[0]?.count || 0;

    } catch (error) {
      logger.error({ err: error }, 'Count query failed');
      throw error;
    }
  }
}