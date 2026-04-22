// lib/cache.ts
import { Redis as UpstashRedis } from '@upstash/redis';
import Redis from 'ioredis';

// Singleton Redis clients
let upstashClient: UpstashRedis | null = null;
let ioredisClient: Redis | null = null;
let inMemoryCache: Map<string, { value: any; expires: number }> | null = null;

type RedisClient = 'upstash' | 'ioredis' | null;
let clientType: RedisClient = null;

/**
 * Get Redis client instance (singleton)
 * Returns the client type for proper method calls
 */
function getRedisClient(): RedisClient {
  if (clientType !== null) {
    return clientType;
  }

  // Try Upstash Redis REST API first (for https:// URLs)
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      upstashClient = new UpstashRedis({
        url: upstashUrl,
        token: upstashToken,
      });
      clientType = 'upstash';
      console.log('✅ Upstash Redis initialized');
      return clientType;
    } catch (error) {
      console.error('❌ Upstash Redis initialization failed:', error);
    }
  }

  // Try standard Redis URL (redis:// or rediss://)
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl && (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://'))) {
    try {
      ioredisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            console.error('❌ Redis connection failed after 3 retries');
            return null;
          }
          return Math.min(times * 50, 2000);
        },
      });

      ioredisClient.on('connect', () => {
        console.log('✅ Redis connected');
      });

      ioredisClient.on('error', (err) => {
        console.error('❌ Redis error:', err.message);
      });

      clientType = 'ioredis';
      return clientType;
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
    }
  }

  console.log('ℹ️  Redis not configured - using in-memory cache');
  return null;
}

/**
 * Get in-memory cache instance (fallback when Redis unavailable)
 */
