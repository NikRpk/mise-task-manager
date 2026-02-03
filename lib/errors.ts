/**
 * Custom error classes for application-specific errors
 * Provides structured error handling with error codes and HTTP status codes
 */

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for authentication failures
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super('AUTH_REQUIRED', message, 401);
  }
}

/**
 * Error for authorization/permission failures
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super('FORBIDDEN', message, 403);
  }
}

/**
 * Error for resource not found
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with id '${identifier}' not found`
      : `${resource} not found`;
    super('NOT_FOUND', message, 404);
  }
}

/**
 * Error for invalid input/validation failures
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public details?: Record<string, string[]>
  ) {
    super('VALIDATION_ERROR', message, 400);
  }
}

/**
 * Error for conflicts (e.g., duplicate resources)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

/**
 * Error for rate limiting
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super('RATE_LIMIT', message, 429);
  }
}

/**
 * Error for external service failures
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string = 'External service unavailable',
    public originalError?: Error
  ) {
    super('EXTERNAL_SERVICE_ERROR', `${service}: ${message}`, 503);
  }
}

/**
 * Error for database operations
 */
export class DatabaseError extends AppError {
  constructor(
    operation: string,
    message: string = 'Database operation failed',
    public originalError?: Error
  ) {
    super('DATABASE_ERROR', `${operation}: ${message}`, 500, false);
  }
}
