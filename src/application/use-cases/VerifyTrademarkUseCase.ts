/**
 * Use Case: Verify Trademark
 * Verifies a specific trademark with USPTO
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/types';
import type { IUSPTOApiClient, VerificationResult } from '../../infrastructure/api/IUSPTOApiClient';
import { logger } from '../../infrastructure/monitoring/logger';

@injectable()
export class VerifyTrademarkUseCase {
  constructor(
    @inject(TYPES.USPTOApiClient) private usptoApi: IUSPTOApiClient
  ) {}

  async execute(serialNumber: string): Promise<VerificationResult> {
    logger.info({ serialNumber }, 'Executing verify trademark use case');

    try {
      const result = await this.usptoApi.verifyBySerialNumber(serialNumber);

      logger.info({
        serialNumber,
        verified: result.verified,
        status: result.status,
      }, 'Verification completed');

      return result;

    } catch (error) {
      logger.error({ err: error, serialNumber }, 'Verification failed');
      throw error;
    }
  }

  async executeBatch(serialNumbers: string[]): Promise<Map<string, VerificationResult>> {
    logger.info({ count: serialNumbers.length }, 'Executing batch verification');

    try {
      const results = await this.usptoApi.verifyBatch(serialNumbers);

      logger.info({
        total: serialNumbers.length,
        verified: Array.from(results.values()).filter(r => r.verified).length,
      }, 'Batch verification completed');

      return results;

    } catch (error) {
      logger.error({ err: error }, 'Batch verification failed');
      throw error;
    }
  }
}