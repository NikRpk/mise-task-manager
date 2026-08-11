/**
 * Real-time Postgres Change Listeners with Smart Cache Invalidation
 * Automatically invalidates caches when Supabase Realtime detects changes
 * Pauses listeners when tab is hidden to save resources
 *
 * NOTE: Project listener disabled - projects cached for 30min (acceptable since rarely change)
 */

'use client';

import { useEffect, useRef } from 'react';
import type { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { createClient } from './supabase/client';
import { useCache } from './cache-context';
import { logger } from './logger';

interface RealtimeListenersOptions {
  userId: string | undefined;
  selectedProjectId: string | null;
  enabled?: boolean;
  onTasksChanged?: () => void;
}

/**
 * Hook to set up Supabase Realtime listeners for user data.
 * Automatically invalidates caches when data changes in Postgres.
 *
 * NOTE: Realtime must be enabled for the `notes`, `tasks`, and `people`
 * tables in Supabase (Database → Replication) for this to fire.
 */
export function useRealtimeListeners({
  userId,
  selectedProjectId,
  enabled = true,
  onTasksChanged,
}: RealtimeListenersOptions) {
  const cache = useCache();
  const supabase = createClient();

  const cacheRef = useRef(cache);
  useEffect(() => { cacheRef.current = cache; }, [cache]);

  const onTasksChangedRef = useRef(onTasksChanged);
  useEffect(() => { onTasksChangedRef.current = onTasksChanged; }, [onTasksChanged]);

  // Listen to notes changes
  useEffect(() => {
    if (!enabled || !userId) return;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupListener = () => {
      if (channel) return;

      try {
        channel = supabase
          .channel(`notes-changes-${userId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'notes', filter: `created_by=eq.${userId}` },
            () => {
              cacheRef.current.invalidate('user-notes');
            }
          )
          .subscribe((status: REALTIME_SUBSCRIBE_STATES, err?: Error) => {
            if (err) logger.error('Notes listener error', err, { userId });
          });
      } catch (error) {
        logger.error('Failed to setup notes listener', error as Error, { userId });
      }
    };

    const teardownListener = () => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        teardownListener();
      } else {
        setupListener();
      }
    };

    if (!document.hidden) {
      setupListener();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      teardownListener();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, enabled]);

  // Listen to tasks changes
  useEffect(() => {
    if (!enabled || !userId || !selectedProjectId) return;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupListener = () => {
      if (channel) return;

      try {
        channel = supabase
          .channel(`tasks-changes-${selectedProjectId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${selectedProjectId}` },
            () => {
              cacheRef.current.invalidatePattern(new RegExp(`^project-${selectedProjectId}-`));
              onTasksChangedRef.current?.();
            }
          )
          .subscribe((status: REALTIME_SUBSCRIBE_STATES, err?: Error) => {
            if (err) logger.error('Tasks listener error', err, { projectId: selectedProjectId });
          });
      } catch (error) {
        logger.error('Failed to setup tasks listener', error as Error, {
          projectId: selectedProjectId,
        });
      }
    };

    const teardownListener = () => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        teardownListener();
      } else {
        setupListener();
      }
    };

    if (!document.hidden) {
      setupListener();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      teardownListener();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedProjectId, enabled]);

  // Listen to people directory changes
  useEffect(() => {
    if (!enabled || !userId) return;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupListener = () => {
      if (channel) return;

      try {
        channel = supabase
          .channel('people-changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'people' },
            () => {
              cacheRef.current.invalidate('people-directory');
            }
          )
          .subscribe((status: REALTIME_SUBSCRIBE_STATES, err?: Error) => {
            if (err) logger.error('People listener error', err, { userId });
          });
      } catch (error) {
        logger.error('Failed to setup people listener', error as Error, { userId });
      }
    };

    const teardownListener = () => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        teardownListener();
      } else {
        setupListener();
      }
    };

    if (!document.hidden) {
      setupListener();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      teardownListener();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, enabled]);
}
