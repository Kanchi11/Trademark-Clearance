/**
 * Request Logger Middleware
 */

import { logger } from '../monitoring/logger';
import { nanoid } from 'nanoid';

export interface RequestContext {
  requestId: string;
  startTime: number;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
}

export function createRequestContext(request: Request): RequestContext {
  const requestId = nanoid();
  const startTime = Date.now();
  
  const context: RequestContext = {
    requestId,
    startTime,
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent') || undefined,
    ip: getClientIp(request),
  };

  logger.info(context, 'Request started');

  return context;
}

export function logRequestComplete(context: RequestContext, statusCode: number): void {
  const duration = Date.now() - context.startTime;

  logger.info({
    ...context,
    statusCode,
    duration,
  }, 'Request completed');
}

function getClientIp(request: Request): string | undefined {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  return cfConnectingIp || realIp || forwardedFor?.split(',')[0]?.trim();
}