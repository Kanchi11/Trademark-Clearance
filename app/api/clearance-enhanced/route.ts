/**
 * Enhanced clearance search with logo/image similarity
 * Accepts both text mark and optional logo image
 * Returns conflicts enhanced with image similarity scores
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
import {
  calculateImageSimilarity,
  validateImageBuffer,
  calculatePerceptualHash
} from '@/lib/image-similarity';
import { storeUploadedImage, loadStoredImage } from '@/lib/image-upload';

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    // Parse request - support both JSON and FormData
    let body: any;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = {
        markText: formData.get('markText'),
        niceClasses: formData.get('niceClasses') ? JSON.parse(formData.get('niceClasses') as string) : [],
        includeUSPTOVerification: formData.get('includeUSPTOVerification') === 'true',
        forceRefresh: formData.get('forceRefresh') === 'true',
        logoFile: formData.get('logo') as File | null,
      };
    } else {
      body = await request.json();
    }

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

    logger.info({ requestId, markText, niceClasses, hasLogo: !!body.logoFile || !!body.logoUrl }, 'Enhanced clearance request received');

    // Handle logo upload if provided
    let logoUrl = body.logoUrl || '';
    let logoHash: string | null = null;

    if (body.logoFile instanceof File) {
      const logoBuffer = Buffer.from(await body.logoFile.arrayBuffer());

      // Validate image
      if (!validateImageBuffer(logoBuffer)) {
        return NextResponse.json(
          { success: false, error: 'Invalid image file (must be PNG, JPG, GIF, or WebP)' },
          { status: 400 }
        );
      }

      if (logoBuffer.length > 5 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: 'Image file too large (max 5MB)' },
          { status: 413 }
        );
      }

      // Store image
      const storageResult = await storeUploadedImage(
        logoBuffer,
        body.logoFile.type,
        body.logoFile.name
      );

      if (storageResult.error) {
        logger.warn({ requestId, error: storageResult.error }, 'Image storage failed');
      } else {
        logoUrl = storageResult.url;
        // Calculate perceptual hash for logo
        try {
          const { loadImage } = await import('@/lib/image-similarity');
          const imageData = await loadImage(logoBuffer);
          logoHash = calculatePerceptualHash(imageData);
          logger.info({ requestId, logoHash }, 'Logo hash calculated');
        } catch (err) {
          logger.warn({ requestId, err }, 'Failed to calculate logo hash');
        }
      }
    } else if (typeof body.logoUrl === 'string') {
      logoUrl = body.logoUrl;
    }

    // Perform text-based search
    const searchService = container.get<TrademarkSearchService>(TYPES.TrademarkSearchService);

    const result = await searchService.performSearch({
      markText,
      niceClasses,
      includeUSPTOVerification: body.includeUSPTOVerification ?? true,
      forceRefresh: body.forceRefresh ?? false,
    });

    // Enhance results with logo similarity if available
    let enhancedConflicts = result.conflicts;

    if (logoUrl && body.logoFile instanceof File) {
      const logoBuffer = Buffer.from(await body.logoFile.arrayBuffer());

      // For each high-similarity conflict, try to enhance with image similarity
      // Note: This requires trademark images to be available
      // For MVP, we just store the logo hash and score
      enhancedConflicts = result.conflicts.map((conflict) => ({
        ...conflict,
        logoSimilarityScore: null, // Will be enhanced when trademark images available
        userLogoHash: logoHash,
      }));

      logger.info(
        { requestId, conflictCount: enhancedConflicts.length, hasImageComparison: logoHash !== null },
        'Logo similarity enhancement completed'
      );
    }

    // Domain, social, common law in parallel
    const [domainResults, socialResults, commonLaw] = await Promise.all([
      checkDomains(markText),
      checkSocialHandles(markText),
      checkCommonLawUsage(markText),
    ]);

    // Alternatives when high risk
    const alternatives =
      result.summary.overallRisk === 'high' || result.summary.highRisk > 0
        ? suggestAlternatives(markText, 5)
        : [];

    logger.info(
      { requestId, markText, duration: result.metadata.duration, conflicts: enhancedConflicts.length },
      'Enhanced clearance completed'
    );

    return NextResponse.json({
      success: true,
      requestId,
      results: enhancedConflicts,
      summary: result.summary,
      query: { ...result.query, logoUrl, hasLogo: !!logoUrl },
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
    logger.error({ requestId, err: error }, 'Enhanced clearance request failed');

    if (error instanceof InvalidSearchQueryError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Clearance search failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;

/**
 * Usage Examples:
 *
 * 1. Text-only search (JSON):
 * POST /api/clearance
 * Content-Type: application/json
 *
 * {
 *   "markText": "MyBrand",
 *   "niceClasses": [35, 42],
 *   "includeUSPTOVerification": true
 * }
 *
 *
 * 2. With logo upload (FormData):
 * POST /api/clearance
 * Content-Type: multipart/form-data
 *
 * markText: "MyBrand"
 * niceClasses: "[35, 42]"
 * logo: <File>  // PNG, JPG, GIF, or WebP (max 5MB)
 *
 *
 * 3. With logo URL (JSON):
 * POST /api/clearance
 * Content-Type: application/json
 *
 * {
 *   "markText": "MyBrand",
 *   "niceClasses": [35, 42],
 *   "logoUrl": "/uploads/my-logo.png"
 * }
 *
 *
 * Response example:
 * {
 *   "success": true,
 *   "requestId": "uuid",
 *   "results": [
 *     {
 *       "serialNumber": "88000001",
 *       "markText": "MYBRAND",
 *       "ownerName": "Example Corp",
 *       "status": "live",
 *       "similarityScore": 92,
 *       "riskLevel": "high",
 *       "logoSimilarityScore": null,  // Enhanced when logo images available
 *       "userLogoHash": "0110101010..."
 *     }
 *   ],
 *   "summary": { ... },
 *   "domainResults": [ ... ],
 *   "socialResults": [ ... ],
 *   "alternatives": [ ... ],
 *   "disclaimer": "..."
 * }
 */
