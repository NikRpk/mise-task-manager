// Browser-side Supabase client (uses the public anon key; respects RLS)
import { createBrowserClient } from '@supabase/ssr';

const BOLMSO_ROOT = 'bolmso.app';

export function getBolmsoCookieOptions(hostname?: string | null) {
  const effectiveHost =
    hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  const clean = effectiveHost.split(':')[0].toLowerCase();
  const isBolmso = clean === BOLMSO_ROOT || clean.endsWith(`.${BOLMSO_ROOT}`);

  return {
    ...(isBolmso ? { domain: `.${BOLMSO_ROOT}` } : {}),
    path: '/',
    sameSite: 'lax' as const,
    secure: isBolmso || process.env.NODE_ENV === 'production',
  };
}

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (browserClient) return browserClient;

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getBolmsoCookieOptions(),
    }
  );

  return browserClient;
}
