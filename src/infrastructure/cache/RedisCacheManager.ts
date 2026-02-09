/**
 * Redis Cache Manager using Upstash
 * Production-grade distributed caching
 */

import { injectable } from 'inversify';
import { Redis } from '@upstash/redis';
import { ICacheManager } from './ICacheManager';
import { logger } from '../monitoring/logger';
import { cacheHits, cacheMisses } from '../monitoring/metrics';
import { CacheError } from '../../shared/errors';

export enum CacheTier {
  SEARCH_RESULTS = 'search',
  USPTO_VERIFICATION = 'uspto',
  DOMAIN_CHECK = 'domain',
  SOCIAL_CHECK = 'social',
}

export const CACHE_TTL: Record<CacheTier, number> = {
  [CacheTier.SEARCH_RESULTS]: 3600,      // 1 hour
  [CacheTier.USPTO_VERIFICATION]: 86400,  // 24 hours
  [CacheTier.DOMAIN_CHECK]: 21600,        // 6 hours
  [CacheTier.SOCIAL_CHECK]: 43200,        // 12 hours
};

@injectable()
export class RedisCacheManager implements ICacheManager {
  private redis: Redis;

  constructor() {
    // Initialize Redis from environment variables
    // UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
    try {
      this.redis = Redis.fromEnv();
      logger.info('Redis cache manager initialized');
    } catch (error) {
      logger.warn('Redis not configured, falling back to in-memory cache');
      throw new CacheError('Redis configuration missing');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get<T>(key);

      if (value !== null) {
        cacheHits.inc({ tier: this.getTier(key) });
        logger.debug({ key }, 'Cache hit');
      } else {
        cacheMisses.inc({ tier: this.getTier(key) });
        logger.debug({ key }, 'Cache miss');
      }

      return value;
    } catch (error) {
      logger.error({ err: error, key }, 'Cache get failed');
      cacheMisses.inc({ tier: this.getTier(key) });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const ttl = ttlSeconds || this.getDefaultTTL(key);
      await this.redis.setex(key, ttl, value);
      
      logger.debug({ key, ttl }, 'Cache set');
    } catch (error) {
      logger.error({ err: error, key }, 'Cache set failed');
      throw new CacheError('Failed to set cache');
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      logger.debug({ key }, 'Cache deleted');
    } catch (error) {
      logger.error({ err: error, key }, 'Cache delete failed');
    }
  }

  async clear(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      logger.info({ pattern, count: keys.length }, 'Cache cleared');
    } catch (error) {
      logger.error({ err: error, pattern }, 'Cache clear failed');
    }
  }

  /**
   * Increment a counter
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, amount);
    } catch (error) {
      logger.error({ err: error, key }, 'Cache increment failed');
      throw new CacheError('Failed to increment counter');
    }
  }

  /**
   * Set with expiration
   */
  async setWithExpiry(key: string, value: any, expiryMs: number): Promise<void> {
    try {
      await this.redis.set(key, value, { px: expiryMs });
    } catch (error) {
      logger.error({ err: error, key }, 'Cache set with expiry failed');
      throw new CacheError('Failed to set cache with expiry');
    }
  }

  private getTier(key: string): string {
    return key.split(':')[0] || 'unknown';
  }

  private getDefaultTTL(key: string): number {
    const tier = this.getTier(key);
    
    switch (tier) {
      case 'search':
        return CACHE_TTL[CacheTier.SEARCH_RESULTS];
      case 'uspto':
        return CACHE_TTL[CacheTier.USPTO_VERIFICATION];
      case 'domain':
        return CACHE_TTL[CacheTier.DOMAIN_CHECK];
      case 'social':
        return CACHE_TTL[CacheTier.SOCIAL_CHECK];
      default:
        return 3600; // 1 hour default
    }
  }
}