# 🧪 Demo Examples for Testing

Try these real-world examples to see different features in action!

---

## 📝 **Text Search Examples**

### 1. **High-Risk Conflicts** (Should show RED alerts)
```
Mark: "APPLE"
Nice Classes: 9 (Computers)
Expected: Multiple high-risk conflicts
Why: Extremely common, heavily protected trademark
```

```
Mark: "NIKE"
Nice Classes: 25 (Footwear)
Expected: High-risk conflicts
Why: Famous shoe brand
```

```
Mark: "STARBUCKS"
Nice Classes: 30 (Coffee), 43 (Restaurant services)
Expected: High-risk conflicts
Why: Well-known coffee brand
```

### 2. **Medium-Risk** (Phonetic/Visual Similarities)
```
Mark: "Appletech"
Nice Classes: 9 (Computers)
Expected: Medium risk (sounds like "Apple")
Why: Phonetic similarity with famous mark
```

```
Mark: "TechFlow"
Nice Classes: 42 (Software)
Expected: Medium risk (common pattern)
Why: Many similar "Tech___" marks
```

```
Mark: "CloudSync"
Nice Classes: 9 (Software), 42 (SaaS)
Expected: Medium risk
Why: Common tech terminology
```

### 3. **Low-Risk** (Safe/Available)
```
Mark: "YourCompanyName2026"
Nice Classes: 9, 35, 42
Expected: Low risk or no conflicts
Why: Unique, specific combination
```

```
Mark: "ZephyrQuantumBeta"
Nice Classes: 42
Expected: Low risk
Why: Uncommon word combination
```

---

## 🎨 **Logo Upload Examples**

### Option 1: Use Sample USPTO Logos
Visit these trademarks to download sample logos:

1. **McDonald's Golden Arches**
   - Search "MCDONALDS" → Class 43
   - Download logo from USPTO
   - Upload and see 100% match

2. **Nike Swoosh**
   - Search "NIKE" → Class 25
   - Test logo similarity

3. **Simple Letter Logos**
   - Search any single-letter mark (e.g., "M", "N")
   - Test visual similarity

### Option 2: Create Test Logos
Use simple shapes to test:
- **Circle with text** (many conflicts)
- **Square/Diamond** (moderate conflicts)
- **Unique abstract shape** (low conflicts)

---

## 🧪 **Complete Test Scenarios**

### Scenario 1: **New Tech Startup**
```yaml
Step 1: Business Info
  - Business Name: "TechFlow Inc"
  - Business Type: Technology
  - Industry: Software Development

Step 2: Trademark Details
  - Mark Text: "TechFlow"
  - Logo: Upload a simple "TF" monogram
  - Description: "Cloud-based workflow automation software"

Step 3: Nice Classes
  - Select: 9 (Software), 42 (SaaS)

Expected Results:
  - Text: 5-15 similar marks
  - Risk: Medium (common tech words)
  - Domains: .com likely taken, .io available
  - Alternatives: "FlowTech", "TechStream", etc.
```

### Scenario 2: **E-Commerce Brand**
```yaml
Step 1: Business Info
  - Business Name: "UrbanStyle"
  - Business Type: Retail
  - Industry: Fashion/Apparel

Step 2: Trademark Details
  - Mark Text: "UrbanStyle"
  - Logo: (optional)
  - Description: "Modern urban fashion and accessories"

Step 3: Nice Classes
  - Select: 25 (Clothing), 35 (Retail services)

Expected Results:
  - Text: 10-20 conflicts
  - Risk: Medium-High (common fashion terms)
  - Alternatives: "StyleUrban", "MetroStyle", etc.
```

### Scenario 3: **Unique/Safe Brand**
```yaml
Step 1: Business Info
  - Business Name: "Your Unique Name"

Step 2: Trademark Details
  - Mark Text: "ZephyrNova" (or any unique combo)
  - Logo: Upload abstract/unique logo
  
Step 3: Nice Classes
  - Select: 42 (Software development)

Expected Results:
  - Text: 0-2 conflicts (low risk)
  - Risk: Low
  - Domains: Most available
  - Message: "Good candidate for registration"
```

---

## 🎯 **Feature-Specific Tests**

### Test Phonetic Matching
Try these sound-alike pairs:
- "Kool" vs existing "Cool" marks
- "Fone" vs "Phone" marks  
- "Lite" vs "Light" marks
- "Teknology" vs "Technology" marks

