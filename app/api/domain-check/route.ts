// app/api/domain-check/route.ts

import { NextResponse } from 'next/server';  
import { checkDomains } from '@/lib/domain-check';

export async function POST(request: Request) {
  try {
    const { markText } = await request.json();
    
    if (!markText || markText.trim().length < 2) {
      return NextResponse.json(
        { error: 'Mark text is required' },
        { status: 400 }
      );
    }
    
    const results = await checkDomains(markText);
    
    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Domain check error:', error);
    return NextResponse.json(
      { error: 'Failed to check domains' },
      { status: 500 }
    );
  }
}