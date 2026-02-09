import { injectable } from 'inversify';
import { ICacheManager } from './ICacheManager';
import { cacheHits, cacheMisses } from '../monitoring/metrics';

@injectable()
export class InMemoryCacheManager implements ICacheManager {
  private cache = new Map<string, { value: any; expiresAt: number }>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      cacheMisses.inc({ tier: 'memory' });
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      cacheMisses.inc({ tier: 'memory' });
      return null;
    }

    cacheHits.inc({ tier: 'memory' });
    return item.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}