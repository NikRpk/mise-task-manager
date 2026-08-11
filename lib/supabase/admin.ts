// Server-side Supabase client using the service_role key.
// This bypasses Row Level Security entirely — it must never be imported
// from a 'use client' file, and the key must never be prefixed NEXT_PUBLIC_.
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/**
 * Lazily creates (once) and returns the service-role Supabase client.
 * Lazy so `next build` doesn't need real secrets to bundle the app —
 * the client is only actually constructed the first time an API route
 * handles a request, at which point Vercel has injected the real env vars.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase server credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  adminClient = createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return adminClient;
}
