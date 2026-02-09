// lib/google-search.ts

export interface WebSearchResult {
    title: string;
    link: string;
    snippet: string;
    displayLink?: string;
  }
  
  export interface ManualSearchLink {
    platform: string;
    query: string;
    url: string;
  }
  
  // Track API usage
  let searchCount = 0;
  const DAILY_LIMIT = 100;
  
  /**
   * Generate manual search links for user to check
   */
  export function generateManualSearchLinks(markText: string): ManualSearchLink[] {
    const encodedMark = encodeURIComponent(markText);
    
    return [
      {
        platform: 'Google',
        query: `"${markText}" trademark`,
        url: `https://www.google.com/search?q=${encodeURIComponent('"' + markText + '" trademark')}`,
      },
      {
        platform: 'Google',
        query: `"${markText}" brand`,
        url: `https://www.google.com/search?q=${encodeURIComponent('"' + markText + '" brand')}`,
      },
      {
        platform: 'Google',
        query: `"${markText}" company`,
        url: `https://www.google.com/search?q=${encodeURIComponent('"' + markText + '" company')}`,
      },
      {
        platform: 'LinkedIn',
        query: `${markText} company`,
        url: `https://www.linkedin.com/search/results/companies/?keywords=${encodedMark}`,
      },
      {
        platform: 'Crunchbase',
        query: markText,
        url: `https://www.crunchbase.com/textsearch?q=${encodedMark}`,
      },
    ];
  }
  
  /**
   * Search the web using Google Custom Search API
   */
  export async function searchWeb(query: string): Promise<WebSearchResult[]> {
    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    
    if (!apiKey || !searchEngineId) {
      console.log('Google API not configured - skipping web search');
      return [];
    }
    
    // Safety: Check if we've hit our limit
    if (searchCount >= DAILY_LIMIT) {
      console.warn('⚠️ Daily Google search limit reached (100). Skipping web search.');
      return [];
    }
    
    try {
      const searchQuery = encodeURIComponent(`"${query}" trademark OR brand OR company`);
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${searchQuery}&num=10`;
      
      const response = await fetch(url, { cache: 'no-store' });
      
      if (!response.ok) {
        console.error('Google Search API error:', response.status);
        
        if (response.status === 429) {
          console.error('❌ Google API quota exceeded!');
        }
        
        return [];
      }
      
      const data = await response.json();
      
      // Increment counter on successful query
      searchCount++;
      console.log(`✅ Google search ${searchCount}/${DAILY_LIMIT} used today`);
      
      if (!data.items || data.items.length === 0) {
        return [];
      }
      
      return data.items.map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        displayLink: item.displayLink,
      }));
    } catch (error) {
      console.error('Web search error:', error);
      return [];
    }
  }
  
  /**
   * Check if there's common law usage of a trademark
   */
  export async function checkCommonLawUsage(markText: string): Promise<{
    found: boolean;
    results: WebSearchResult[];
    summary: string;
    manualLinks: ManualSearchLink[];
  }> {
    const results = await searchWeb(markText);
    const manualLinks = generateManualSearchLinks(markText);
    
    if (results.length === 0) {
      return {
        found: false,
        results: [],
        summary: 'Web search completed. Check manual links below for additional verification.',
        manualLinks,
      };
    }
    
    // Analyze results for trademark usage
    const trademarkKeywords = ['trademark', 'brand', 'company', 'inc', 'llc', 'corp'];
    const relevantResults = results.filter(result => {
      const text = (result.title + ' ' + result.snippet).toLowerCase();
      return trademarkKeywords.some(keyword => text.includes(keyword));
    });
    
    const found = relevantResults.length > 0;
    
    return {
      found,
      results: relevantResults.slice(0, 5),
      summary: found
        ? `Found ${relevantResults.length} potential common law uses of this trademark.`
        : 'Limited web presence detected. Low common law risk.',
      manualLinks,
    };
  }