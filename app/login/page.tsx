'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogIn, Mail } from 'lucide-react';
import { logger } from '@/lib/logger';
import { getAuthErrorMessage, isAuthError } from '@/lib/supabase-errors';

export default function LoginPage() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    try {
      setSigningIn(true);
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      logger.error('Google sign in error', err as Error);
      setError(isAuthError(err) ? getAuthErrorMessage(err) : 'Failed to sign in. Please try again.');
      setSigningIn(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSigningIn(true);

    try {
      if (mode === 'sign-up') {
        await signUpWithEmail(email, password, displayName);
        setInfo('Account created! Check your email to confirm your address, then sign in.');
        setMode('sign-in');
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      logger.error('Email auth error', err as Error);
      setError(isAuthError(err) ? getAuthErrorMessage(err) : 'Failed to sign in. Please try again.');
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
              Mise - Task and Notes
            </h1>
            <p className="text-gray-600">
              {mode === 'sign-up' ? 'Create an account to get started' : 'Sign in to manage your tasks and projects'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {info && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">{info}</p>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 rounded-lg font-medium transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <LogIn size={20} />
            Sign in with Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
            <span className="text-xs uppercase text-gray-400">or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {mode === 'sign-up' && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  style={{ borderColor: 'var(--color-border)' }}
                  placeholder="Jane Doe"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                style={{ borderColor: 'var(--color-border)' }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                style={{ borderColor: 'var(--color-border)' }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {signingIn ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <Mail size={18} />
              )}
              {mode === 'sign-up' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {mode === 'sign-up' ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('sign-in'); setError(null); setInfo(null); }}
                  className="font-medium underline"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                No account yet?{' '}
                <button
                  onClick={() => { setMode('sign-up'); setError(null); setInfo(null); }}
                  className="font-medium underline"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Create one
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
