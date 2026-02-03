/**
 * Tests for custom error classes
 * Ensures errors have correct status codes and properties
 */

import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
} from '@/lib/errors';

describe('AppError', () => {
  test('creates error with correct properties', () => {
    const error = new AppError('TEST_CODE', 'Test message', 418);

    expect(error.code).toBe('TEST_CODE');
    expect(error.message).toBe('Test message');
    expect(error.statusCode).toBe(418);
    expect(error.isOperational).toBe(true);
    expect(error.name).toBe('AppError');
  });

  test('defaults to 500 status code', () => {
    const error = new AppError('TEST', 'Message');
    expect(error.statusCode).toBe(500);
  });

  test('preserves stack trace', () => {
    const error = new AppError('TEST', 'Message');
    expect(error.stack).toBeDefined();
  });
});

describe('AuthenticationError', () => {
  test('creates 401 error', () => {
    const error = new AuthenticationError();
    
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('AUTH_REQUIRED');
    expect(error.message).toBe('Authentication required');
  });

  test('accepts custom message', () => {
    const error = new AuthenticationError('Token expired');
    expect(error.message).toBe('Token expired');
  });
});

describe('AuthorizationError', () => {
  test('creates 403 error', () => {
    const error = new AuthorizationError();
    
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
    expect(error.message).toBe('Insufficient permissions');
  });

  test('accepts custom message', () => {
    const error = new AuthorizationError('Need ADMIN role');
    expect(error.message).toBe('Need ADMIN role');
  });
});

describe('NotFoundError', () => {
  test('creates 404 error with resource name', () => {
    const error = new NotFoundError('Task');
    
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Task not found');
  });

  test('includes identifier in message', () => {
    const error = new NotFoundError('Task', 'abc123');
    
    expect(error.message).toBe("Task with id 'abc123' not found");
  });
});

describe('ValidationError', () => {
  test('creates 400 error', () => {
    const error = new ValidationError('Invalid input');
    
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Invalid input');
  });

  test('includes validation details', () => {
    const details = {
      title: ['Title is required'],
      email: ['Invalid email format'],
    };
    const error = new ValidationError('Validation failed', details);
    
    expect(error.details).toEqual(details);
  });
});

describe('ConflictError', () => {
  test('creates 409 error', () => {
    const error = new ConflictError('Resource already exists');
    
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
  });
});

describe('RateLimitError', () => {
  test('creates 429 error', () => {
    const error = new RateLimitError();
    
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe('RATE_LIMIT');
    expect(error.message).toBe('Too many requests');
  });
});

describe('ExternalServiceError', () => {
  test('creates 503 error', () => {
    const error = new ExternalServiceError('Stripe', 'Payment failed');
    
    expect(error.statusCode).toBe(503);
    expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
    expect(error.message).toContain('Stripe');
    expect(error.message).toContain('Payment failed');
  });

  test('stores original error', () => {
    const original = new Error('Original');
    const error = new ExternalServiceError('Service', 'Failed', original);
    
    expect(error.originalError).toBe(original);
  });
});

describe('DatabaseError', () => {
  test('creates 500 error', () => {
    const error = new DatabaseError('INSERT', 'Duplicate key');
    
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('DATABASE_ERROR');
    expect(error.message).toContain('INSERT');
    expect(error.message).toContain('Duplicate key');
  });

  test('marks as non-operational', () => {
    const error = new DatabaseError('SELECT');
    expect(error.isOperational).toBe(false);
  });

  test('stores original error', () => {
    const original = new Error('DB Error');
    const error = new DatabaseError('UPDATE', 'Failed', original);
    
    expect(error.originalError).toBe(original);
  });
});
