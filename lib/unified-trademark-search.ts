/**
 * Unified trademark search: runs DB fuzzy/phonetic search + RAG semantic text search
 * + CLIP logo search in parallel, then merges and deduplicates results.
 *
 * Always active — no flags required. Gracefully degrades if RAG/CLIP is unavailable.
 */
import { container } from '@/src/core/container';
import { TYPES } from '@/src/core/types';
import {
  TrademarkSearchService,
  TrademarkConflict,
  SearchResult,
} from '@/src/core/services/TrademarkSearchService';
import { ragTrademarkAgent } from './rag-agent';

export interface UnifiedSearchParams {
  markText: string;
  niceClasses: number[];
  logoUrl?: string | null;
  goodsServices?: string | null;
  includeUSPTOVerification?: boolean;
  forceRefresh?: boolean;
}

export interface UnifiedSearchResult {
  conflicts: TrademarkConflict[];
  summary: {
    totalResults: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    overallRisk: 'low' | 'medium' | 'high';
    verifiedCount: number;
  };
  ragSummary: string;
  sourcesChecked: string[];
  logoConflicts: Array<{
    serialNumber: string;
    markText: string;
    logoUrl: string;
    similarity: number;
  }>;
  metadata: {
    searchedAt: string;
    duration: number;
    dbResultCount: number;
    ragTextCount: number;
    ragLogoCount: number;
  };
}

type ChromaResult = {
  id?: string;
  document?: string;
  metadata?: Record<string, unknown>;
  distance?: number;
};

function chromaDistanceToScore(distance: number | undefined): number {
  if (distance == null) return 30;
  // Chroma returns L2/cosine distance: 0 = identical, ~2 = opposite
  // Maps properly: 0→100%, 0.5→75%, 1.0→50%, 1.5→25%, 2.0→0%
  // Old formula (100 - distance*15) was wrong: distance 1.3 → 81% (should be ~35%)
  return Math.round(Math.max(0, Math.min(100, (1 - distance / 2) * 100)));
}

function mergeConflicts(
  dbConflicts: TrademarkConflict[],
  ragMarks: ChromaResult[],
  ragLogos: ChromaResult[]
): TrademarkConflict[] {
  // Index DB conflicts by serialNumber (they have the richest metadata)
  const bySerial = new Map<string, TrademarkConflict & { _sources: string[] }>();

  for (const c of dbConflicts) {
    if (c.serialNumber) {
      bySerial.set(c.serialNumber, { ...c, _sources: ['db'] });
    }
  }

  // Merge RAG semantic text results
  for (const m of ragMarks) {
    const meta = m.metadata || {};
    const sn = String(meta.serial_number ?? meta.serialNumber ?? m.id ?? '').trim();
    if (!sn) continue;
    const chromaScore = chromaDistanceToScore(m.distance);

    if (bySerial.has(sn)) {
      // Only boost DB result if RAG score is meaningfully high (avoids pulling down good DB scores)
      if (chromaScore >= 45) {
        const existing = bySerial.get(sn)!;
        const boosted = Math.max(existing.similarityScore, chromaScore);
        existing.similarityScore = boosted;
        existing.similarityBreakdown.overallScore = boosted;
        existing.riskLevel =
          boosted >= 75 ? 'high' : boosted >= 50 ? 'medium' : 'low';
        existing.riskExplanation += ` [RAG semantic: ${chromaScore}%]`;
        existing._sources.push('rag-text');
      }
    } else {
      // New result from Chroma only (not in DB)
      // Require minimum 45% score to avoid adding semantically-unrelated marks
      if (chromaScore < 45) continue;
      const markText = String(
        meta.mark_text ?? meta.markText ?? m.document ?? ''
      );
      const riskLevel: 'low' | 'medium' | 'high' =
        chromaScore >= 75 ? 'high' : chromaScore >= 50 ? 'medium' : 'low';
      bySerial.set(sn, {
        id: 0,
        serialNumber: sn,
        markText,
        ownerName: String(meta.owner_name ?? meta.ownerName ?? ''),
        status: String(meta.status ?? 'pending') as TrademarkConflict['status'],
        filingDate: String(meta.filing_date ?? meta.filingDate ?? ''),
        niceClasses: Array.isArray(meta.nice_classes)
          ? (meta.nice_classes as number[])
          : Array.isArray(meta.niceClasses)
          ? (meta.niceClasses as number[])
          : [],
        similarityScore: chromaScore,
        similarityBreakdown: {
          overallScore: chromaScore,
          exact: chromaScore,
          visual: chromaScore,
          phonetic: chromaScore,
          fuzzy: chromaScore,
        },
        riskLevel,
        riskExplanation: `Semantic text similarity: ${chromaScore}% (RAG/Chroma)`,
        usptoUrl: `https://tsdr.uspto.gov/#caseNumber=${sn}&caseSearchType=US_APPLICATION&caseType=DEFAULT`,
        _sources: ['rag-text'],
      });
    }
  }

  // Merge CLIP logo results — logo match boosts score significantly
  for (const l of ragLogos) {
    const meta = l.metadata || {};
    const sn = String(meta.serial_number ?? meta.serialNumber ?? l.id ?? '').trim();
    if (!sn) continue;
    const clipScore = chromaDistanceToScore(l.distance);

    if (bySerial.has(sn)) {
      const existing = bySerial.get(sn)!;
      // Logo match adds 5-point bonus on top of the higher score
      const boosted = Math.min(
        100,
        Math.max(existing.similarityScore, clipScore) + 5
      );
      existing.similarityScore = boosted;
      existing.similarityBreakdown.visual = clipScore;
      existing.similarityBreakdown.overallScore = boosted;
      existing.riskLevel =
        boosted >= 75 ? 'high' : boosted >= 50 ? 'medium' : 'low';
      existing.riskExplanation += ` [CLIP logo: ${clipScore}%]`;
      existing._sources.push('clip-logo');
    } else {
      const markText = String(
        meta.mark_text ?? meta.markText ?? l.document ?? ''
      );
      const riskLevel: 'low' | 'medium' | 'high' =
        clipScore >= 75 ? 'high' : clipScore >= 50 ? 'medium' : 'low';
      bySerial.set(sn, {
        id: 0,
        serialNumber: sn,
        markText,
        ownerName: String(meta.owner_name ?? meta.ownerName ?? ''),
        status: String(meta.status ?? 'pending') as TrademarkConflict['status'],
        filingDate: String(meta.filing_date ?? meta.filingDate ?? ''),
        niceClasses: Array.isArray(meta.nice_classes)
          ? (meta.nice_classes as number[])
          : [],
        similarityScore: clipScore,
        similarityBreakdown: {
          overallScore: clipScore,
          exact: 0,
          visual: clipScore,
          phonetic: 0,
          fuzzy: 0,
        },
        riskLevel,
        riskExplanation: `Logo CLIP similarity: ${clipScore}% (CLIP/Chroma)`,
        logoUrl: String(meta.logo_url ?? meta.logoUrl ?? ''),
        usptoUrl: `https://tsdr.uspto.gov/#caseNumber=${sn}&caseSearchType=US_APPLICATION&caseType=DEFAULT`,
        _sources: ['clip-logo'],
      });
    }
  }

  // Sort by score descending
  const sorted = Array.from(bySerial.values())
    .sort((a, b) => b.similarityScore - a.similarityScore);

  // Deduplicate by normalized markText — multiple USPTO registrations of the same
  // mark name are grouped: keep the highest-scoring representative, store count.
  const byMarkText = new Map<string, typeof sorted[number] & { registrationCount: number }>();
  for (const r of sorted) {
    const key = r.markText.toLowerCase().trim();
    if (byMarkText.has(key)) {
      const existing = byMarkText.get(key)!;
      existing.registrationCount++;
      // If this registration has a worse status (dead < pending < live), prefer live/pending
      const statusRank = (s: string) => s === 'live' ? 3 : s === 'pending' ? 2 : s === 'abandoned' ? 1 : 0;
      if (statusRank(r.status) > statusRank(existing.status)) {
        // Replace with better-status record but keep count
        const count = existing.registrationCount;
        byMarkText.set(key, { ...r, registrationCount: count, _sources: r._sources });
      }
    } else {
      byMarkText.set(key, { ...r, registrationCount: 1 });
    }
  }

  return Array.from(byMarkText.values())
    .slice(0, 50)
    .map((r, i) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _sources, registrationCount, ...rest } = r;
      return {
        ...rest,
        id: i + 1,
        registrationCount,
        riskExplanation: registrationCount > 1
          ? `${rest.riskExplanation} (${registrationCount} USPTO registrations)`
          : rest.riskExplanation,
      };
    });
}

