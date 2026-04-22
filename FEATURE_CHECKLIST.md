# TRADEMARK CLEARANCE APP - COMPLETE FEATURE CHECKLIST

## ✅ = Implemented | ⚠️ = Needs Testing | ❌ = Missing | 🔧 = Needs Fix

---

## 1. INPUT HANDLING

### 1.1 Accept Proposed Mark Text
- ✅ Text input (min 2 characters)
- ✅ Normalization (trim, lowercase)
- ✅ Validation

### 1.2 Logo Image Upload
- ✅ Logo URL input supported
- ✅ Image processing (perceptual hashing)
- ⚠️ **TEST:** Upload real logo and verify similarity works
- ⚠️ **TEST:** Check fallback when logo_hash not computed yet

### 1.3 Goods/Services / Nice Class Selection
- ✅ Nice class array input (default: [9, 35, 42])
- ✅ Description field supported
- ⚠️ **NEW DATA:** goods_services now populated in DB ✅
- ⚠️ **TEST:** Verify class filtering works correctly

---

## 2. USPTO SEARCH (Federal Trademarks)

### 2.1 Text Similarity Search
- ✅ Exact matches
- ✅ Normalized matches (case/space insensitive)
- ⚠️ **TEST:** Search "Nike" finds "NIKE", "nike", "N I K E"

### 2.2 Phonetic Matching
- ✅ Soundex implemented
- ✅ **NEW:** Metaphone now populated ✅
- ⚠️ **TEST:** Search "Nike" finds "Nyke", "Naik"
- ⚠️ **TEST:** Verify metaphone gives better results than soundex

### 2.3 Partial Matches
- ✅ Contains/substring matching
- ⚠️ **TEST:** Search "Apple" finds "Apple Inc", "Big Apple", "Appleton"

### 2.4 Live/Dead Filtering
- ✅ Status filtering (live/abandoned/pending)
- ✅ **FIXED:** Status codes correctly mapped ✅
- ⚠️ **TEST:** Verify only "live" marks show in high-risk

### 2.5 Nice Class Filtering
- ✅ Array overlap checking (`niceClasses && ARRAY[...]`)
- ⚠️ **TEST:** "Apple" in class 9 (computers) vs class 31 (fruit)

---

## 3. LOGO SIMILARITY

### 3.1 Image Processing
- ✅ Perceptual hashing (pHash)
- ✅ Hamming distance calculation
- ✅ 75% threshold (industry standard)
- ⚠️ **TEST:** Upload similar logos, verify detection

### 3.2 Efficient Search
- ✅ Pre-computed hash database search
- ✅ Fallback to random sampling (50 logos)
- ❌ **MISSING:** Logo hashes not computed yet (import just started)
- 🔧 **ACTION:** Need to batch-compute logo hashes after import

---

## 4. STATE TRADEMARK DATABASES

- ❌ **NOT IMPLEMENTED YET**
- 🔧 **ACTION:** State databases not accessible in v1 (scope boundary)
- **Note:** API mentions "where accessible" - OK to skip for MVP

---

## 5. COMMON LAW SEARCHES

### 5.1 Web Results (Google Search API)
- ✅ Google Custom Search implemented (`/lib/google-search`)
- ✅ Returns top results with snippets
- ✅ Risk assessment based on results
- ⚠️ **TEST:** Verify Google API key works
- ⚠️ **TEST:** Check rate limits

### 5.2 Social Handle Availability
- ✅ Platform checks (Twitter, Instagram, Facebook, TikTok, LinkedIn)
- ✅ Profile URL generation
- ⚠️ **NOTE:** Returns "handles to check" not actual availability
- ⚠️ **TEST:** Verify all 5 platforms generate correct URLs

### 5.3 Domain Availability
- ✅ TLD checking (.com, .net, .org, .io, .app, .co)
- ✅ "Likely available" vs "likely taken" language
- ✅ Registrar check URLs provided
- ⚠️ **TEST:** Verify domain API works

---

## 6. SIMILARITY SCORING (0-100)

### 6.1 Text Score Components
- ✅ Exact match: 100
- ✅ Normalized match: 95
- ✅ Soundex match: 80-90
- ✅ Metaphone match: 85-95 (better than soundex)
- ✅ Contains match: 60-75
- ⚠️ **TEST:** Verify scores are reasonable
- ⚠️ **CHECK:** Review TrademarkSearchService scoring logic

### 6.2 Additional Factors
- ✅ Nice class overlap (+10-20 points if same class)
- ✅ Status weight (live = higher risk)
- ⚠️ **NEW:** Goods/services context can reduce score ✅
- ⚠️ **TEST:** "Apple" computers vs "Apple" fruit should score differently

---

## 7. RISK LEVEL ASSESSMENT

### 7.1 Risk Classification
- ✅ **High Risk:** Similarity >75% + live + same class
- ✅ **Medium Risk:** Similarity 60-75% OR dead + same class
- ✅ **Low Risk:** Similarity <60% OR different class/industry
- ⚠️ **TEST:** Verify risk levels are accurate

