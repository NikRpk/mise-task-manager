/**
 * Real-time Firestore Listeners with Smart Cache Invalidation
 * Automatically invalidates caches when Firestore detects changes
 * Pauses listeners when tab is hidden to save resources
 * 
 * NOTE: Project listener disabled - projects cached for 30min (acceptable since rarely change)
 */

'use client';

import { useEffect, useRef } from 'react';
import { db } from './firebase';
import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { useCache } from './cache-context';
import { logger } from './logger';

interface RealtimeListenersOptions {
  userId: string | undefined;
  selectedProjectId: string | null;
  enabled?: boolean;
  onTasksChanged?: () => void;
}

/**
 * Hook to set up real-time listeners for user data
 * Automatically invalidates caches when data changes in Firestore
 */
export function useRealtimeListeners({
  userId,
  selectedProjectId,
  enabled = true,
  onTasksChanged,
}: RealtimeListenersOptions) {
  const cache = useCache();

  // Stable ref for cache so snapshot closures always use the latest version
  // without needing cache in useEffect dependency arrays (which would cause
  // re-subscription loops since CacheProvider creates a new context value object on every render)
  const cacheRef = useRef(cache);
  useEffect(() => { cacheRef.current = cache; }, [cache]);

  // Stable ref so the snapshot closure always calls the latest callback
  const onTasksChangedRef = useRef(onTasksChanged);
  useEffect(() => { onTasksChangedRef.current = onTasksChanged; }, [onTasksChanged]);

  // Listen to notes changes
  useEffect(() => {
    if (!enabled || !userId) return;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    let unsubscribe: Unsubscribe | null = null;

    const setupListener = () => {
      if (unsubscribe) return;

      try {
        const notesRef = collection(db, 'notes');
        const q = query(notesRef, where('createdBy', '==', userId));

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            if (!snapshot.metadata.hasPendingWrites) {
              cacheRef.current.invalidate('user-notes');
            }
          },
          (error) => {
            logger.error('Notes listener error', error, { userId });
          }
        );
      } catch (error) {
        logger.error('Failed to setup notes listener', error as Error, { userId });
      }
    };

    const teardownListener = () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
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
  }, [userId, enabled]);

  // Listen to tasks changes
  useEffect(() => {
    if (!enabled || !userId || !selectedProjectId) return;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    let unsubscribe: Unsubscribe | null = null;

    const setupListener = () => {
      if (unsubscribe) return;

      try {
        const tasksRef = collection(db, 'tasks');
        const q = query(tasksRef, where('projectId', '==', selectedProjectId));

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            if (!snapshot.metadata.hasPendingWrites) {
              cacheRef.current.invalidatePattern(new RegExp(`^project-${selectedProjectId}-`));
              onTasksChangedRef.current?.();
            }
          },
          (error) => {
            logger.error('Tasks listener error', error, { projectId: selectedProjectId });
          }
        );
      } catch (error) {
        logger.error('Failed to setup tasks listener', error as Error, {
          projectId: selectedProjectId,
        });
      }
    };

    const teardownListener = () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
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
  }, [userId, selectedProjectId, enabled]);

  // Listen to people directory changes
  useEffect(() => {
    if (!enabled || !userId) return;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    let unsubscribe: Unsubscribe | null = null;

    const setupListener = () => {
      if (unsubscribe) return;

      try {
        const peopleRef = collection(db, 'people');

        unsubscribe = onSnapshot(
          peopleRef,
          (snapshot) => {
            if (!snapshot.metadata.hasPendingWrites) {
              cacheRef.current.invalidate('people-directory');
            }
          },
          (error) => {
            logger.error('People listener error', error, { userId });
          }
        );
      } catch (error) {
        logger.error('Failed to setup people listener', error as Error, { userId });
      }
    };

    const teardownListener = () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
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
  }, [userId, enabled]);
}
