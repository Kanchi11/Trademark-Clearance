// lib/google-search.ts

export interface WebSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink?: string;
  relevanceScore?: number;
}

export interface ManualSearchLink {
  platform: string;
  query: string;
  url: string;
}

/**
 * Generate comprehensive manual search links following professional common law search standards
 * Covers: Web/Social, State Registries, Business Directories, Domain Names, Trade Publications
 */
export function generateManualSearchLinks(markText: string): ManualSearchLink[] {
  const encodedMark = encodeURIComponent(markText);
  const encodedQuoted = encodeURIComponent('"' + markText + '"');

  return [
    // === 1. INTERNET & SOCIAL MEDIA SEARCH ===
    {
      platform: 'Google',
      query: `"${markText}" trademark`,
      url: `https://www.google.com/search?q=${encodeURIComponent('"' + markText + '" trademark')}`,
    },
    {
      platform: 'Google',
      query: `"${markText}" company OR business`,
      url: `https://www.google.com/search?q=${encodeURIComponent('"' + markText + '" (company OR business)')}`,
    },
    {
      platform: 'Bing',
      query: `"${markText}" brand`,
      url: `https://www.bing.com/search?q=${encodeURIComponent('"' + markText + '" brand')}`,
    },
    {
      platform: 'LinkedIn (Companies)',
      query: `${markText}`,
      url: `https://www.linkedin.com/search/results/companies/?keywords=${encodedMark}`,
    },
    {
      platform: 'Facebook Business Search',
      query: `${markText}`,
      url: `https://www.facebook.com/search/pages/?q=${encodedMark}`,
    },
    {
      platform: 'Instagram',
      query: `${markText}`,
      url: `https://www.instagram.com/explore/tags/${encodedMark.toLowerCase().replace(/[^a-z0-9]/g, '')}/`,
    },
    {
      platform: 'Twitter/X',
      query: `${markText}`,
      url: `https://twitter.com/search?q=${encodedMark}&f=user`,
    },

    // === 2. STATE & LOCAL BUSINESS REGISTRIES ===
    {
      platform: 'Secretary of State Search',
      query: `${markText}`,
      url: `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodedMark}&action=getcompany`,
    },
    {
      platform: 'OpenCorporates (Global)',
      query: `${markText}`,
      url: `https://opencorporates.com/companies?q=${encodedMark}&jurisdiction_code=us`,
    },

    // === 3. BUSINESS DIRECTORIES ===
    {
      platform: 'Better Business Bureau',
      query: markText,
      url: `https://www.bbb.org/search?find_text=${encodedMark}`,
    },
    {
      platform: 'Crunchbase',
      query: markText,
      url: `https://www.crunchbase.com/textsearch?q=${encodedMark}`,
    },
    {
      platform: 'Dun & Bradstreet',
      query: markText,
      url: `https://www.dnb.com/business-directory/company-information.html?term=${encodedMark}`,
    },
    {
      platform: 'Yellow Pages',
      query: markText,
      url: `https://www.yellowpages.com/search?search_terms=${encodedMark}`,
    },
    {
      platform: 'Yelp',
      query: markText,
      url: `https://www.yelp.com/search?find_desc=${encodedMark}`,
    },

    // === 4. DOMAIN NAMES ===
    {
      platform: 'WHOIS Domain Lookup',
      query: `${markText.toLowerCase().replace(/\s+/g, '')}.com`,
      url: `https://www.whois.com/whois/${encodedMark.toLowerCase().replace(/\s+/g, '')}`,
    },
    {
      platform: 'Domain Name Search',
      query: markText,
      url: `https://www.godaddy.com/domainsearch/find?checkAvail=1&domainToCheck=${encodedMark.toLowerCase().replace(/\s+/g, '')}`,
    },

    // === 5. TRADEMARK-SPECIFIC RESOURCES ===
    {
      platform: 'TrademarkNow Search',
      query: markText,
      url: `https://www.trademarknow.com/search?q=${encodedMark}`,
    },
  ];
}

