/**
 * Firebase Authentication Error Codes
 * https://firebase.google.com/docs/auth/admin/errors
 */

export interface FirebaseError extends Error {
  code: string;
  message: string;
  stack?: string;
}

export function isFirebaseError(error: unknown): error is FirebaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as FirebaseError).code === 'string'
  );
}

export function getFirebaseErrorMessage(error: unknown): string {
  if (!isFirebaseError(error)) {
    return 'An unexpected error occurred';
  }

  const errorMessages: Record<string, string> = {
    // Auth errors
    'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',
    'auth/popup-blocked': 'Pop-up was blocked by your browser. Please allow pop-ups and try again.',
    'auth/network-request-failed': 'Network error. Please check your connection and try again.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'Account not found.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/email-already-in-use': 'This email is already in use.',
    'auth/weak-password': 'Password is too weak.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled.',
    'auth/account-exists-with-different-credential': 'An account already exists with a different sign-in method.',
    
    // Firestore errors
    'permission-denied': 'You do not have permission to perform this action.',
    'not-found': 'The requested resource was not found.',
    'already-exists': 'The resource already exists.',
    'resource-exhausted': 'Rate limit exceeded. Please try again later.',
    'failed-precondition': 'Operation failed. Please check your data and try again.',
    'aborted': 'Operation was aborted. Please try again.',
    'out-of-range': 'Invalid input range.',
    'unimplemented': 'This operation is not implemented.',
    'internal': 'Internal server error. Please try again later.',
    'unavailable': 'Service is temporarily unavailable. Please try again later.',
    'data-loss': 'Data loss or corruption detected.',
    'unauthenticated': 'Authentication required. Please sign in.',
  };

  return errorMessages[error.code] || error.message || 'An error occurred';
}
