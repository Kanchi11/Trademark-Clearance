// app/api/test-db/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { usptoTrademarks } from '@/db/schema';

export async function GET() {
  try {
    // Try to query database
    const result = await db.select().from(usptoTrademarks).limit(1);
    
    return NextResponse.json({
      success: true,
      message: 'Database connected!',
      recordCount: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}