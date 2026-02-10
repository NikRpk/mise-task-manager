/**
 * People Context
 * Shared people directory across the application
 */

'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useCachedFetch, useCache } from '@/lib/cache-context';
import { authenticatedFetch } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

export interface Person {
  email: string;
  displayName: string;
  photoUrl?: string;
  source: 'calendar' | 'workspace';
}

interface PeopleContextValue {
  people: Person[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  syncFromCalendar: () => Promise<void>;
  syncFromWorkspace: () => Promise<void>;
  clearPeople: (source?: 'calendar' | 'workspace' | 'all') => Promise<void>;
}

const PeopleContext = createContext<PeopleContextValue | null>(null);

const PEOPLE_KEY = 'people-directory';
const PEOPLE_TTL = 10 * 60 * 1000; // 10 minutes (people data changes infrequently)

export function PeopleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { invalidate } = useCache();

  const { data, isLoading, error, refetch } = useCachedFetch<{ people: Person[] }>(
    PEOPLE_KEY,
    async () => {
      const res = await authenticatedFetch('/api/people');
      if (!res.ok) {
        throw new Error('Failed to fetch people');
      }
      return res.json();
    },
    {
      ttl: PEOPLE_TTL,
      enabled: !!user,
    }
  );

  const syncFromCalendar = async () => {
    const res = await authenticatedFetch('/api/people/sync?source=calendar', {
      method: 'POST',
    });

    if (!res.ok) {
      throw new Error('Failed to sync from calendar');
    }

    // Invalidate cache and refetch
    invalidate(PEOPLE_KEY);
    await refetch();
  };

  const syncFromWorkspace = async () => {
    const res = await authenticatedFetch('/api/people/sync?source=workspace', {
      method: 'POST',
    });

    if (!res.ok) {
      throw new Error('Failed to sync from workspace');
    }

    // Invalidate cache and refetch
    invalidate(PEOPLE_KEY);
    await refetch();
  };

  const clearPeople = async (source: 'calendar' | 'workspace' | 'all' = 'all') => {
    const res = await authenticatedFetch(`/api/people/clear?source=${source}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      throw new Error('Failed to clear people');
    }

    // Invalidate cache and refetch
    invalidate(PEOPLE_KEY);
    await refetch();
  };

  return (
    <PeopleContext.Provider
      value={{
        people: data?.people || [],
        isLoading,
        error,
        refetch,
        syncFromCalendar,
        syncFromWorkspace,
        clearPeople,
      }}
    >
      {children}
    </PeopleContext.Provider>
  );
}

export function usePeople() {
  const context = useContext(PeopleContext);
  if (!context) {
    throw new Error('usePeople must be used within a PeopleProvider');
  }
  return context;
}
