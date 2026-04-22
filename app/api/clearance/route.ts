/**
 * Full clearance search: USPTO DB + RAG semantic + CLIP logo + domain + social + common law + alternatives.
 * Always uses the unified pipeline (DB + Chroma + CLIP). No feature flags needed.
 */
import '@/src/core/setup';
import { NextResponse } from 'next/server';
import { logger } from '@/src/infrastructure/monitoring/logger';
import { InvalidSearchQueryError } from '@/src/shared/errors';
import { checkDomains } from '@/lib/domain-check';
import { checkSocialHandles } from '@/lib/social-check';
import { checkCommonLawUsage } from '@/lib/google-search';
import { suggestAlternatives } from '@/lib/alternatives';
import { getCached, setCached, generateSearchCacheKey } from '@/lib/cache';
import { STATE_REGISTRY_LINKS } from '@/lib/constants';
import { unifiedTrademarkSearch } from '@/lib/unified-trademark-search';

const DISCLAIMER =
  'This is not legal advice; consult a trademark attorney for final clearance.';

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    const markText = (body.markText || '').trim();
    const logoUrl = body.logoUrl || null;
    const description = body.description || null;
    const goodsServices = body.goodsServices || null;

    const rawClasses = Array.isArray(body.niceClasses) ? body.niceClasses : [];
    const niceClasses = rawClasses
      .map((c: unknown) => Number(c))
      .filter((c: number) => Number.isInteger(c) && c >= 1 && c <= 45);
    if (niceClasses.length === 0) {
      niceClasses.push(9, 35, 42);
    }

    if (markText.length < 2 || markText.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Mark text must be between 2 and 200 characters' },
        { status: 400 }
      );
    }

    logger.info(
      { requestId, markText, niceClasses, hasLogo: !!logoUrl },
      'Clearance request received'
    );

    const cacheKey = generateSearchCacheKey(markText, niceClasses, logoUrl);
    if (!body.forceRefresh) {
      const cached = await getCached<object>(cacheKey);
      if (cached) {
        logger.info({ requestId, markText }, 'Returning cached clearance results');
        return NextResponse.json({ ...cached, requestId, fromCache: true });
      }
    }

    // Run unified search: DB + Chroma RAG + CLIP in parallel
    const unified = await unifiedTrademarkSearch({
      markText,
      niceClasses,
      logoUrl,
      goodsServices,
      includeUSPTOVerification: body.includeUSPTOVerification ?? false,
      forceRefresh: body.forceRefresh ?? false,
    });

    // Domain, social, and common-law checks (run in parallel)
    const [domainResults, socialResults, commonLaw] = await Promise.all([
      checkDomains(markText),
      checkSocialHandles(markText),
      checkCommonLawUsage(markText),
    ]);

    const hasHighRisk =
      unified.summary.overallRisk === 'high' || unified.summary.highRisk > 0;
    const alternativeTexts = hasHighRisk ? suggestAlternatives(markText, 5) : [];
    const alternatives = alternativeTexts.map((text: string) => ({
      text,
      riskLevel: 'low' as const,
      conflictCount: 0,
      reason: 'Suggested variation; run a new search to verify.',
      verified: false,
    }));

    const domainByStatus = {
      likelyAvailable: domainResults
        .filter((d) => d.status === 'likely_available')
        .map((d) => ({ domain: d.domain, registrarUrl: d.registrarCheckUrl })),
      likelyTaken: domainResults
        .filter((d) => d.status === 'likely_taken')
        .map((d) => ({ domain: d.domain, registrarUrl: d.registrarCheckUrl })),
    };

    const responseData = {
      success: true,
      requestId,
      results: unified.conflicts,
      summary: unified.summary,
      query: {
        markText,
        niceClasses,
        logoUrl: logoUrl || undefined,
        description: description || undefined,
        goodsServices: goodsServices || undefined,
      },
      searchedAt: unified.metadata.searchedAt,
      sourcesChecked: unified.sourcesChecked,
      pipeline: {
        dbResults: unified.metadata.dbResultCount,
        ragTextResults: unified.metadata.ragTextCount,
        clipLogoResults: unified.metadata.ragLogoCount,
        ragSummary: unified.ragSummary,
      },
      domainResults: domainByStatus,
      socialResults: {
        handles: socialResults.map((s) => ({
          platform: s.platform,
          username: s.handle.replace(/^@/, ''),
          profileUrl: s.url,
        })),
      },
      commonLaw: {
        summary: commonLaw.summary,
        riskLevel: commonLaw.riskLevel,
        results: commonLaw.results.map((r) => ({
          title: r.title,
          link: r.link,
          snippet: r.snippet,
          displayLink: r.displayLink,
          relevanceScore: r.relevanceScore,
        })),
        manualLinks: [...commonLaw.manualLinks, ...STATE_REGISTRY_LINKS],
      },
      alternatives,
      logoSimilarity: {
        checked: !!logoUrl,
        conflicts: unified.logoConflicts,
        summary:
          unified.logoConflicts.length > 0
            ? `Found ${unified.logoConflicts.length} mark(s) with similar logo (CLIP/Chroma).`
            : logoUrl
            ? 'No similar logos found in Chroma vector store.'
            : 'No logo provided.',
      },
      disclaimer: DISCLAIMER,
    };

    await setCached(cacheKey, responseData, { ttl: 3600 });
    return NextResponse.json(responseData);
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
