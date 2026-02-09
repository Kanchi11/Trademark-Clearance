/**
 * Domain Availability API Client
 * Checks domain availability across multiple TLDs
 */

import { injectable } from 'inversify';
import { logger } from '../monitoring/logger';

export interface DomainCheckResult {
  domain: string;
  available: boolean;
  price?: number;
  checkedAt: string;
  registrar?: string;
}

export interface IDomainApiClient {
  checkDomains(baseName: string): Promise<DomainCheckResult[]>;
  checkSingleDomain(domain: string): Promise<DomainCheckResult>;
}

@injectable()
export class DomainApiClient implements IDomainApiClient {
  private readonly EXTENSIONS = ['.com', '.io', '.app', '.co', '.net', '.org', '.ai'];
  private readonly TIMEOUT = 3000;

  async checkDomains(baseName: string): Promise<DomainCheckResult[]> {
    const cleanName = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    logger.info({ baseName: cleanName, extensions: this.EXTENSIONS }, 'Checking domain availability');

    const checks = this.EXTENSIONS.map(ext => 
      this.checkSingleDomain(cleanName + ext)
    );

    const results = await Promise.allSettled(checks);

    return results
      .filter((r): r is PromiseFulfilledResult<DomainCheckResult> => r.status === 'fulfilled')
      .map(r => r.value);
  }

  async checkSingleDomain(domain: string): Promise<DomainCheckResult> {
    try {
      // Method: Try to resolve the domain
      const response = await fetch(`https://${domain}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(this.TIMEOUT),
        redirect: 'manual',
      });

      // If domain resolves, it's taken
      return {
        domain,
        available: false,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      // If domain doesn't resolve, likely available
      return {
        domain,
        available: true,
        price: this.getEstimatedPrice(domain),
        checkedAt: new Date().toISOString(),
      };
    }
  }

  private getEstimatedPrice(domain: string): number {
    if (domain.endsWith('.com')) return 12.99;
    if (domain.endsWith('.io')) return 39.99;
    if (domain.endsWith('.app')) return 14.99;
    if (domain.endsWith('.co')) return 24.99;
    if (domain.endsWith('.ai')) return 99.99;
    return 19.99;
  }
}