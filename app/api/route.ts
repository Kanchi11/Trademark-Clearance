// app/api/social-check/route.ts

import { NextResponse } from 'next/server'; 
import { checkSocialHandles } from '@/lib/social-check';

export async function POST(request: Request) {
  try {
    const { markText } = await request.json();
    
    if (!markText || markText.trim().length < 2) {
      return NextResponse.json(
        { error: 'Mark text is required' },
        { status: 400 }
      );
    }
    
    const results = await checkSocialHandles(markText);
    
    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Social check error:', error);
    return NextResponse.json(
      { error: 'Failed to check social handles' },
      { status: 500 }
    );
  }
}