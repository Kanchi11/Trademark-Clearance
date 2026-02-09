/**
 * Data Transfer Object for Search Responses
 * Formats domain objects for API responses
 */

import { SearchResult } from '../../core/domain/SearchResult';

export class SearchResponseDto {
  constructor(
    public readonly success: boolean,
    public readonly requestId: string,
    public readonly data?: SearchResult,
    public readonly error?: {
      message: string;
      code: string;
      details?: any;
    }
  ) {}

  static success(requestId: string, result: SearchResult): SearchResponseDto {
    return new SearchResponseDto(true, requestId, result, undefined);
  }

  static error(requestId: string, message: string, code: string, details?: any): SearchResponseDto {
    return new SearchResponseDto(false, requestId, undefined, {
      message,
      code,
      details,
    });
  }

  toJSON() {
    if (this.success && this.data) {
      const apiResponse = this.data.toAPIResponse();
      // Remove 'success' from apiResponse since we're setting it explicitly
      const { success: _, ...responseData } = apiResponse;
      
      return {
        success: true,
        requestId: this.requestId,
        ...responseData,
      };
    }
  
    return {
      success: false,
      requestId: this.requestId,
      error: this.error,
    };
  }
}