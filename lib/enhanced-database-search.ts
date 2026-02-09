// lib/enhanced-database-search.ts

import { searchDatabase } from './database-search';
import { verifyTrademarksBatch } from './uspto-verification';
import { calculateSimilarityWithBreakdown } from './similarity';
import { calculateRiskLevel, getRiskExplanation, hasClassOverlap } from './risk-assessment';

export async function enhancedSearch(
  markText: string,
  niceClasses: number[]
) {
  console.log('🔍 Starting enhanced search for:', markText);
  
  // Step 1: Search local database (fast - 200ms)
  const candidates = await searchDatabase(markText, niceClasses);
  console.log(`📊 Found ${candidates.length} candidates in database`);
  
  // Step 2: Apply similarity algorithms
  const scored = candidates.map(result => {
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
  
  // Step 3: Filter to relevant results
  const relevant = scored
    .filter(r => r.similarityScore > 40)
    .sort((a, b) => {
      const riskOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
        return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      }
      return b.similarityScore - a.similarityScore;
    });
  
  console.log(`✅ Filtered to ${relevant.length} relevant results`);
  
  // Step 4: Verify top results with USPTO (real-time)
  // Only verify top 10 to avoid rate limits
  const toVerify = relevant.slice(0, 10);
  
  if (toVerify.length > 0) {
    console.log(`🌐 Verifying top ${toVerify.length} results with USPTO...`);
    
    const serialNumbers = toVerify.map(r => r.serialNumber);
    const verifications = await verifyTrademarksBatch(serialNumbers, 5);
    
    // Merge verification data
    const verified = relevant.map(result => {
      const verification = verifications.get(result.serialNumber);
      
      if (verification) {
        return {
          ...result,
          verified: verification.verified,
          currentStatus: verification.status || result.status,
          verifiedAt: verification.verifiedAt
        };
      }
      
      return {
        ...result,
        verified: false,
        currentStatus: result.status,
        verifiedAt: null
      };
    });
    
    const verifiedCount = verified.filter(r => r.verified).length;
    console.log(`✅ Verified ${verifiedCount}/${toVerify.length} trademarks with USPTO`);
    
    return verified;
  }
  
  return relevant;
}