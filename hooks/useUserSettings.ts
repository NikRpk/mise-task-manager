/**
 * Shared User Settings Hook
 * Eliminates redundant fetches across the application
 */

'use client';

import { useCachedFetch, useCache } from '@/lib/cache-context';
import { authenticatedFetch } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { useCallback } from 'react';
import { UserSettings } from '@/types';

const USER_SETTINGS_KEY = 'user-settings';
const SETTINGS_TTL = 5 * 60 * 1000; // 5 minutes

export function useUserSettings() {
  const { user } = useAuth();
  const { invalidate } = useCache();

  const { data: settings, isLoading, error, refetch } = useCachedFetch<UserSettings>(
    USER_SETTINGS_KEY,
    async () => {
      const res = await authenticatedFetch('/api/settings');
      if (!res.ok) {
        throw new Error('Failed to fetch settings');
      }
      return res.json();
    },
    {
      ttl: SETTINGS_TTL,
      enabled: !!user,
    }
  );

  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    const res = await authenticatedFetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });

    if (!res.ok) {
      throw new Error('Failed to update settings');
    }

    // Invalidate cache and refetch
    invalidate(USER_SETTINGS_KEY);
    await refetch();

    return res.json();
  }, [invalidate, refetch]);

  return {
    settings: (settings || {}) as UserSettings,
    isLoading,
    error,
    updateSettings,
    refetch,
  };
}
