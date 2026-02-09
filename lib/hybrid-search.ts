// lib/hybrid-search.ts

import { searchDatabase } from './database-search';
import { searchUSPTOAPI } from './uspto-api';
import { calculateSimilarityWithBreakdown } from './similarity';
import { calculateRiskLevel, getRiskExplanation, hasClassOverlap, type RiskLevel } from './risk-assessment';

export async function hybridSearch(
  markText: string,
  niceClasses: number[]
) {
  console.log('🔍 Starting hybrid search...');
  
  // Run BOTH searches in parallel
  const [dbResults, apiResults] = await Promise.allSettled([
    searchDatabase(markText, niceClasses),
    searchUSPTOAPI({ markText, niceClasses, limit: 50 })
  ]);
  
  // Extract results (handle failures gracefully)
  const dbData = dbResults.status === 'fulfilled' ? dbResults.value : [];
  const apiData = apiResults.status === 'fulfilled' ? apiResults.value : [];
  
  console.log(`📊 Database: ${dbData.length} results`);
  console.log(`🌐 USPTO API: ${apiData.length} results`);
  
  // Merge and deduplicate by serial number
  const merged = mergeAndDeduplicate(dbData, apiData);
  
  console.log(`✅ Total unique results: ${merged.length}`);
  
  // Apply YOUR algorithms to ALL results
  const scored = merged.map(result => {
    const similarity = calculateSimilarityWithBreakdown(markText, result.markText);
    const sameClass = hasClassOverlap(niceClasses, result.niceClasses);
    const riskLevel = calculateRiskLevel({
      similarityScore: similarity.overallScore,
      sameClass,
      status: result.status as any
    });
    
    return {
      ...result,
      similarityScore: similarity.overallScore,
      similarityBreakdown: similarity,
      riskLevel,
      riskExplanation: getRiskExplanation({
        similarityScore: similarity.overallScore,
        sameClass,
        status: result.status as any
      }),
      sameClass
    };
  });
  
  // Filter and sort
  const relevant = scored.filter(r => r.similarityScore > 40);
  const sorted = relevant.sort((a, b) => {
    // Sort by risk, then similarity
    const riskOrder: Record<RiskLevel, number> = { high: 3, medium: 2, low: 1 };
    const aRisk = riskOrder[a.riskLevel as RiskLevel];
    const bRisk = riskOrder[b.riskLevel as RiskLevel];
    
    if (aRisk !== bRisk) {
      return bRisk - aRisk;
    }
    return b.similarityScore - a.similarityScore;
  });
  
  return sorted;
}

function mergeAndDeduplicate(dbResults: any[], apiResults: any[]): any[] {
  const seen = new Set<string>();
  const merged: any[] = [];
  
  // Add database results first
  for (const result of dbResults) {
    if (!seen.has(result.serialNumber)) {
      seen.add(result.serialNumber);
      merged.push({ ...result, source: 'database' });
    }
  }
  
  // Add API results that aren't already in database
  for (const result of apiResults) {
    if (!seen.has(result.serialNumber)) {
      seen.add(result.serialNumber);
      merged.push({ ...result, source: 'api' });
    }
  }
  
  return merged;
}