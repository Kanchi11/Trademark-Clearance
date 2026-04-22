// lib/social-check.ts

/**
 * Social handle result - we don't claim to know availability
 * Users must click to check manually
 */
export interface SocialHandleResult {
  platform: string;
  handle: string;
  url: string;
}

/**
 * Generate social handle URLs for manual checking
 * NOTE: We cannot reliably check social media availability without APIs
 * Don't claim availability - just provide links to check
 */
export async function checkSocialHandles(brandName: string): Promise<SocialHandleResult[]> {
  const handle = brandName.toLowerCase().replace(/[^a-z0-9_]/g, '');

  const platforms = [
    { name: 'Twitter/X', url: `https://twitter.com/${handle}` },
    { name: 'Instagram', url: `https://instagram.com/${handle}` },
    { name: 'Facebook', url: `https://facebook.com/${handle}` },
    { name: 'LinkedIn', url: `https://linkedin.com/company/${handle}` },
    { name: 'TikTok', url: `https://tiktok.com/@${handle}` },
    { name: 'YouTube', url: `https://youtube.com/@${handle}` },
  ];

  return platforms.map(platform => ({
    platform: platform.name,
    handle: `@${handle}`,
    url: platform.url,
  }));
}