// lib/domain-check.ts

export interface DomainCheckResult {
  domain: string;
  status: 'likely_available' | 'likely_taken';
  hasActiveDNS: boolean;
  registrarCheckUrl: string;
}

/**
 * Check domain DNS status
 * IMPORTANT: This is a preliminary check only. Users MUST verify with registrar.
 * - No DNS records = likely available (but could be parked/registered)
 * - Active DNS = likely taken (domain is in use)
 */
export async function checkDomains(brandName: string): Promise<DomainCheckResult[]> {
  const sanitized = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const tlds = ['.com', '.net', '.org', '.io', '.co', '.app', '.ai', '.dev', '.tech', '.online'];
  const domains = tlds.map(tld => `${sanitized}${tld}`);

  // Check all domains in parallel for speed (10 concurrent DNS lookups)
  const results = await Promise.all(
    domains.map(async (domain): Promise<DomainCheckResult> => {
      try {
        const response = await fetch(
          `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
          { cache: 'no-store', signal: AbortSignal.timeout(3000) }
        );

        const data = await response.json();

        // Status 3 = NXDOMAIN (no DNS records)
        // Status 0 with Answer = Active DNS records
        const hasActiveDNS = data.Status === 0 && data.Answer && data.Answer.length > 0;
        const status = hasActiveDNS ? 'likely_taken' : 'likely_available';

        return {
          domain,
          status,
          hasActiveDNS,
          registrarCheckUrl: `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`,
        };
      } catch {
        // On error/timeout, default to manual check needed
        return {
          domain,
          status: 'likely_available',
          hasActiveDNS: false,
          registrarCheckUrl: `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`,
        };
      }
    })
  );

  return results;
}
