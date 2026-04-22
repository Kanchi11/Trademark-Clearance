#!/bin/bash
# Comprehensive Trademark Clearance App Test Suite
# Tests all core requirements while import runs in background

cd "$(dirname "$0")/.."

echo "🧪 TRADEMARK CLEARANCE APP - COMPREHENSIVE TEST SUITE"
echo "======================================================="
echo ""
echo "Testing against current database state..."
echo ""

# Check if server is running
if ! curl -s http://localhost:3001 > /dev/null 2>&1; then
  echo "⚠️  Next.js server not running. Starting it now..."
  npm run dev > /dev/null 2>&1 &
  sleep 10
fi

# Test 1: Basic USPTO Search
echo "TEST 1: Basic USPTO Text Search"
echo "--------------------------------"
curl -s -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{"markText":"Nike","niceClasses":[25]}' | jq '{
    success,
    totalConflicts: .results | length,
    firstMatch: .results[0] | {serial: .serialNumber, mark: .markText, similarity: .similarityScore, risk: .riskLevel}
  }'
echo ""

# Test 2: Phonetic Search (Soundex & Metaphone)
echo "TEST 2: Phonetic Matching"
echo "-------------------------"
curl -s -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{"markText":"Knight","niceClasses":[25]}' | jq '{
    success,
    phoneticMatches: [.results[] | select(.matchType == "soundex" or .matchType == "metaphone") | {mark: .markText, type: .matchType, score: .similarityScore}] | .[0:3]
  }'
echo ""

# Test 3: Nice Class Filtering
echo "TEST 3: Nice Class Filtering"
echo "-----------------------------"
curl -s -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{"markText":"Apple","niceClasses":[9]}' | jq '{
    success,
    class9Conflicts: .results | length,
    sampleClasses: [.results[0:3][] | .niceClasses]
  }'
echo ""

# Test 4: Status Filtering (Live vs Dead)
echo "TEST 4: Live/Dead Status Filtering"
echo "-----------------------------------"
curl -s -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{"markText":"Abandoned","niceClasses":[35]}' | jq '{
    success,
    statusBreakdown: [.results | group_by(.status)[] | {status: .[0].status, count: length}]
  }'
echo ""

# Test 5: Full Clearance Search (All Features)
echo "TEST 5: Complete Clearance Search"
echo "----------------------------------"
curl -s -X POST http://localhost:3001/api/clearance \
  -H "Content-Type: application/json" \
  -d '{
    "markText": "TechFlow",
    "niceClasses": [9, 42],
    "description": "Software development tools"
  }' | jq '{
    success,
    requestId,
    usptoConflicts: .results | length,
    overallRisk: .summary.overallRisk,
    riskBreakdown: .summary,
    domainResults: {
      likelyAvailable: .domainResults.likelyAvailable | length,
      likelyTaken: .domainResults.likelyTaken | length
    },
    socialHandles: .socialResults.handles | length,
    commonLawRisk: .commonLaw.riskLevel,
    alternativesGenerated: .alternatives | length,
    disclaimer: .disclaimer
  }'
echo ""

# Test 6: Similarity Scoring
echo "TEST 6: Similarity Score Accuracy"
echo "----------------------------------"
curl -s -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{"markText":"NIKE","niceClasses":[25]}' | jq '{
    topMatches: [.results[0:5][] | {
      mark: .markText,
      score: .similarityScore,
      risk: .riskLevel,
      status: .status,
      matchType: .matchType
    }]
  }'
echo ""

# Test 7: Domain Checking
echo "TEST 7: Domain Availability Check"
echo "----------------------------------"
curl -s -X POST http://localhost:3001/api/domain-check \
  -H "Content-Type: application/json" \
  -d '{"markText":"TestBrand123"}' | jq '{
    totalChecked: . | length,
    available: [.[] | select(.status == "likely_available") | .domain],
    taken: [.[] | select(.status == "likely_taken") | .domain]
  }'
echo ""

# Test 8: Check Current Database Stats
echo "TEST 8: Database Stats & Field Population"
echo "------------------------------------------"
npx tsx -e "
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';

async function stats() {
  const total = await db.execute(sql\`SELECT COUNT(*) as count FROM uspto_trademarks\`);
  const withMetaphone = await db.execute(sql\`SELECT COUNT(*) as count FROM uspto_trademarks WHERE mark_metaphone IS NOT NULL\`);
  const withGoods = await db.execute(sql\`SELECT COUNT(*) as count FROM uspto_trademarks WHERE goods_services IS NOT NULL\`);
  const statuses = await db.execute(sql\`SELECT status, COUNT(*) as count FROM uspto_trademarks GROUP BY status\`);

  const results = {
    total: total[0]?.count || total.rows?.[0]?.count || 0,
    withMetaphone: withMetaphone[0]?.count || withMetaphone.rows?.[0]?.count || 0,
    withGoods: withGoods[0]?.count || withGoods.rows?.[0]?.count || 0,
    statuses: (statuses.rows || statuses).map(s => ({ status: s.status, count: Number(s.count) }))
  };

  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

stats();
" 2>/dev/null
echo ""

# Test 9: Error Handling
echo "TEST 9: Error Handling & Validation"
echo "------------------------------------"
echo "Testing empty search:"
curl -s -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{"markText":"","niceClasses":[9]}' | jq '{success, error}'
echo ""
echo "Testing single character:"
curl -s -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{"markText":"X","niceClasses":[9]}' | jq '{success, error}'
echo ""

# Test 10: Response Time
echo "TEST 10: Performance Testing"
echo "-----------------------------"
echo "Measuring search response time..."
time curl -s -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{"markText":"Test","niceClasses":[9,42]}' > /dev/null
echo ""

echo "✅ TEST SUITE COMPLETE"
echo ""
echo "📊 NEXT STEPS:"
echo "1. Review test results above"
echo "2. Verify all API endpoints return success=true"
echo "3. Check similarity scores are reasonable (0-100)"
echo "4. Confirm risk levels are accurate"
echo "5. Test PDF report generation manually"
echo "6. Wait for import to complete for full dataset testing"
echo ""
echo "📝 See FEATURE_CHECKLIST.md for detailed requirements"
