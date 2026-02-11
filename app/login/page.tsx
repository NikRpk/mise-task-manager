'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSignIn = async () => {
    try {
      console.log('[DEBUG LOGIN] handleSignIn clicked');
      setSigningIn(true);
      setError(null);
      
      console.log('[DEBUG LOGIN] Calling signInWithGoogle...');
      await signInWithGoogle();
      console.log('[DEBUG LOGIN] signInWithGoogle completed successfully');
      
    } catch (err) {
      console.error('[DEBUG LOGIN] Sign in failed:', err);
      console.error('[DEBUG LOGIN] Error details:', {
        message: (err as Error).message,
        code: (err as any).code,
        stack: (err as Error).stack
      });
      
      logger.error('Sign in error', err as Error);
      setError('Failed to sign in. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-primary)' }}></div>
          <p style={{ color: 'var(--color-text)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8 border" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
              HelloFresh Task Manager
            </h1>
            <p className="text-gray-600">Sign in to manage your tasks and projects</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 rounded-lg font-medium transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            {signingIn ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Sign in with Google
              </>
            )}
          </button>

          <p className="mt-6 text-center text-sm text-gray-500">
            Sign in with your HelloFresh Google account
          </p>
        </div>
      </div>
    </div>
  );
}
