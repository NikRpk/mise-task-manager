// Server-side Supabase client that reads/writes the auth session via cookies.
// Used only in the OAuth callback route to complete the PKCE code exchange.
import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { getBolmsoCookieOptions } from './client';

export async function createClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const host =
    headerStore.get('x-forwarded-host') ?? headerStore.get('host') ?? undefined;
  const cookieOptions = getBolmsoCookieOptions(host);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, ...cookieOptions })
            );
          } catch {
            // Called from a Server Component render — safe to ignore because
            // middleware refreshes the session on every navigation anyway.
          }
        },
      },
    }
  );
}
