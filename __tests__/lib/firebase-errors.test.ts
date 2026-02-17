import { FirebaseError, isFirebaseError, getFirebaseErrorMessage } from '@/lib/firebase-errors';

describe('firebase-errors', () => {
  describe('isFirebaseError', () => {
    it('should return true for valid FirebaseError objects', () => {
      const error: FirebaseError = {
        name: 'FirebaseError',
        code: 'auth/user-not-found',
        message: 'User not found',
      };
      expect(isFirebaseError(error)).toBe(true);
    });

    it('should return false for regular Error objects', () => {
      const error = new Error('Regular error');
      expect(isFirebaseError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isFirebaseError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isFirebaseError(undefined)).toBe(false);
    });

    it('should return false for objects without code property', () => {
      const error = { message: 'Error message' };
      expect(isFirebaseError(error)).toBe(false);
    });

    it('should return false for objects without message property', () => {
      const error = { code: 'some-code' };
      expect(isFirebaseError(error)).toBe(false);
    });

    it('should return false for objects with non-string code', () => {
      const error = { code: 123, message: 'Error' };
      expect(isFirebaseError(error)).toBe(false);
    });
  });

  describe('getFirebaseErrorMessage', () => {
    it('should return mapped message for known auth errors', () => {
      const error: FirebaseError = {
        name: 'FirebaseError',
        code: 'auth/popup-closed-by-user',
        message: 'Popup closed',
      };
      expect(getFirebaseErrorMessage(error)).toBe('Sign-in was cancelled. Please try again.');
    });

    it('should return mapped message for known Firestore errors', () => {
      const error: FirebaseError = {
        name: 'FirebaseError',
        code: 'permission-denied',
        message: 'Permission denied',
      };
      expect(getFirebaseErrorMessage(error)).toBe('You do not have permission to perform this action.');
    });

    it('should return original message for unknown error codes', () => {
      const error: FirebaseError = {
        name: 'FirebaseError',
        code: 'unknown-error-code',
        message: 'Original error message',
      };
      expect(getFirebaseErrorMessage(error)).toBe('Original error message');
    });

    it('should return generic message for non-FirebaseError objects', () => {
      const error = new Error('Regular error');
      expect(getFirebaseErrorMessage(error)).toBe('An unexpected error occurred');
    });

    it('should return generic message for null', () => {
      expect(getFirebaseErrorMessage(null)).toBe('An unexpected error occurred');
    });

    it('should return generic message for undefined', () => {
      expect(getFirebaseErrorMessage(undefined)).toBe('An unexpected error occurred');
    });

    it('should handle all auth error codes', () => {
      const authErrorCodes = [
        'auth/popup-blocked',
        'auth/network-request-failed',
        'auth/too-many-requests',
        'auth/user-disabled',
        'auth/wrong-password',
        'auth/invalid-email',
        'auth/email-already-in-use',
        'auth/weak-password',
      ];

      authErrorCodes.forEach(code => {
        const error: FirebaseError = {
          name: 'FirebaseError',
          code,
          message: 'Error',
        };
        const message = getFirebaseErrorMessage(error);
        expect(message).toBeTruthy();
        expect(message).not.toBe('An unexpected error occurred');
      });
    });

    it('should handle all Firestore error codes', () => {
      const firestoreErrorCodes = [
        'not-found',
        'already-exists',
        'resource-exhausted',
        'failed-precondition',
        'aborted',
        'unavailable',
        'unauthenticated',
      ];

      firestoreErrorCodes.forEach(code => {
        const error: FirebaseError = {
          name: 'FirebaseError',
          code,
          message: 'Error',
        };
        const message = getFirebaseErrorMessage(error);
        expect(message).toBeTruthy();
        expect(message).not.toBe('An unexpected error occurred');
      });
    });

    it('should fallback to error message when code is unknown', () => {
      const error: FirebaseError = {
        name: 'FirebaseError',
        code: 'unknown-code',
        message: 'Custom error message',
      };
      expect(getFirebaseErrorMessage(error)).toBe('Custom error message');
    });

    it('should fallback to generic message when code is unknown and no message', () => {
      const error: FirebaseError = {
        name: 'FirebaseError',
        code: 'unknown-code',
        message: '',
      };
      expect(getFirebaseErrorMessage(error)).toBe('An error occurred');
    });
  });
});
