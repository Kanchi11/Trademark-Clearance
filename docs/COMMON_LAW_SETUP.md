# Common Law Search Setup Guide

The common law search feature helps you find existing unregistered businesses using the same trademark. Common law trademark rights are established through actual use in commerce, even without federal registration. These "first-to-use" rights can be powerful, especially in specific geographic areas or industries.

## Professional Common Law Search Standards

A comprehensive common law search should cover **5 key areas**:

### 1. **Internet & Social Media** ✅ Fully Covered
- Search engines (Google, Bing) with trademark-specific queries
- Social platforms (LinkedIn, Facebook, Instagram, Twitter/X)
- **What to look for:** Active business presence, brand usage, customer engagement

### 2. **State & Local Business Registries** ✅ Fully Covered
- Secretary of State business entity filings (all 50 states + DC)
- SEC EDGAR database for corporations
- OpenCorporates global business registry
- **What to look for:** Registered business entities with similar names

### 3. **Business Directories** ✅ Fully Covered
- Dun & Bradstreet commercial database
- Better Business Bureau listings
- Crunchbase startup/company database
- Yellow Pages, Yelp, industry directories
- **What to look for:** Operating businesses in your industry/geography

### 4. **Domain Names & Web Presence** ✅ Fully Covered
- WHOIS domain registration lookups
- Domain availability searches (GoDaddy, etc.)
- Website content analysis
- **What to look for:** Active websites using similar branding

### 5. **Trade Publications & Industry Resources** ✅ Partially Covered
- Industry-specific publications
- Trade journals and magazines
- Conference proceedings, press releases
- **What to look for:** Mentions in industry news, advertising, partnerships

Our implementation provides **automated searches** (via Bing/Google APIs) plus **18+ manual verification links** covering all 5 areas.

## Geographic & Industry Analysis

Common law rights are typically:
- **Geographically limited** to areas of actual use
- **Industry-specific** to similar goods/services
- **Prior-use based** - first user wins in their territory

When reviewing results, prioritize:
- ✅ Businesses in the same industry/Nice classes
- ✅ Companies operating in your target markets
- ✅ Evidence of continuous use (older = stronger rights)
- ❌ Different industries (usually not a conflict)
- ❌ Different geographic areas (may coexist)

## How It Works

The system tries multiple providers in order:
1. **Bing Web Search API** (if configured)
2. **Google Custom Search API** (if configured)
3. **Manual search links** (always provided as fallback)

## Provider Comparison

| Provider | Free Tier | Ease of Setup | Recommended |
|----------|-----------|--------------|-------------|
| **Bing Web Search** | 1,000 searches/month | Easy | ✅ **Yes** (Best value) |
| Google Custom Search | 100 searches/day | Medium | Only if you already have it |
| Manual Links | Unlimited | No setup | Always works |

## Option 1: Bing Web Search API (Recommended)

**Free Tier:** 1,000 searches per month

### Setup Steps:

1. **Create Free Azure Account**
   - Go to: https://portal.azure.com
   - Click "Start free" or sign in with existing Microsoft account
   - Note: Requires credit card for verification, but won't be charged on free tier

2. **Create Bing Search Resource**
   - In Azure Portal, click "+ Create a resource"
   - Search for "Bing Search v7"
   - Click "Create"

3. **Configure the Resource**
   - **Subscription:** Select your subscription
   - **Resource Group:** Create new or use existing (e.g., "trademark-search")
   - **Name:** Give it a name (e.g., "trademark-common-law-search")
   - **Pricing Tier:** Select **F1 (Free)** - 1,000 transactions per month
   - **Region:** Choose one close to you
   - Click "Review + Create" then "Create"

4. **Get Your API Key**
   - Wait for deployment to complete (~1 minute)
   - Click "Go to resource"
   - In the left menu, click "Keys and Endpoint"
   - Copy **KEY 1** or **KEY 2**

5. **Add to .env.local**
   ```bash
   BING_SEARCH_API_KEY=your_key_here
   ```

6. **Test It**
   - Run a trademark search with your app
   - Check the terminal logs for: `✅ [Bing API] Found X results`

