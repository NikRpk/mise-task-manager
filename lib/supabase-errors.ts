/**
 * Supabase Auth error handling
 * Supabase auth errors are plain Error objects with a `.status` code and a
 * message we can pattern-match on (there's no fixed error-code enum like
 * Firebase Auth has).
 */

export interface AuthError extends Error {
  status?: number;
  code?: string;
}

export function isAuthError(error: unknown): error is AuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as AuthError).message === 'string'
  );
}

const MESSAGE_PATTERNS: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'Incorrect email or password.'],
  [/email not confirmed/i, 'Please confirm your email address before signing in.'],
  [/user already registered/i, 'An account with this email already exists.'],
  [/password should be at least/i, 'Password is too short (minimum 6 characters).'],
  [/unable to validate email address/i, 'Invalid email address.'],
  [/network/i, 'Network error. Please check your connection and try again.'],
  [/rate limit/i, 'Too many attempts. Please try again later.'],
  [/popup/i, 'Sign-in was cancelled. Please try again.'],
];

export function getAuthErrorMessage(error: unknown): string {
  if (!isAuthError(error)) {
    return 'An unexpected error occurred';
  }

  for (const [pattern, friendlyMessage] of MESSAGE_PATTERNS) {
    if (pattern.test(error.message)) {
      return friendlyMessage;
    }
  }

  return error.message || 'An unexpected error occurred';
}
