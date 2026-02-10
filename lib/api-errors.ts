/**
 * API error handling utilities
 * Provides consistent error responses across all API routes
 */

import { NextResponse } from 'next/server';
import { AppError } from './errors';
import { logger } from './logger';

interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Handle errors in API routes with consistent formatting
 * @param error The error that occurred
 * @param context Additional context for logging
 * @returns NextResponse with appropriate status code and error message
 */
export function handleApiError(error: unknown, context?: Record<string, string | number | boolean>): NextResponse {
  const timestamp = new Date().toISOString();

  // Handle known AppError instances
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      error: error.message,
      code: error.code,
      timestamp,
    };

    // Log operational errors as warnings, others as errors
    if (error.isOperational) {
      logger.warn(`API Error: ${error.code}`, {
        ...context,
        message: error.message,
        statusCode: error.statusCode,
      });
    } else {
      logger.error(`API Error: ${error.code}`, error, context);
    }

    return NextResponse.json(response, { status: error.statusCode });
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    logger.error('Unexpected API error', error, context);

    const response: ErrorResponse = {
      error: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      timestamp,
    };

    return NextResponse.json(response, { status: 500 });
  }

  // Handle unknown error types
  logger.error('Unknown error type in API', undefined, {
    ...context,
    error: String(error),
  });

  const response: ErrorResponse = {
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    timestamp,
  };

  return NextResponse.json(response, { status: 500 });
}

/**
 * Wrap API route handlers with error handling
 * @param handler The API route handler function
 * @returns Wrapped handler with automatic error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: unknown[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error, {
        handler: handler.name,
      });
    }
  }) as T;
}

/**
 * Create a success response with consistent formatting
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}
