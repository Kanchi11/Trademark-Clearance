export interface VerificationResult {
    serialNumber: string;
    verified: boolean;
    status?: string;
    verifiedAt: string;
    error?: string;
  }
  
  export interface IUSPTOApiClient {
    verifyBySerialNumber(serialNumber: string): Promise<VerificationResult>;
    verifyBatch(serialNumbers: string[]): Promise<Map<string, VerificationResult>>;
  }