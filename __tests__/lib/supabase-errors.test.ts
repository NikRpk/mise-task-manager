import { AuthError, isAuthError, getAuthErrorMessage } from '@/lib/supabase-errors';

describe('supabase-errors', () => {
  describe('isAuthError', () => {
    it('should return true for valid AuthError-shaped objects', () => {
      const error: AuthError = new Error('User not found');
      expect(isAuthError(error)).toBe(true);
    });

    it('should return true for plain objects with a string message', () => {
      const error = { message: 'Invalid login credentials' };
      expect(isAuthError(error)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isAuthError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isAuthError(undefined)).toBe(false);
    });

    it('should return false for objects without a message property', () => {
      const error = { status: 400 };
      expect(isAuthError(error)).toBe(false);
    });

    it('should return false for objects with a non-string message', () => {
      const error = { message: 123 };
      expect(isAuthError(error)).toBe(false);
    });
  });

  describe('getAuthErrorMessage', () => {
    it('maps "Invalid login credentials" to a friendly message', () => {
      const error = new Error('Invalid login credentials');
      expect(getAuthErrorMessage(error)).toBe('Incorrect email or password.');
    });

    it('maps "Email not confirmed" to a friendly message', () => {
      const error = new Error('Email not confirmed');
      expect(getAuthErrorMessage(error)).toBe(
        'Please confirm your email address before signing in.'
      );
    });

    it('maps "User already registered" to a friendly message', () => {
      const error = new Error('User already registered');
      expect(getAuthErrorMessage(error)).toBe('An account with this email already exists.');
    });

    it('maps short-password errors to a friendly message', () => {
      const error = new Error('Password should be at least 6 characters');
      expect(getAuthErrorMessage(error)).toBe('Password is too short (minimum 6 characters).');
    });

    it('maps network errors to a friendly message', () => {
      const error = new Error('A network error occurred');
      expect(getAuthErrorMessage(error)).toBe(
        'Network error. Please check your connection and try again.'
      );
    });

    it('maps rate-limit errors to a friendly message', () => {
      const error = new Error('Rate limit exceeded');
      expect(getAuthErrorMessage(error)).toBe('Too many attempts. Please try again later.');
    });

    it('falls back to the original message for unrecognized errors', () => {
      const error = new Error('Some unmapped error message');
      expect(getAuthErrorMessage(error)).toBe('Some unmapped error message');
    });

    it('returns a generic message for non-error objects', () => {
      expect(getAuthErrorMessage(null)).toBe('An unexpected error occurred');
      expect(getAuthErrorMessage(undefined)).toBe('An unexpected error occurred');
      expect(getAuthErrorMessage('a string')).toBe('An unexpected error occurred');
    });

    it('returns a generic message when the error has no message', () => {
      const error = { message: '' };
      expect(getAuthErrorMessage(error)).toBe('An unexpected error occurred');
    });
  });
});