/**
 * Calculate relevance score for search results
 */
function calculateRelevance(result: any, markText: string): number {
  const text = (result.title + ' ' + result.snippet).toLowerCase();
  const mark = markText.toLowerCase();
  let score = 0;

  // High relevance indicators
  const highRelevance = ['trademark', 'brand', 'tm', '®', '™'];
  const mediumRelevance = ['company', 'inc', 'llc', 'corp', 'corporation', 'ltd'];
  const lowRelevance = ['product', 'service', 'business'];

  // Exact brand name match (case insensitive)
  if (text.includes(`"${mark}"`)) score += 50;
  else if (text.includes(mark)) score += 30;

  // Trademark-related keywords
  highRelevance.forEach(keyword => {
    if (text.includes(keyword)) score += 15;
  });

  mediumRelevance.forEach(keyword => {
    if (text.includes(keyword)) score += 8;
  });

  lowRelevance.forEach(keyword => {
    if (text.includes(keyword)) score += 3;
  });

  // Domain authority (known business sites get higher scores)
  const authorityDomains = [
    'linkedin.com', 'crunchbase.com', 'bloomberg.com',
    'forbes.com', 'reuters.com', 'bbb.org', 'yelp.com'
  ];

  if (result.displayLink && authorityDomains.some(d => result.displayLink.includes(d))) {
    score += 20;
  }

  return Math.min(score, 100); // Cap at 100
}

/**
 * Search the web using Bing Web Search API (free tier: 1000 searches/month)
 * More reliable and generous than Google Custom Search
 */
export async function searchWebBing(query: string): Promise<WebSearchResult[]> {
  const apiKey = process.env.BING_SEARCH_API_KEY;

  console.log('🔍 [Bing API] Starting web search for:', query);
  console.log('🔍 [Bing API] API Key configured:', apiKey ? 'Yes' : 'No');

  if (!apiKey) {
    console.log('⚠️  [Bing API] Not configured - skipping automated search');
    return [];
  }

  try {
    // Enhanced search query for better trademark detection
    const searchQuery = `"${query}" (trademark OR brand OR company OR business)`;
    const url = 'https://api.bing.microsoft.com/v7.0/search';

    console.log('🔍 [Bing API] Making request...');

    const response = await fetch(`${url}?q=${encodeURIComponent(searchQuery)}&count=10`, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    console.log('🔍 [Bing API] Response status:', response.status);

    if (!response.ok) {
      if (response.status === 429) {
        console.error('❌ [Bing API] Quota exceeded - using manual search links');
      } else if (response.status === 401 || response.status === 403) {
        console.error('❌ [Bing API] Authentication failed - check API key');
      } else {
        console.error(`❌ [Bing API] Error: ${response.status}`);
      }
      return [];
    }

    const data = await response.json();

    if (!data.webPages || !data.webPages.value || data.webPages.value.length === 0) {
      console.log('✓ [Bing API] No results found');
      return [];
    }

    console.log(`✅ [Bing API] Found ${data.webPages.value.length} results for "${query}"`);

    // Map Bing results to our format
    return data.webPages.value.map((item: any) => ({
      title: item.name,
      link: item.url,
      snippet: item.snippet,
      displayLink: new URL(item.url).hostname,
      relevanceScore: calculateRelevance({
        title: item.name,
        snippet: item.snippet,
        displayLink: new URL(item.url).hostname,
      }, query),
    }));
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('⏱️  [Bing API] Timeout - using manual links');
    } else {
      console.error('❌ [Bing API] Error:', error);
    }
    return [];
  }
}

/**
 * Search the web using Google Custom Search API
 */
