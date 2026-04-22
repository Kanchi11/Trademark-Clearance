import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    console.log('Reverting incorrect status fix...');

    // Revert ALL statuses back to pending since we don't have reliable status data
    const result = await db.execute(sql`
      UPDATE uspto_trademarks
      SET status = 'pending'
      WHERE status = 'live'
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
      reverted: rowCount,
      message: `Reverted ${rowCount.toLocaleString()} trademarks back to 'pending' (previous fix was inaccurate)`,
      explanation: 'Status should be based on USPTO action-key codes from XML, not just registration dates',
      newDistribution: statusDist,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
