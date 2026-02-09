import { injectable } from 'inversify';
import { IUSPTOApiClient, VerificationResult } from './IUSPTOApiClient';
import { logger } from '../monitoring/logger';
import { usptoApiCalls } from '../monitoring/metrics';
import { ExternalApiError } from '../../shared/errors';

@injectable()
export class USPTOApiClient implements IUSPTOApiClient {
  private readonly BASE_URL = 'https://tsdr.uspto.gov';
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT = 10000; // 10 seconds

  /**
   * Verify a single trademark by serial number
   * Uses official USPTO TSDR XML API (FREE, NO AUTH)
   */
  async verifyBySerialNumber(serialNumber: string): Promise<VerificationResult> {
    const endpoint = `/statusxml?sn=${serialNumber}`;
    
    logger.debug({ serialNumber }, 'Verifying trademark with USPTO');

    try {
      const xml = await this.fetchWithRetry(endpoint);
      const status = this.extractStatus(xml);

      usptoApiCalls.inc({ endpoint: 'status', status: 'success' });

      return {
        serialNumber,
        verified: true,
        status,
        verifiedAt: new Date().toISOString(),
      };

    } catch (error) {
      usptoApiCalls.inc({ endpoint: 'status', status: 'error' });

      logger.warn({
        err: error,
        serialNumber,
      }, 'USPTO verification failed');

      return {
        serialNumber,
        verified: false,
        verifiedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify multiple trademarks in batch
   * Rate-limited to be respectful to USPTO servers
   */
  async verifyBatch(serialNumbers: string[]): Promise<Map<string, VerificationResult>> {
    const results = new Map<string, VerificationResult>();

    logger.info({
      count: serialNumbers.length,
      serialNumbers,
    }, 'Starting batch USPTO verification');

    for (let i = 0; i < serialNumbers.length; i++) {
      const serialNumber = serialNumbers[i];
      
      try {
        const result = await this.verifyBySerialNumber(serialNumber);
        results.set(serialNumber, result);

        // Rate limiting - be nice to USPTO servers
        if (i < serialNumbers.length - 1) {
          await this.sleep(this.RATE_LIMIT_DELAY);
        }

      } catch (error) {
        logger.error({
          err: error,
          serialNumber,
        }, 'Batch verification error');

        results.set(serialNumber, {
          serialNumber,
          verified: false,
          verifiedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info({
      total: serialNumbers.length,
      verified: Array.from(results.values()).filter(r => r.verified).length,
    }, 'Batch verification completed');

    return results;
  }

  /**
   * Fetch with retry logic and exponential backoff
   */
  private async fetchWithRetry(endpoint: string): Promise<string> {
    const url = `${this.BASE_URL}${endpoint}`;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/xml',
            'User-Agent': 'Mozilla/5.0 (compatible; TrademarkSearch/1.0)',
          },
          signal: AbortSignal.timeout(this.TIMEOUT),
        });

        if (!response.ok) {
          throw new ExternalApiError(`USPTO API error: ${response.status}`);
        }

        return await response.text();

      } catch (error) {
        const isLastAttempt = attempt === this.MAX_RETRIES;

        if (isLastAttempt) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        
        logger.warn({
          err: error,
          url,
          attempt,
          nextRetryIn: delay,
        }, 'USPTO API request failed, retrying...');

        await this.sleep(delay);
      }
    }

    throw new ExternalApiError('USPTO API request failed after retries');
  }

  /**
   * Extract status from USPTO XML response
   */
  private extractStatus(xml: string): string {
    const statusMatch = xml.match(/<markCurrentStatusExternalDescriptionText>(.*?)<\/markCurrentStatusExternalDescriptionText>/i);
    
    if (statusMatch) {
      return statusMatch[1].trim();
    }

    // Fallback to status code
    const codeMatch = xml.match(/<statusCode>(.*?)<\/statusCode>/i);
    return codeMatch ? codeMatch[1].trim() : 'Unknown';
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}