### Test Visual Similarity
Try variations:
- "GOOGLE" vs "G00GLE" (zeros for O's)
- "AMAZON" vs "AMAZOM"
- "FACEBOOK" vs "FACEB00K"

### Test Class Filtering
```
Same mark, different classes:
- "DELTA" in Class 39 (Airlines) → HIGH RISK
- "DELTA" in Class 11 (Faucets) → Different conflicts
- "DELTA" in Class 42 (Software) → Different results
```

### Test Domain Availability
```
Common names:
- "TechStartup" → Likely .com taken, .io available
- "CloudApp" → Likely most domains taken
- "YourUniqueName2026" → Most available
```

---

## 🚀 **Quick Test Plan** (5 Minutes)

### Test 1: Famous Brand (1 min)
```
Mark: WALMART
Classes: 35 (Retail)
Goal: See high-risk conflicts with detailed similarity scores
```

### Test 2: Tech Startup (2 min)
```
Mark: DataSync Pro
Classes: 9, 42
Goal: See medium risk, phonetic matches, alternatives
```

### Test 3: Unique Brand (1 min)
```
Mark: [Your Made-Up Name]
Classes: 35, 42
Goal: See low risk, available domains, success case
```

### Test 4: Logo Upload (1 min)
```
Use any simple logo (letter, shape, icon)
Classes: 9, 35
Goal: See logo similarity feature in action
```

---

## 📊 **What to Look For**

✅ **Good Results**:
- Color-coded risk levels (High=Red, Medium=Yellow, Low=Green)
- Similarity scores (0-100%)
- Evidence links to USPTO
- Domain availability checks
- Social media handle links
- Alternative suggestions (for high/medium risk)
- PDF download button

✅ **Performance**:
- Search completes in <10 seconds
- Results load without errors
- Logo upload works (max 5MB)
- Pagination works (if 10+ results)
- Filters work (risk level, status)

✅ **Edge Cases**:
- Very long names (100+ characters)
- Special characters (@, #, &)
- Numbers in marks (3M, 7-Eleven)
- Single letters (A, M, X)

---

## 🎬 **Demo Script** (For Presentations)

1. **Start**: "Let me show you a trademark search for a new tech startup"
   
2. **Search**: Enter "CloudFlow" with classes 9, 42

3. **Wait**: Show the animated loading screen (2-5 seconds)

4. **Results**: 
   - "Found 12 potential conflicts"
   - "Risk level: MEDIUM"
   - "Similar marks include CloudSync, FlowCloud, etc."

5. **Deep Dive**: Click on a conflict to show:
   - Similarity breakdown (Exact: 45%, Phonetic: 78%, Visual: 60%)
   - USPTO link
   - Registration date, owner info

6. **Alternatives**: Scroll to alternatives:
   - "Based on conflicts, try: StreamCloud, FlowTech, CloudWorks"

7. **Download**: Click PDF button
   - Show professional multi-page report

8. **Conclusion**: "Total time: 8 seconds. Cost if hiring attorney: $500-1000"

---

## 💡 **Pro Tips**

### Get Interesting Results:
- ✅ Use common words = more conflicts to explore
- ✅ Mix classes to see overlap
- ✅ Try phonetic variations
- ✅ Upload logos to see visual similarity

### Avoid Boring Results:
- ❌ Random letter strings = nothing to show
- ❌ Very long or complex names = hard to remember
- ❌ Non-English words = limited dataset

### Best Demo Names:
1. "TechFlow" (tech industry)
2. "UrbanStyles" (fashion)
3. "CloudBrew" (coffee + tech mashup)
4. "NovaPulse" (modern, energetic)
5. "EcoMart" (retail, timely)

---

## 🔍 **Database Info**

Your database has:
- **1,405,000+** total trademarks
- **287,000+** with logos
- **52,436** with pre-computed logo hashes
- Nice classes 1-45 (all industries)

Popular classes to test:
- **Class 9**: Computers, software (lots of data)
- **Class 25**: Clothing (fashion brands)
- **Class 35**: Retail services, advertising
- **Class 42**: Software development, SaaS
- **Class 43**: Restaurants, food services

---

**Happy Testing!** 🎉

Try starting with "APPLE" in Class 9 to see the system at full power!