### Monitoring Usage

- Go to Azure Portal > your Bing Search resource
- Click "Metrics" to see API call count
- Free tier limit: 1,000 calls/month
- Resets monthly

## Option 2: Google Custom Search API

**Free Tier:** 100 searches per day (3,000/month max)

### Setup Steps:

1. **Create Google Cloud Project**
   - Go to: https://console.cloud.google.com
   - Click "Select a project" → "New Project"
   - Name it (e.g., "Trademark Search") → Create

2. **Enable Custom Search API**
   - Go to: https://console.cloud.google.com/apis/library/customsearch.googleapis.com
   - Make sure your project is selected
   - Click "Enable"

3. **Create API Key**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Click "+ CREATE CREDENTIALS" → "API key"
   - Copy the API key
   - (Optional) Click "Edit API key" to restrict it to Custom Search API only

4. **Create Custom Search Engine**
   - Go to: https://programmablesearchengine.google.com/controlpanel/create
   - **Name:** "Trademark Common Law Search"
   - **Search the entire web:** Enable this
   - Click "Create"
   - On the next page, click "Customize" then "Setup"
   - Copy the **Search engine ID** (looks like: `0123456789abcdef0:abcdefg`)

5. **Add to .env.local**
   ```bash
   GOOGLE_API_KEY=your_api_key_here
   GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
   ```

6. **Test It**
   - Run a trademark search
   - Check logs for: `✅ [Google API] Found X results`

### Monitoring Usage

- Go to: https://console.cloud.google.com/apis/api/customsearch.googleapis.com/quotas
- Free tier: 100 queries/day
- No monthly max, but daily limit resets at midnight Pacific Time

## Option 3: No API Setup (Manual Links Only)

**Cost:** Free
**Setup:** None

If you don't configure any API, the system will:
- Still provide manual search links (Google, DuckDuckGo, LinkedIn, Crunchbase, BBB)
- Users can click these links to manually verify common law usage
- No automated risk assessment, but manual verification is often more thorough anyway

## Troubleshooting

### Bing API Returns 401/403
- Check that your API key is correct
- Verify the resource is in F1 (Free) tier
- Check you haven't exceeded 1,000 calls/month

### Google API Returns 403
- Make sure Custom Search API is enabled in your project
- Check API key restrictions (should allow Custom Search API)
- Verify Search Engine ID is correct
- Check you haven't exceeded 100 calls/day

### Both APIs Fail
- App will automatically fall back to manual search links
- Check terminal logs for specific error messages
- Verify environment variables are loaded: `echo $BING_SEARCH_API_KEY`

### No Results Found
- This is normal - it means no strong web presence for that trademark
- Users should still verify manually using the provided links

## Cost Comparison

| Provider | Free Tier | Cost After Free Tier |
|----------|-----------|---------------------|
| Bing | 1,000/month | $3 per 1,000 additional |
| Google | 100/day (3,000/month) | $5 per 1,000 additional |
| Manual | Unlimited | Free |

## Which Should I Use?

### Use Bing if:
- You want automated common law search
- You need more than 100 searches/day
- You want the best free tier

### Use Google if:
- You already have Google Cloud set up
- 100 searches/day is enough for you
- You prefer Google search results

### Use Manual Links if:
- You don't want to set up APIs
- You prefer manual verification
- You want zero cost and zero API dependency

## Implementation Details

The common law search logic:
1. Tries Bing API first (if configured)
2. Falls back to Google API (if configured and Bing failed)
3. Always provides manual search links as final fallback
4. Analyzes results for trademark-relevant keywords
5. Assigns risk level based on result relevance

Search queries automatically include:
- Exact phrase matching ("your trademark")
- Trademark-specific keywords (brand, company, business, trademark, TM, ®)
- Authority domains (LinkedIn, Crunchbase, BBB, Forbes, Bloomberg)

## Questions?

- Bing API Docs: https://learn.microsoft.com/en-us/bing/search-apis/
- Google Custom Search Docs: https://developers.google.com/custom-search
- For issues, check the terminal logs when running a search