function getInMemoryCache(): Map<string, { value: any; expires: number }> {
  if (!inMemoryCache) {
    inMemoryCache = new Map();

    // Clean up expired entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of inMemoryCache!.entries()) {
        if (entry.expires < now) {
          inMemoryCache!.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }
  return inMemoryCache;
}

/**
 * Cache interface for trademark search results
 */
export interface CacheOptions {
  /** Time-to-live in seconds (default: 1 hour) */
  ttl?: number;
  /** Cache namespace/prefix */
  namespace?: string;
}

/**
 * Get cached value
 */
export async function getCached<T>(
  key: string,
  options: CacheOptions = {}
): Promise<T | null> {
  const { namespace = 'trademark' } = options;
  const fullKey = `${namespace}:${key}`;

  const client = getRedisClient();

  if (client === 'upstash' && upstashClient) {
    try {
      const cached = await upstashClient.get(fullKey);
      if (cached) {
        console.log(`✅ Cache HIT (Upstash): ${fullKey}`);
        return (typeof cached === 'string' ? JSON.parse(cached) : cached) as T;
      }
    } catch (error) {
      console.error('❌ Upstash get error:', error);
    }
  } else if (client === 'ioredis' && ioredisClient) {
    try {
      const cached = await ioredisClient.get(fullKey);
      if (cached) {
        console.log(`✅ Cache HIT (Redis): ${fullKey}`);
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      console.error('❌ Redis get error:', error);
    }
  }

  // Fallback to in-memory cache
  const memCache = getInMemoryCache();
  const entry = memCache.get(fullKey);

  if (entry && entry.expires > Date.now()) {
    console.log(`✅ Cache HIT (Memory): ${fullKey}`);
    return entry.value;
  }

  console.log(`❌ Cache MISS: ${fullKey}`);
  return null;
}

/**
 * Set cached value
 */
export async function setCached<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<void> {
  const { ttl = 3600, namespace = 'trademark' } = options; // Default 1 hour
  const fullKey = `${namespace}:${key}`;

  const client = getRedisClient();

  if (client === 'upstash' && upstashClient) {
    try {
      await upstashClient.setex(fullKey, ttl, JSON.stringify(value));
      console.log(`✅ Cache SET (Upstash): ${fullKey} (TTL: ${ttl}s)`);
      return;
    } catch (error) {
      console.error('❌ Upstash set error:', error);
    }
  } else if (client === 'ioredis' && ioredisClient) {
    try {
      await ioredisClient.setex(fullKey, ttl, JSON.stringify(value));
      console.log(`✅ Cache SET (Redis): ${fullKey} (TTL: ${ttl}s)`);
      return;
    } catch (error) {
      console.error('❌ Redis set error:', error);
    }
  }

  // Fallback to in-memory cache
  const memCache = getInMemoryCache();
  memCache.set(fullKey, {
    value,
    expires: Date.now() + ttl * 1000,
  });
  console.log(`✅ Cache SET (Memory): ${fullKey} (TTL: ${ttl}s)`);
}

/**
 * Delete cached value
 */
export async function deleteCached(
  key: string,
  options: CacheOptions = {}
): Promise<void> {
  const { namespace = 'trademark' } = options;
  const fullKey = `${namespace}:${key}`;

  const client = getRedisClient();

  if (client === 'upstash' && upstashClient) {
    try {
      await upstashClient.del(fullKey);
      console.log(`✅ Cache DELETE (Upstash): ${fullKey}`);
    } catch (error) {
      console.error('❌ Upstash delete error:', error);
    }
  } else if (client === 'ioredis' && ioredisClient) {
    try {
      await ioredisClient.del(fullKey);
      console.log(`✅ Cache DELETE (Redis): ${fullKey}`);
    } catch (error) {
      console.error('❌ Redis delete error:', error);
    }
  }

  const memCache = getInMemoryCache();
  memCache.delete(fullKey);
  console.log(`✅ Cache DELETE (Memory): ${fullKey}`);
}

/**
 * Clear all cached values in a namespace
 */
export async function clearCacheNamespace(namespace: string = 'trademark'): Promise<void> {
  const client = getRedisClient();

  if (client === 'upstash' && upstashClient) {
    try {
      const keys = await upstashClient.keys(`${namespace}:*`);
      if (keys && keys.length > 0) {
        await upstashClient.del(...keys);
        console.log(`✅ Cleared ${keys.length} keys from Upstash (namespace: ${namespace})`);
      }
    } catch (error) {
      console.error('❌ Upstash clear error:', error);
    }
  } else if (client === 'ioredis' && ioredisClient) {
    try {
      const keys = await ioredisClient.keys(`${namespace}:*`);
      if (keys.length > 0) {
        await ioredisClient.del(...keys);
        console.log(`✅ Cleared ${keys.length} keys from Redis (namespace: ${namespace})`);
      }
    } catch (error) {
      console.error('❌ Redis clear error:', error);
    }
  }

  const memCache = getInMemoryCache();
  for (const key of memCache.keys()) {
    if (key.startsWith(`${namespace}:`)) {
      memCache.delete(key);
    }
  }
  console.log(`✅ Cleared in-memory cache (namespace: ${namespace})`);
}

/**
 * Generate cache key for trademark search
 * Includes logoUrl to ensure searches with different logos are cached separately
 */
export function generateSearchCacheKey(markText: string, niceClasses: number[], logoUrl?: string | null): string {
  const normalizedMark = markText.toLowerCase().trim();
  const sortedClasses = [...niceClasses].sort((a, b) => a - b).join(',');

  // Include logo indicator in cache key to differentiate searches with/without logos
  // Use a simple hash of the logoUrl to keep cache key length reasonable
  const logoIndicator = logoUrl ? `:logo-${simpleHash(logoUrl)}` : '';

  return `search:${normalizedMark}:${sortedClasses}${logoIndicator}`;
}

/**
 * Simple hash function for cache key generation
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedis(): Promise<void> {
  if (ioredisClient) {
    await ioredisClient.quit();
    console.log('✅ Redis connection closed');
  }
  // Note: Upstash REST API doesn't need explicit connection closing
}
