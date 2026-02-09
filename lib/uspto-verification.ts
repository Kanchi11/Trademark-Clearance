// lib/uspto-verification.ts

export interface TrademarkStatus {
    serialNumber: string;
    exists: boolean;
    status?: string;
    verified: boolean;
    verifiedAt: string;
  }
  
  /**
   * Verify a trademark's current status using USPTO's TSDR API
   * 
   * TSDR = Trademark Status & Document Retrieval
   * Endpoint: https://tsdr.uspto.gov/statusxml
   * 
   * Free, no authentication required
   * Returns XML with trademark details
   */
  export async function verifyTrademarkStatus(
    serialNumber: string
  ): Promise<TrademarkStatus> {
    
    try {
      const url = `https://tsdr.uspto.gov/statusxml?sn=${serialNumber}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Trademark Search Tool)',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      
      if (!response.ok) {
        return {
          serialNumber,
          exists: false,
          verified: false,
          verifiedAt: new Date().toISOString()
        };
      }
      
      const xml = await response.text();
      
      // Parse basic status from XML
      // USPTO XML contains <status> tag with current status
      const statusMatch = xml.match(/<markCurrentStatusExternalDescriptionText>(.*?)<\/markCurrentStatusExternalDescriptionText>/);
      const status = statusMatch ? statusMatch[1] : 'Unknown';
      
      return {
        serialNumber,
        exists: true,
        status,
        verified: true,
        verifiedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`USPTO verification failed for ${serialNumber}:`, error);
      
      return {
        serialNumber,
        exists: false,
        verified: false,
        verifiedAt: new Date().toISOString()
      };
    }
  }
  
  /**
   * Verify multiple trademarks in batch
   * Rate-limited to avoid overwhelming USPTO servers
   */
  export async function verifyTrademarksBatch(
    serialNumbers: string[],
    maxConcurrent: number = 5
  ): Promise<Map<string, TrademarkStatus>> {
    
    const results = new Map<string, TrademarkStatus>();
    
    // Process in batches to respect rate limits
    for (let i = 0; i < serialNumbers.length; i += maxConcurrent) {
      const batch = serialNumbers.slice(i, i + maxConcurrent);
      
      const batchResults = await Promise.all(
        batch.map(sn => verifyTrademarkStatus(sn))
      );
      
      batchResults.forEach(result => {
        results.set(result.serialNumber, result);
      });
      
      // Small delay between batches (be nice to USPTO servers)
      if (i + maxConcurrent < serialNumbers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }