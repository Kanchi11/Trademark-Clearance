/**
 * Social Media API Client
 * Checks handle availability across platforms
 */

import { injectable } from 'inversify';
import { logger } from '../monitoring/logger';

export interface SocialCheckResult {
  platform: string;
  handle: string;
  available: boolean;
  url?: string;
  checkedAt: string;
}

export interface ISocialMediaApiClient {
  checkSocial(handle: string): Promise<SocialCheckResult[]>;
  checkPlatform(platform: string, handle: string): Promise<SocialCheckResult>;
}

@injectable()
export class SocialMediaApiClient implements ISocialMediaApiClient {
  private readonly PLATFORMS = [
    { name: 'Twitter', baseUrl: 'https://twitter.com/', checkUrl: 'https://twitter.com/' },
    { name: 'Instagram', baseUrl: 'https://instagram.com/', checkUrl: 'https://www.instagram.com/' },
    { name: 'TikTok', baseUrl: 'https://tiktok.com/@', checkUrl: 'https://www.tiktok.com/@' },
    { name: 'GitHub', baseUrl: 'https://github.com/', checkUrl: 'https://api.github.com/users/' },
    { name: 'LinkedIn', baseUrl: 'https://linkedin.com/in/', checkUrl: 'https://www.linkedin.com/in/' },
  ];

  private readonly TIMEOUT = 3000;

  async checkSocial(handle: string): Promise<SocialCheckResult[]> {
    const cleanHandle = handle.toLowerCase().replace(/[^a-z0-9_]/g, '');
    
    logger.info({ handle: cleanHandle, platforms: this.PLATFORMS.length }, 'Checking social media availability');

    const checks = this.PLATFORMS.map(platform => 
      this.checkPlatform(platform.name, cleanHandle)
    );

    const results = await Promise.allSettled(checks);

    return results
      .filter((r): r is PromiseFulfilledResult<SocialCheckResult> => r.status === 'fulfilled')
      .map(r => r.value);
  }

  async checkPlatform(platformName: string, handle: string): Promise<SocialCheckResult> {
    const platform = this.PLATFORMS.find(p => p.name === platformName);
    
    if (!platform) {
      throw new Error(`Unknown platform: ${platformName}`);
    }

    try {
      const response = await fetch(platform.checkUrl + handle, {
        method: 'HEAD',
        signal: AbortSignal.timeout(this.TIMEOUT),
        redirect: 'manual',
      });

      const available = response.status === 404;

      return {
        platform: platform.name,
        handle,
        available,
        url: available ? undefined : platform.baseUrl + handle,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      // Assume available if check fails
      return {
        platform: platform.name,
        handle,
        available: true,
        checkedAt: new Date().toISOString(),
      };
    }
  }
}