export async function searchWeb(query: string): Promise<WebSearchResult[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  console.log('🔍 [Google API] Starting web search for:', query);
  console.log('🔍 [Google API] API Key configured:', apiKey ? 'Yes' : 'No');
  console.log('🔍 [Google API] Search Engine ID configured:', searchEngineId ? 'Yes' : 'No');

  if (!apiKey || !searchEngineId) {
    console.log('⚠️  [Google API] Not configured - common law search will use manual links only');
    return [];
  }

  try {
    // Enhanced search query for better trademark detection
    const searchQuery = encodeURIComponent(
      `"${query}" (trademark OR brand OR company OR business OR inc OR llc OR corp)`
    );
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${searchQuery}&num=10`;

    console.log('🔍 [Google API] Making request to:', url.replace(apiKey, 'API_KEY_HIDDEN'));

    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    console.log('🔍 [Google API] Response status:', response.status);

    if (!response.ok) {
      if (response.status === 429) {
        console.error('❌ [Google API] Quota exceeded - using manual search links');
      } else if (response.status === 403) {
        console.error('❌ [Google API] Authentication failed - check API key');
      } else {
        console.error(`❌ [Google API] Error: ${response.status}`);
      }
      return [];
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.log('✓ [Google API] No results found');
      return [];
    }

    console.log(`✅ [Google API] Found ${data.items.length} results for "${query}"`);

    // Map results with relevance scores
    return data.items.map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink,
      relevanceScore: calculateRelevance(item, query),
    }));
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('⏱️  [Google API] Timeout - using manual links');
    } else {
      console.error('❌ [Google API] Error:', error);
    }
    return [];
  }
}

/**
 * Check for common law trademark usage
 * Tries Bing API first (better free tier), then Google API, then provides manual links
 */
export async function checkCommonLawUsage(markText: string): Promise<{
  found: boolean;
  results: WebSearchResult[];
  summary: string;
  manualLinks: ManualSearchLink[];
  riskLevel: 'low' | 'medium' | 'high';
}> {
  const manualLinks = generateManualSearchLinks(markText);

  // Try Bing first (1000 free searches/month - better than Google's 100/day)
  let results = await searchWebBing(markText);

  // Fall back to Google if Bing didn't work
  if (results.length === 0) {
    results = await searchWeb(markText);
  }

  if (results.length === 0) {
    // No automated results from either provider - provide comprehensive manual links
    return {
      found: false,
      results: [],
      summary: `Professional common law search requires manual verification across 5 key areas: (1) Internet & Social Media, (2) State/Local Registries, (3) Business Directories, (4) Domain Names, (5) Trade Publications. Use the ${manualLinks.length} links below to conduct a thorough search. Focus on similar industries and geographic areas where "first-to-use" rights may exist.`,
      manualLinks,
      riskLevel: 'low',
    };
  }

  // We got automated results - analyze them
  const highRelevance = results.filter(r => (r.relevanceScore || 0) >= 70);
  const mediumRelevance = results.filter(r => (r.relevanceScore || 0) >= 40 && (r.relevanceScore || 0) < 70);

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  let summary = '';

  if (highRelevance.length >= 3) {
    riskLevel = 'high';
    summary = `⚠️ Found ${highRelevance.length} highly relevant web results suggesting active common law usage. RECOMMENDED: Conduct professional common law search covering state registries, business directories, domain registrations, and trade publications using the ${manualLinks.length} manual verification links below. Focus on geographic areas and similar industries.`;
  } else if (highRelevance.length >= 1 || mediumRelevance.length >= 3) {
    riskLevel = 'medium';
    summary = `⚠️ Found ${results.length} web results with possible common law usage. RECOMMENDED: Verify across all 5 professional search areas using the ${manualLinks.length} links below. Consider hiring a professional trademark search firm for comprehensive clearance.`;
  } else {
    riskLevel = 'low';
    summary = `✓ Found ${results.length} web results with low trademark relevance. However, a complete common law search should still verify: (1) State/Local Registries, (2) Business Directories, (3) Domain Names, (4) Social Media, (5) Trade Publications. Use the ${manualLinks.length} verification links below.`;
  }

  return {
    found: results.length > 0,
    results: results.slice(0, 10), // Top 10 results
    summary,
    manualLinks,
    riskLevel,
  };
}
