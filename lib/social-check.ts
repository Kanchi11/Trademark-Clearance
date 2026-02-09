// lib/social-check.ts

export interface SocialHandleResult {
    platform: string;
    handle: string;
    url: string;
    available: boolean | null;
    error?: string;
  }
  
  /**
   * Check if social media handles are available
   */
  export async function checkSocialHandles(brandName: string): Promise<SocialHandleResult[]> {
    const handle = brandName.toLowerCase().replace(/[^a-z0-9_]/g, '');
    
    const platforms = [
      { name: 'Twitter/X', url: `https://twitter.com/${handle}`, checkUrl: `https://twitter.com/${handle}` },
      { name: 'Instagram', url: `https://instagram.com/${handle}`, checkUrl: `https://www.instagram.com/${handle}/` },
      { name: 'Facebook', url: `https://facebook.com/${handle}`, checkUrl: `https://www.facebook.com/${handle}` },
      { name: 'LinkedIn', url: `https://linkedin.com/company/${handle}`, checkUrl: `https://www.linkedin.com/company/${handle}` },
      { name: 'TikTok', url: `https://tiktok.com/@${handle}`, checkUrl: `https://www.tiktok.com/@${handle}` },
      { name: 'YouTube', url: `https://youtube.com/@${handle}`, checkUrl: `https://www.youtube.com/@${handle}` },
    ];
    
    const results: SocialHandleResult[] = [];
    
    for (const platform of platforms) {
      try {
        // Note: Direct checking is limited by CORS
        // We'll provide the URL for users to check manually
        // In production, you'd use a proxy or API service
        
        results.push({
          platform: platform.name,
          handle: `@${handle}`,
          url: platform.url,
          available: null, // null means "click to check"
        });
      } catch (error) {
        results.push({
          platform: platform.name,
          handle: `@${handle}`,
          url: platform.url,
          available: null,
          error: 'Manual check required',
        });
      }
    }
    
    return results;
  }