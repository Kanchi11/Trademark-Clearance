import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './types';

// Repositories
import { TrademarkRepository } from './repositories/TrademarkRepository';
import type { ITrademarkRepository } from './repositories/ITrademarkRepository';

// Services
import { TrademarkSearchService } from './services/TrademarkSearchService';

// External APIs
import { USPTOApiClient } from '../infrastructure/api/USPTOApiClient';
import type { IUSPTOApiClient } from '../infrastructure/api/IUSPTOApiClient';

// Engines
import { SimilarityEngine } from './engines/SimilarityEngine';
import type { ISimilarityEngine } from './engines/ISimilarityEngine';
import { RiskAssessmentEngine } from './engines/RiskAssessmentEngine';
import type { IRiskAssessmentEngine } from './engines/IRiskAssessmentEngine';

// Infrastructure - Cache
import { InMemoryCacheManager } from '../infrastructure/cache/InMemoryCacheManager';
import type { ICacheManager } from '../infrastructure/cache/ICacheManager';

// Use Cases
import { SearchTrademarkUseCase } from '../application/use-cases/SearchTrademarkUseCase';
import { VerifyTrademarkUseCase } from '../application/use-cases/VerifyTrademarkUseCase';
import { GenerateReportUseCase } from '../application/use-cases/GenerateReportUseCase';
import { SaveSearchUseCase } from '../application/use-cases/SaveSearchUseCase';

// Logging
import { logger } from '../infrastructure/monitoring/logger';

const container = new Container();

// Bind repositories
container.bind<ITrademarkRepository>(TYPES.TrademarkRepository).to(TrademarkRepository);

// Bind services
container.bind<TrademarkSearchService>(TYPES.TrademarkSearchService).to(TrademarkSearchService);

// Bind external APIs
container.bind<IUSPTOApiClient>(TYPES.USPTOApiClient).to(USPTOApiClient);

// Bind engines
container.bind<ISimilarityEngine>(TYPES.SimilarityEngine).to(SimilarityEngine);
container.bind<IRiskAssessmentEngine>(TYPES.RiskAssessmentEngine).to(RiskAssessmentEngine);

// Bind cache manager - Try Redis, fallback to InMemory
function setupCacheManager() {
  const hasRedis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (hasRedis) {
    try {
      // Try to load Redis
      const { RedisCacheManager } = require('../infrastructure/cache/RedisCacheManager');
      container.bind<ICacheManager>(TYPES.CacheManager).to(RedisCacheManager);
      logger.info('✅ Using Redis cache (production mode)');
      return;
    } catch (error) {
      logger.warn('⚠️  Redis failed to load, falling back to in-memory cache');
    }
  }
  
  // Fallback to in-memory
  container.bind<ICacheManager>(TYPES.CacheManager).to(InMemoryCacheManager);
  logger.info(hasRedis ? '⚠️  Using in-memory cache (Redis error)' : 'ℹ️  Using in-memory cache (development mode)');
}

setupCacheManager();

// Bind use cases
container.bind(TYPES.SearchTrademarkUseCase).to(SearchTrademarkUseCase);
container.bind(TYPES.VerifyTrademarkUseCase).to(VerifyTrademarkUseCase);
container.bind(TYPES.GenerateReportUseCase).to(GenerateReportUseCase);
container.bind(TYPES.SaveSearchUseCase).to(SaveSearchUseCase);

logger.info('🚀 Dependency injection container initialized');

export { container };