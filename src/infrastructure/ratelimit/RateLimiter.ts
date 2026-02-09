/**
 * Rate Limiter using Upstash
 * Prevents API abuse
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { logger } from '../monitoring/logger';
import { RateLimitExceededError } from '../../shared/errors';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export class RateLimiter {
  private ratelimit: Ratelimit | null = null;
  private enabled: boolean;

  constructor() {
    try {
      const redis = Redis.fromEnv();
      
      this.ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
        analytics: true,
        prefix: 'trademark-search',
      });
      
      this.enabled = true;
      logger.info('Rate limiter initialized');
    } catch (error) {
      logger.warn('Rate limiter not configured, skipping rate limiting');
      this.enabled = false;
    }
  }

  async check(identifier: string): Promise<RateLimitResult> {
    if (!this.enabled || !this.ratelimit) {
      return {
        success: true,
        limit: Infinity,
        remaining: Infinity,
        reset: Date.now(),
      };
    }
  
    try {
      const result = await this.ratelimit.limit(identifier);
      if (!result.success) {
        logger.warn({
          identifier,
          limit: result.limit,
          remaining: result.remaining,
          reset: result.reset,
        }, 'Rate limit exceeded');

        throw new RateLimitExceededError(
          `Rate limit exceeded. Try again in ${Math.ceil((result.reset - Date.now()) / 1000)} seconds.`
        );
      }

      logger.debug({
        identifier,
        remaining: result.remaining,
      }, 'Rate limit check passed');

      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        throw error;
      }
      
      logger.error({ err: error, identifier }, 'Rate limit check failed');
      
      // Fail open - allow request if rate limiter fails
      return {
        success: true,
        limit: Infinity,
        remaining: Infinity,
        reset: Date.now(),
      };
    }
  }

  /**
   * Get client identifier from request
   */
  static getIdentifier(request: Request): string {
    // Try to get IP from various headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');

    const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'anonymous';
    
    return ip.trim();
  }
}