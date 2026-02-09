// lib/domain-check.ts

export interface DomainCheckResult {
    domain: string;
    available: boolean | null;
    error?: string;
  }
  
  /**
   * Check if domains are available using DNS lookup
   */
  export async function checkDomains(brandName: string): Promise<DomainCheckResult[]> {
    const sanitized = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const tlds = ['.com', '.net', '.org', '.io', '.co', '.app'];
    const domains = tlds.map(tld => `${sanitized}${tld}`);
    
    const results: DomainCheckResult[] = [];
    
    for (const domain of domains) {
      try {
        // Use a free DNS API
        const response = await fetch(
          `https://dns.google/resolve?name=${domain}&type=A`,
          { cache: 'no-store' }
        );
        
        if (!response.ok) {
          results.push({
            domain,
            available: null,
            error: 'Could not check',
          });
          continue;
        }
        
        const data = await response.json();
        
        // If Answer exists, domain is taken
        // If Status is 3 (NXDOMAIN), domain is available
        const available = data.Status === 3 || !data.Answer;
        
        results.push({
          domain,
          available,
        });
      } catch (error) {
        results.push({
          domain,
          available: null,
          error: 'Check failed',
        });
      }
    }
    
    return results;
  }