/**
 * Custom hook for Google Calendar events with enhanced error handling
 * Now with caching and preloading for better performance
 */

import { useState, useCallback, useEffect } from 'react';
import { CalendarEvent } from '@/types';
import { authenticatedFetch, extractErrorMessage, isCalendarAuthError } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { useCachedFetch, useCache } from '@/lib/cache-context';

interface UseCalendarEventsResult {
  events: CalendarEvent[];
  loading: boolean;
  connected: boolean;
  checkedConnection: boolean;
  error: string | null;
  isAuthError: boolean;
  fetchEvents: () => Promise<void>;
  connectCalendar: () => void;
  disconnectCalendar: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook to manage calendar events
 * @param userId - Current user ID
 * @returns Calendar events and operations
 */
export function useCalendarEvents(userId: string | undefined): UseCalendarEventsResult {
  const [connected, setConnected] = useState(false);
  const [checkedConnection, setCheckedConnection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);
  const cache = useCache();

  // Use cached fetch with 15-minute TTL
  const { data: cachedEvents, isLoading, refetch } = useCachedFetch<CalendarEvent[]>(
    'calendar-events',
    async () => {
      const res = await authenticatedFetch('/api/calendar/events');
      const data = await res.json();
      
      if (!res.ok) {
        const errorMessage = await extractErrorMessage(res);
        const isAuth = isCalendarAuthError(res, errorMessage);
        
        setError(errorMessage);
        setIsAuthError(isAuth);
        setConnected(false);
        
        if (isAuth) {
          console.warn('⚠️ Calendar Authentication Required');
          console.warn('💡 Go to Settings → Profile → Connect Google Calendar');
        }
        
        logger.error('Failed to fetch calendar events', new Error(errorMessage), { 
          userId,
          status: res.status,
          isAuthError: isAuth
        });
        
        return [];
      }
      
      setConnected(true);
      setIsAuthError(false);
      return data.events || [];
    },
    {
      ttl: 15 * 60 * 1000, // 15 minutes
      enabled: connected && !!userId,
      onError: (err) => {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        setConnected(false);
        setIsAuthError(false);
        logger.error('Failed to fetch calendar events', err, { userId });
      },
    }
  );

  // Check connection status on mount
  useEffect(() => {
    if (userId && !checkedConnection) {
      checkConnection();
    }
  }, [userId, checkedConnection]);

  // Preload calendar events after 2 seconds if connected
  useEffect(() => {
    if (!connected || !userId) return;
    
    const timer = setTimeout(() => {
      // Preemptively load calendar in background
      refetch().catch(() => {
        // Silently fail - this is just a preload
      });
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [connected, userId, refetch]);

  const clearError = useCallback(() => {
    setError(null);
    setIsAuthError(false);
  }, []);

  const checkConnection = useCallback(async () => {
    if (!userId) return;
    
    try {
      const res = await authenticatedFetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const isConnected = !!data.googleCalendarRefreshToken;
        setConnected(isConnected);
        setCheckedConnection(true);
        
        // Auto-fetch events if connected
        if (isConnected) {
          refetch();
        }
      } else {
        setCheckedConnection(true);
      }
    } catch (error) {
      logger.error('Failed to check calendar connection', error as Error, { userId });
      setCheckedConnection(true);
    }
  }, [userId, refetch]);

  const fetchEvents = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const connectCalendar = useCallback(() => {
    if (!userId) return;
    
    // Redirect to Google OAuth with user ID
    window.location.href = `/api/auth/google?userId=${userId}`;
  }, [userId]);

  const disconnectCalendar = useCallback(async () => {
    if (!userId) return;

    try {
      clearError();
      await authenticatedFetch('/api/calendar/disconnect', {
        method: 'POST',
      });
      
      cache.invalidate('calendar-events');
      setConnected(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect calendar';
      setError(errorMessage);
      logger.error('Failed to disconnect calendar', error as Error, { userId });
      throw error;
    }
  }, [userId, cache, clearError]);

  return {
    events: cachedEvents || [],
    loading: isLoading,
    connected,
    checkedConnection,
    error,
    isAuthError,
    fetchEvents,
    connectCalendar,
    disconnectCalendar,
    clearError,
  };
}
