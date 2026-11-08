'use client';

import React, { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export interface BolmsoThemeOptions {
  app?: string;
  name?: string;
  tagline?: string;
  accent?: string;
  bg?: string;
  card?: string;
  border?: string;
  text?: string;
  muted?: string;
}

export interface BuildLoginUrlOptions extends BolmsoThemeOptions {
  mode?: 'signin' | 'signup' | 'forgot';
  nextUrl?: string;
  hubOrigin?: string;
}

const BOLMSO_ROOT = 'bolmso.app';

export function resolveHubOrigin(explicitOrigin?: string): string {
  if (explicitOrigin) return explicitOrigin.replace(/\/$/, '');
  if (
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_BOLMSO_HUB_URL
  ) {
    return process.env.NEXT_PUBLIC_BOLMSO_HUB_URL.replace(/\/$/, '');
  }
  return `https://${BOLMSO_ROOT}`;
}

let sharedClient: SupabaseClient | null = null;

export function getBolmsoSupabaseClient(): SupabaseClient | null {
  if (sharedClient) return sharedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const host =
    typeof window !== 'undefined'
      ? window.location.hostname.toLowerCase()
      : '';
  const isBolmso = host === BOLMSO_ROOT || host.endsWith(`.${BOLMSO_ROOT}`);

  sharedClient = createBrowserClient(url, anonKey, {
    cookieOptions: {
      ...(isBolmso ? { domain: `.${BOLMSO_ROOT}` } : {}),
      path: '/',
      sameSite: 'lax',
      secure: isBolmso || process.env.NODE_ENV === 'production',
    },
  });
  return sharedClient;
}

export function buildBolmsoLoginUrl(options: BuildLoginUrlOptions = {}): string {
  const base = resolveHubOrigin(options.hubOrigin);
  const url = new URL('/login', base);

  if (options.mode && options.mode !== 'signin') {
    url.searchParams.set('mode', options.mode);
  }

  const nextTarget =
    options.nextUrl ??
    (typeof window !== 'undefined' ? window.location.href : undefined);
  if (nextTarget) {
    url.searchParams.set('next', nextTarget);
  }

  const themeKeys: (keyof BolmsoThemeOptions)[] = [
    'app',
    'name',
    'tagline',
    'accent',
    'bg',
    'card',
    'border',
    'text',
    'muted',
  ];
  for (const key of themeKeys) {
    const val = options[key];
    if (val) url.searchParams.set(key, val);
  }

  return url.toString();
}

export function buildBolmsoLogoutUrl(
  nextUrl?: string,
  hubOrigin?: string,
): string {
  const base = resolveHubOrigin(hubOrigin);
  const url = new URL('/logout', base);
  const target =
    nextUrl ??
    (typeof window !== 'undefined' ? window.location.href : undefined);
  if (target) url.searchParams.set('next', target);
  return url.toString();
}

export interface BolmsoUserProfile {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
}

export function useBolmsoAuth() {
  const [user, setUser] = useState<BolmsoUserProfile | null>(null);
  const [loading, setLoading] = useState(() => Boolean(getBolmsoSupabaseClient()));

  useEffect(() => {
    const supabase = getBolmsoSupabaseClient();
    if (!supabase) return;

    let active = true;

    async function hydrateUser(rawUser: User | null) {
      if (!rawUser) {
        if (active) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      const meta = rawUser.user_metadata || {};
      const fallbackName =
        (meta.full_name as string) ||
        (meta.display_name as string) ||
        (meta.name as string) ||
        rawUser.email?.split('@')[0] ||
        'User';

      const { data: profile } = await supabase!
        .from('users')
        .select('display_name, avatar_url, email')
        .eq('id', rawUser.id)
        .maybeSingle();

      if (!active) return;

      setUser({
        id: rawUser.id,
        email: rawUser.email ?? profile?.email ?? null,
        displayName: profile?.display_name || fallbackName,
        avatarUrl: profile?.avatar_url || null,
      });
      setLoading(false);
    }

    supabase.auth.getUser().then(({ data }) => {
      hydrateUser(data.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrateUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = getBolmsoSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  return { user, loading, signOut };
}

export interface BolmsoAuthButtonProps extends BolmsoThemeOptions {
  nextUrl?: string;
  hubOrigin?: string;
  showSignUp?: boolean;
  className?: string;
}

export function BolmsoAuthButton({
  nextUrl,
  hubOrigin,
  showSignUp = true,
  className = '',
  ...themeOptions
}: BolmsoAuthButtonProps) {
  const { user, loading, signOut } = useBolmsoAuth();
  const currentUrl =
    nextUrl ??
    (typeof window !== 'undefined' ? window.location.href : undefined);

  const signInHref = buildBolmsoLoginUrl({
    ...themeOptions,
    mode: 'signin',
    nextUrl: currentUrl,
    hubOrigin,
  });

  const signUpHref = buildBolmsoLoginUrl({
    ...themeOptions,
    mode: 'signup',
    nextUrl: currentUrl,
    hubOrigin,
  });

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-2 text-xs opacity-60 ${className}`}>
        <span>&bull;&bull;&bull;</span>
      </div>
    );
  }

  if (user) {
    const initials = user.displayName
      .split(/\s+/)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return (
      <div className={`inline-flex items-center gap-2.5 text-sm ${className}`}>
        <span className="inline-flex items-center gap-2 font-medium">
          <span
            style={
              themeOptions.accent
                ? { backgroundColor: themeOptions.accent, color: '#ffffff' }
                : undefined
            }
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
          >
            {initials}
          </span>
          <span>{user.displayName}</span>
        </span>
        <button type="button" onClick={signOut} className="btn btn-outline">
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <a href={signInHref} className="btn btn-outline">
        Sign in
      </a>
      {showSignUp && (
        <a href={signUpHref} className="btn btn-primary">
          Sign up
        </a>
      )}
    </div>
  );
}
