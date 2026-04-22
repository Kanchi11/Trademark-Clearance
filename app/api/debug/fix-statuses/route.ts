import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    console.log('Starting status fix...');

    // Update status to 'live' for trademarks with registration dates
    const result = await db.execute(sql`
      UPDATE uspto_trademarks
      SET status = 'live'
      WHERE registration_date IS NOT NULL
        AND status = 'pending'
    `);

    const rowCount = (result as any).rowCount || 0;

    // Get updated distribution
    const statusDist = await db.execute(sql`
      SELECT status, COUNT(*) as count
      FROM uspto_trademarks
      GROUP BY status
      ORDER BY count DESC
    `);

    return NextResponse.json({
      success: true,
      updated: rowCount,
      message: `Updated ${rowCount.toLocaleString()} trademarks from 'pending' to 'live' (had registration dates)`,
      newDistribution: statusDist,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
