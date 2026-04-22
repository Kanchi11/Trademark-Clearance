import '@/src/core/setup';
import { NextResponse } from 'next/server';
import { logger } from '@/src/infrastructure/monitoring/logger';
import { InvalidSearchQueryError } from '@/src/shared/errors';
import { unifiedTrademarkSearch } from '@/lib/unified-trademark-search';

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    // Parse and validate request
    const body = await request.json();
    const markText = ((body.markText as string) || '').trim();

    if (markText.length < 2 || markText.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Mark text must be between 2 and 200 characters' },
        { status: 400 }
      );
    }

    // Validate and sanitize nice classes
    const rawClasses = Array.isArray(body.niceClasses) ? body.niceClasses : [];
    const niceClasses = rawClasses
      .map((c: unknown) => Number(c))
      .filter((c: number) => Number.isInteger(c) && c >= 1 && c <= 45);
    if (niceClasses.length === 0) {
      niceClasses.push(9, 35, 42);
    }

    logger.info({
      requestId,
      markText,
      niceClasses,
    }, 'Search request received');

    // Unified search: DB + Chroma RAG + CLIP in parallel
    const unified = await unifiedTrademarkSearch({
      markText,
      niceClasses,
      includeUSPTOVerification: body.includeUSPTOVerification ?? true,
      forceRefresh: body.forceRefresh ?? false,
    });

    logger.info({
      requestId,
      markText,
      duration: unified.metadata.duration,
      resultsCount: unified.conflicts.length,
      dbResults: unified.metadata.dbResultCount,
      ragTextResults: unified.metadata.ragTextCount,
      clipLogoResults: unified.metadata.ragLogoCount,
    }, 'Search completed successfully');

    return NextResponse.json({
      success: true,
      requestId,
      results: unified.conflicts,
      summary: unified.summary,
      query: { markText, niceClasses },
      searchedAt: unified.metadata.searchedAt,
      sourcesChecked: unified.sourcesChecked,
      pipeline: {
        dbResults: unified.metadata.dbResultCount,
        ragTextResults: unified.metadata.ragTextCount,
        clipLogoResults: unified.metadata.ragLogoCount,
      },
    });

  } catch (error) {
    logger.error({
      requestId,
      err: error,
    }, 'Search request failed');

    if (error instanceof InvalidSearchQueryError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Search failed. Please try again.' },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;