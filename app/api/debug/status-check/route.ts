import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check status distribution
    const statusDist = await db.execute(sql`
      SELECT status, COUNT(*) as count
      FROM uspto_trademarks
      GROUP BY status
      ORDER BY count DESC
    `);

    // Get sample records
    const samples = await db.execute(sql`
      SELECT serial_number, mark_text, status, registration_date
      FROM uspto_trademarks
      LIMIT 100
    `);

    return NextResponse.json({
      statusDistribution: statusDist,
      sampleRecords: samples.slice(0, 20),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