/**
 * Run DB + RAG + CLIP search in parallel, merge, and return.
 * Requires @/src/core/setup to have been imported in the calling module.
 */
export async function unifiedTrademarkSearch(
  params: UnifiedSearchParams
): Promise<UnifiedSearchResult> {
  const start = Date.now();
  const {
    markText,
    niceClasses,
    logoUrl,
    includeUSPTOVerification = true,
    forceRefresh = false,
  } = params;

  const searchService = container.get<TrademarkSearchService>(
    TYPES.TrademarkSearchService
  );

  // Run DB search and RAG (semantic + CLIP) in parallel
  const [dbSettled, ragSettled] = await Promise.allSettled([
    searchService.performSearch({
      markText,
      niceClasses,
      includeUSPTOVerification,
      forceRefresh,
    }),
    ragTrademarkAgent({ markText, logoUrl: logoUrl || undefined }),
  ]);

  const dbResult: SearchResult | null =
    dbSettled.status === 'fulfilled' ? dbSettled.value : null;
  const ragResult =
    ragSettled.status === 'fulfilled' ? ragSettled.value : null;

  if (dbSettled.status === 'rejected') {
    console.error('[unified-search] DB search failed:', dbSettled.reason);
  }
  if (ragSettled.status === 'rejected') {
    console.warn(
      '[unified-search] RAG/CLIP unavailable (Chroma or ML service down?):',
      ragSettled.reason
    );
  }

  const dbConflicts = dbResult?.conflicts ?? [];
  const ragMarks = (ragResult?.similarMarks ?? []) as ChromaResult[];
  const ragLogos = (ragResult?.similarLogos ?? []) as ChromaResult[];

  const conflicts = mergeConflicts(dbConflicts, ragMarks, ragLogos);

  const highRisk = conflicts.filter((r) => r.riskLevel === 'high').length;
  const mediumRisk = conflicts.filter((r) => r.riskLevel === 'medium').length;
  const lowRisk = conflicts.filter((r) => r.riskLevel === 'low').length;
  const overallRisk: 'low' | 'medium' | 'high' =
    highRisk > 0 ? 'high' : mediumRisk > 2 ? 'high' : mediumRisk > 0 ? 'medium' : 'low';

  const sources = ['USPTO DB (fuzzy/phonetic/exact)'];
  if (ragResult) {
    sources.push('Chroma (semantic text embeddings)');
    if (ragLogos.length > 0) {
      sources.push('Chroma (CLIP logo embeddings)');
    }
  }

  const logoConflicts = ragLogos
    .slice(0, 10)
    .map((l) => ({
      serialNumber: String(
        l.metadata?.serial_number ?? l.metadata?.serialNumber ?? l.id ?? ''
      ),
      markText: String(
        l.metadata?.mark_text ?? l.metadata?.markText ?? l.document ?? ''
      ),
      logoUrl: String(l.metadata?.logo_url ?? l.metadata?.logoUrl ?? ''),
      similarity: chromaDistanceToScore(l.distance),
    }));

  return {
    conflicts,
    summary: {
      totalResults: conflicts.length,
      highRisk,
      mediumRisk,
      lowRisk,
      overallRisk,
      verifiedCount: dbResult?.summary.verifiedCount ?? 0,
    },
    ragSummary: ragResult?.summary ?? '',
    sourcesChecked: sources,
    logoConflicts,
    metadata: {
      searchedAt: new Date().toISOString(),
      duration: Date.now() - start,
      dbResultCount: dbConflicts.length,
      ragTextCount: ragMarks.length,
      ragLogoCount: ragLogos.length,
    },
  };
}
