// Dependency Injection Type Identifiers

export const TYPES = {
  // Repositories
  TrademarkRepository: Symbol.for('TrademarkRepository'),
  
  // Services
  TrademarkSearchService: Symbol.for('TrademarkSearchService'),
  
  // External APIs
  USPTOApiClient: Symbol.for('USPTOApiClient'),
  
  // Engines
  SimilarityEngine: Symbol.for('SimilarityEngine'),
  RiskAssessmentEngine: Symbol.for('RiskAssessmentEngine'),
  
  // Infrastructure
  CacheManager: Symbol.for('CacheManager'),
  
  // Use Cases (NEW)
  SearchTrademarkUseCase: Symbol.for('SearchTrademarkUseCase'),
  VerifyTrademarkUseCase: Symbol.for('VerifyTrademarkUseCase'),
  GenerateReportUseCase: Symbol.for('GenerateReportUseCase'),
  SaveSearchUseCase: Symbol.for('SaveSearchUseCase'),

  // Additional API clients
  DomainApiClient: Symbol.for('DomainApiClient'),
  SocialMediaApiClient: Symbol.for('SocialMediaApiClient'),
  
  // Infrastructure
  RateLimiter: Symbol.for('RateLimiter'),
};