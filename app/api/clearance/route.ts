/**
 * Full clearance search: USPTO conflicts + domain + social + common law + alternatives.
 * Use this for the main search flow so the results page has all data.
 */
import '@/src/core/setup';
import { NextResponse } from 'next/server';
import { container } from '@/src/core/container';
import { TYPES } from '@/src/core/types';
import { TrademarkSearchService } from '@/src/core/services/TrademarkSearchService';
import { logger } from '@/src/infrastructure/monitoring/logger';
import { InvalidSearchQueryError } from '@/src/shared/errors';
import { checkDomains } from '@/lib/domain-check';
import { checkSocialHandles } from '@/lib/social-check';
import { checkCommonLawUsage } from '@/lib/google-search';
import { suggestAlternatives } from '@/lib/alternatives';

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    const markText = (body.markText || '').trim();
    const niceClasses = Array.isArray(body.niceClasses) && body.niceClasses.length > 0
      ? body.niceClasses
      : [9, 35, 42];

    if (markText.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Mark text must be at least 2 characters' },
        { status: 400 }
      );
    }

    logger.info({ requestId, markText, niceClasses }, 'Clearance request received');

    const searchService = container.get<TrademarkSearchService>(TYPES.TrademarkSearchService);

    // 1) Federal (USPTO) search
    const result = await searchService.performSearch({
      markText,
      niceClasses,
      includeUSPTOVerification: body.includeUSPTOVerification ?? true,
      forceRefresh: body.forceRefresh ?? false,
    });

    // 2) Domain, social, common law in parallel
    const [domainResults, socialResults, commonLaw] = await Promise.all([
      checkDomains(markText),
      checkSocialHandles(markText),
      checkCommonLawUsage(markText),
    ]);

    // 3) Alternatives when high risk
    const alternatives =
      result.summary.overallRisk === 'high' || result.summary.highRisk > 0
        ? suggestAlternatives(markText, 5)
        : [];

    logger.info(
      { requestId, markText, duration: result.metadata.duration, conflicts: result.conflicts.length },
      'Clearance completed'
    );

    return NextResponse.json({
      success: true,
      requestId,
      results: result.conflicts,
      summary: result.summary,
      query: result.query,
      searchedAt: result.metadata.searchedAt,
      sourcesChecked: result.metadata.sources,
      domainResults,
      socialResults,
      commonLaw: {
        summary: commonLaw.summary,
        results: commonLaw.results,
        manualLinks: commonLaw.manualLinks,
      },
      alternatives,
      disclaimer:
        'This is not legal advice. Consult a trademark attorney for final clearance before filing.',
    });
  } catch (error) {
    logger.error({ requestId, err: error }, 'Clearance request failed');

    if (error instanceof InvalidSearchQueryError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Clearance search failed. Please try again.' },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
