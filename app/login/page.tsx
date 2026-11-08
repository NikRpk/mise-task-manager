'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { buildBolmsoLoginUrl } from '@/components/bolmso-auth';

function LoginRedirectContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.push('/');
      return;
    }

    const rawNext = searchParams.get('next') || '/';
    const rawMode = searchParams.get('mode');
    const mode =
      rawMode === 'signup' || rawMode === 'forgot' ? rawMode : 'signin';

    const targetUrl = rawNext.startsWith('http')
      ? rawNext
      : `${window.location.origin}${rawNext.startsWith('/') ? rawNext : `/${rawNext}`}`;

    window.location.replace(
      buildBolmsoLoginUrl({
        app: 'mise',
        mode,
        nextUrl: targetUrl,
      })
    );
  }, [user, loading, router, searchParams]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
          style={{ borderColor: 'var(--color-primary)' }}
        />
        <p style={{ color: 'var(--color-text)' }}>
          Redirecting to bolmso.app login…
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: 'var(--color-bg)' }}
        >
          <p style={{ color: 'var(--color-text)' }}>Loading…</p>
        </div>
      }
    >
      <LoginRedirectContent />
    </Suspense>
  );
}
