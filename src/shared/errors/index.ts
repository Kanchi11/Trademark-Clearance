export abstract class BaseError extends Error {
    abstract statusCode: number;
    abstract isOperational: boolean;
  
    constructor(message: string, public context?: Record<string, any>) {
      super(message);
      Object.setPrototypeOf(this, new.target.prototype);
      Error.captureStackTrace(this);
    }
  }
  
  export class InvalidSearchQueryError extends BaseError {
    statusCode = 400;
    isOperational = true;
  }
  
  export class SearchFailedError extends BaseError {
    statusCode = 500;
    isOperational = true;
  }
  
  export class ExternalApiError extends BaseError {
    statusCode = 502;
    isOperational = true;
  }
  
  export class RateLimitExceededError extends BaseError {
    statusCode = 429;
    isOperational = true;
  }
  
  export class CacheError extends BaseError {
    statusCode = 500;
    isOperational = true;
  }