### 7.2 Risk Summary
- ✅ Overall risk level (high/medium/low)
- ✅ Count by risk level
- ✅ Total conflicts found
- ⚠️ **TEST:** Verify summary calculations

---

## 8. EVIDENCE & LINKS

### 8.1 USPTO Links
- ✅ Serial number
- ✅ Direct TSDR link to USPTO record
- ✅ Logo image URL
- ⚠️ **TEST:** Click links to verify they work

### 8.2 Common Law Evidence
- ✅ Google search result snippets
- ✅ Manual search links (Google, social platforms)
- ⚠️ **TEST:** Verify evidence is useful/relevant

### 8.3 Screenshots
- ❌ **NOT IMPLEMENTED**
- **Note:** Evidence links provided instead (acceptable for MVP)

---

## 9. ALTERNATIVE SUGGESTIONS

### 9.1 Smart Alternatives
- ✅ Generated for high/medium risk
- ✅ Verified against USPTO database
- ✅ Phonetic variations
- ✅ Prefix/suffix variations
- ✅ Shows conflict count for each alternative
- ⚠️ **TEST:** Verify alternatives are actually safer

### 9.2 Alternative Details
- ✅ Text suggestion
- ✅ Risk level
- ✅ Conflict count
- ✅ Reason/explanation
- ✅ "Verified" flag

---

## 10. PDF REPORT GENERATION

### 10.1 Report API
- ✅ `/api/report` endpoint exists
- ⚠️ **TEST:** Generate PDF and verify contents
- ⚠️ **CHECK:** Verify all required sections included

### 10.2 Required Report Sections
- ⚠️ Query details (mark, classes, date)
- ⚠️ Overall risk assessment
- ⚠️ USPTO conflicts (ranked by similarity)
- ⚠️ Domain results
- ⚠️ Social handle results
- ⚠️ Common law findings
- ⚠️ Alternative suggestions
- ⚠️ Disclaimer (legal)
- ⚠️ Evidence links
- ⚠️ Logo similarity (if uploaded)

---

## 11. DISCLAIMER

### 11.1 Legal Disclaimer
- ✅ Included in API response
- ✅ Text: "This is not legal advice. Consult a trademark attorney for final clearance before filing."
- ⚠️ **TEST:** Verify displays in UI
- ⚠️ **TEST:** Verify appears in PDF report

---

## 12. PERFORMANCE & CACHING

### 12.1 Response Times
- ✅ Caching implemented (1 hour TTL)
- ✅ Parallel execution (domain + social + common law)
- ⚠️ **TEST:** Time full clearance search
- ⚠️ **TARGET:** <3 seconds with cache, <10 seconds without

### 12.2 Database Performance
- ✅ Indexes on serial_number
- ⚠️ **NEW:** Need index on mark_metaphone for phonetic search
- ⚠️ **NEW:** Need index on goods_services for filtering
- ⚠️ **CHECK:** Query performance after import complete

---

## 13. EDGE CASES & ERROR HANDLING

### 13.1 Input Validation
- ✅ Minimum length (2 chars)
- ⚠️ **TEST:** Special characters
- ⚠️ **TEST:** Very long names (>500 chars)
- ⚠️ **TEST:** Non-English characters

### 13.2 API Failures
- ✅ Google API quota exceeded
- ✅ Logo image load failure
- ✅ Database connection issues
- ⚠️ **TEST:** Verify graceful degradation

---

## TESTING PRIORITY (While Import Runs)

### HIGH PRIORITY (Test Now)
1. ✅ Search API with current 20K records
2. ✅ Similarity scoring accuracy
3. ✅ Risk level calculation
4. ✅ Domain/social/Google APIs work
5. ✅ PDF report generation

### MEDIUM PRIORITY (Test After Import)
1. ⚠️ Metaphone phonetic search
2. ⚠️ Goods/services filtering
3. ⚠️ Full 1.6M dataset performance
4. ⚠️ Alternative suggestions quality

### LOW PRIORITY (Post-Launch)
1. Logo hash batch computation (for efficient search)
2. Additional index optimization
3. State trademark databases
4. Advanced screenshot capture

---

## DATABASE MIGRATION NEEDED

After import completes, run:

```sql
-- Index for phonetic search
CREATE INDEX IF NOT EXISTS idx_mark_metaphone ON uspto_trademarks (mark_metaphone);

-- Index for goods/services search
CREATE INDEX IF NOT EXISTS idx_goods_services ON uspto_trademarks USING gin(to_tsvector('english', goods_services));

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_status ON uspto_trademarks (status);
```

---

## FINAL CHECKLIST BEFORE LAUNCH

- [ ] All API endpoints tested
- [ ] Search works with metaphone + goods/services
- [ ] PDF report generates correctly
- [ ] Disclaimer appears everywhere
- [ ] Alternative suggestions are safe
- [ ] Risk levels are accurate
- [ ] Performance <10 seconds
- [ ] Error handling works
- [ ] Logo similarity functional (after hash computation)
- [ ] Database indexes created
