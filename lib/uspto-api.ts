// lib/uspto-api.ts

export interface USPTOSearchParams {
  markText: string;
  niceClasses: number[];
  limit?: number;
}

export async function searchUSPTOAPI(
  params: USPTOSearchParams
): Promise<any[]> {
  
  try {
    console.log('🌐 Calling USPTO API...');
    
    // NOTE: USPTO's actual API endpoint - may need authentication
    // For now, we'll return empty array (graceful fallback to database)
    // In production, you'd implement the actual API call
    
    console.log('⚠️ USPTO API not yet implemented - using database only');
    return [];
    
  } catch (error) {
    console.error('USPTO API error:', error);
    return [];
  }
}