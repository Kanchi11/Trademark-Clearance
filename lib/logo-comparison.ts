/**
 * On-Demand Logo Similarity Checking
 * Fetches USPTO logos only when needed (for top conflicts)
 */

import { calculateImageHash, compareImageHashes } from './image-similarity';

export interface LogoConflict {
  serialNumber: string;
  markText: string;
  logoUrl: string;
  visualSimilarity: number; // 0-100
  riskLevel: 'high' | 'medium' | 'low';
}

/**
 * Compare user's uploaded logo against top USPTO conflicts
 * Only fetches and compares logos for top N results (performance optimization)
 */
export async function checkLogoSimilarity(
  userLogoDataUrl: string,
  topConflicts: Array<{ serialNumber: string; markText: string; logoUrl: string | null }>
): Promise<LogoConflict[]> {
  console.log('🎨 [Logo Similarity] Checking user logo against top conflicts...');

  // Calculate hash for user's logo once
  const userHash = await calculateImageHash(userLogoDataUrl);
  console.log(`🎨 [Logo Similarity] User logo hash: ${userHash}`);

  const logoConflicts: LogoConflict[] = [];

  // Check only top 10 conflicts (performance)
  const conflictsToCheck = topConflicts
    .filter(c => c.logoUrl) // Only check if USPTO mark has a logo
    .slice(0, 10);

  for (const conflict of conflictsToCheck) {
    try {
      // Fetch USPTO logo image
      const response = await fetch(conflict.logoUrl!);

      if (!response.ok) {
        console.log(`⚠️  [Logo] Could not fetch ${conflict.serialNumber}`);
        continue;
      }

      const blob = await response.blob();
      const usptoLogoDataUrl = await blobToDataURL(blob);

      // Calculate USPTO logo hash
      const usptoHash = await calculateImageHash(usptoLogoDataUrl);

      // Compare hashes
      const similarity = compareImageHashes(userHash, usptoHash);

      // Determine risk level
      let riskLevel: 'high' | 'medium' | 'low';
      if (similarity >= 85) {
        riskLevel = 'high';
      } else if (similarity >= 70) {
        riskLevel = 'medium';
      } else {
        riskLevel = 'low';
      }

      // Only flag if similarity is significant
      if (similarity >= 70) {
        logoConflicts.push({
          serialNumber: conflict.serialNumber,
          markText: conflict.markText,
          logoUrl: conflict.logoUrl!,
          visualSimilarity: similarity,
          riskLevel,
        });

        console.log(`⚠️  [Logo] Visual match: ${conflict.markText} (${similarity}% similar)`);
      }
    } catch (error) {
      console.error(`❌ [Logo] Error checking ${conflict.serialNumber}:`, error);
    }
  }

  console.log(`🎨 [Logo Similarity] Found ${logoConflicts.length} visual conflicts`);
  return logoConflicts.sort((a, b) => b.visualSimilarity - a.visualSimilarity);
}

/**
 * Helper: Convert Blob to Data URL
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Browser-compatible version (for client-side use)
 */
export async function checkLogoSimilarityBrowser(
  userLogoDataUrl: string,
  topConflicts: Array<{ serialNumber: string; markText: string; logoUrl: string | null }>
): Promise<LogoConflict[]> {
  const userHash = await calculateImageHash(userLogoDataUrl);
  const logoConflicts: LogoConflict[] = [];

  for (const conflict of topConflicts.filter(c => c.logoUrl).slice(0, 10)) {
    try {
      // Create image element to load USPTO logo
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = conflict.logoUrl!;
      });

      // Draw to canvas to get data URL
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      const usptoLogoDataUrl = canvas.toDataURL();

      // Calculate similarity
      const usptoHash = await calculateImageHash(usptoLogoDataUrl);
      const similarity = compareImageHashes(userHash, usptoHash);

      if (similarity >= 70) {
        logoConflicts.push({
          serialNumber: conflict.serialNumber,
          markText: conflict.markText,
          logoUrl: conflict.logoUrl!,
          visualSimilarity: similarity,
          riskLevel: similarity >= 85 ? 'high' : 'medium',
        });
      }
    } catch (error) {
      console.error(`Error checking logo ${conflict.serialNumber}:`, error);
    }
  }

  return logoConflicts.sort((a, b) => b.visualSimilarity - a.visualSimilarity);
}
