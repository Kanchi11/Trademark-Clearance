/**
 * Use Case: Save Search
 * Saves search history for analytics
 */

import { injectable } from 'inversify';
import { SearchResult } from '../../core/domain/SearchResult';
import { logger } from '../../infrastructure/monitoring/logger';

@injectable()
export class SaveSearchUseCase {
  async execute(searchResult: SearchResult, userId?: string): Promise<void> {
    logger.info({
      markText: searchResult.query.markText,
      userId,
    }, 'Executing save search use case');

    try {
      // TODO: Implement search history storage
      // For now, just log it
      logger.info({
        query: searchResult.query.toJSON(),
        summary: searchResult.summary,
        userId,
      }, 'Search saved to history');

    } catch (error) {
      logger.error({ err: error }, 'Failed to save search');
      // Don't throw - this is not critical
    }
  }
}