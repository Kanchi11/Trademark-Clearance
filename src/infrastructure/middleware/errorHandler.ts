/**
 * Global Error Handler Middleware
 */

import { NextResponse } from 'next/server';
import { logger } from '../monitoring/logger';
import { 
  BaseError, 
  InvalidSearchQueryError, 
  RateLimitExceededError,
  ExternalApiError 
} from '../../shared/errors';
import { ZodError } from 'zod';

export function handleError(error: unknown, requestId: string): NextResponse {
  // Zod validation errors
  if (error instanceof ZodError) {
    logger.warn({ err: error, requestId }, 'Validation error');
    
    return NextResponse.json(
      {
        success: false,
        requestId,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.issues,
        },
      },
      { status: 400 }
    );
  }

  // Known application errors
  if (error instanceof BaseError) {
    const statusCode = error.statusCode;
    
    if (error.isOperational) {
      logger.warn({ err: error, requestId }, 'Operational error');
    } else {
      logger.error({ err: error, requestId }, 'Non-operational error');
    }

    return NextResponse.json(
      {
        success: false,
        requestId,
        error: {
          message: error.message,
          code: error.constructor.name,
        },
      },
      { status: statusCode }
    );
  }

  // Unknown errors
  logger.error({ err: error, requestId }, 'Unexpected error');

  return NextResponse.json(
    {
      success: false,
      requestId,
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_SERVER_ERROR',
      },
    },
    { status: 500 }
  );
}