import '@/src/core/setup';
import { NextResponse } from 'next/server';
import { container } from '@/src/core/container';
import { TYPES } from '@/src/core/types';
import { TrademarkSearchService } from '@/src/core/services/TrademarkSearchService';
import { logger } from '@/src/infrastructure/monitoring/logger';
import { InvalidSearchQueryError } from '@/src/shared/errors';

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    // Parse request
    const body = await request.json();

    logger.info({
      requestId,
      markText: body.markText,
      niceClasses: body.niceClasses,
    }, 'Search request received');

    // Get service from DI container
    const searchService = container.get<TrademarkSearchService>(
      TYPES.TrademarkSearchService
    );

    // Execute search
    const result = await searchService.performSearch({
      markText: body.markText,
      niceClasses: body.niceClasses || [9, 35, 42],
      includeUSPTOVerification: body.includeUSPTOVerification ?? true,
      forceRefresh: body.forceRefresh ?? false,
    });

    logger.info({
      requestId,
      markText: body.markText,
      duration: result.metadata.duration,
      resultsCount: result.conflicts.length,
    }, 'Search completed successfully');

    return NextResponse.json({
      success: true,
      requestId,
      results: result.conflicts,
      summary: result.summary,
      query: result.query,
      searchedAt: result.metadata.searchedAt,
      sourcesChecked: result.metadata.sources,
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

export const maxDuration = 30;