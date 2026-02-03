/**
 * Custom hook for Google Calendar events
 */

import { useState, useCallback, useEffect } from 'react';
import { CalendarEvent } from '@/types';
import { authenticatedFetch } from '@/lib/api-client';
import { logger } from '@/lib/logger';

interface UseCalendarEventsResult {
  events: CalendarEvent[];
  loading: boolean;
  connected: boolean;
  checkedConnection: boolean;
  fetchEvents: () => Promise<void>;
  connectCalendar: () => void;
  disconnectCalendar: () => Promise<void>;
}

/**
 * Hook to manage calendar events
 * @param userId - Current user ID
 * @returns Calendar events and operations
 */
export function useCalendarEvents(userId: string | undefined): UseCalendarEventsResult {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [checkedConnection, setCheckedConnection] = useState(false);

  // Check connection status on mount
  useEffect(() => {
    if (userId && !checkedConnection) {
      checkConnection();
    }
  }, [userId, checkedConnection]);

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
          fetchEventsInternal();
        }
      } else {
        setCheckedConnection(true);
      }
    } catch (error) {
      logger.error('Failed to check calendar connection', error as Error, { userId });
      setCheckedConnection(true);
    }
  }, [userId]);

  const fetchEventsInternal = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const res = await authenticatedFetch('/api/calendar/events');
      const data = await res.json();
      
      if (res.ok) {
        setEvents(data.events || []);
        setConnected(true);
      } else {
        setEvents([]);
        setConnected(false);
      }
    } catch (error) {
      logger.error('Failed to fetch calendar events', error as Error, { userId });
      setEvents([]);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = useCallback(async () => {
    await fetchEventsInternal();
  }, [userId]);

  const connectCalendar = useCallback(() => {
    if (!userId) return;
    
    // Redirect to Google OAuth with user ID
    window.location.href = `/api/auth/google?userId=${userId}`;
  }, [userId]);

  const disconnectCalendar = useCallback(async () => {
    if (!userId) return;

    try {
      await authenticatedFetch('/api/calendar/disconnect', {
        method: 'POST',
      });
      
      setEvents([]);
      setConnected(false);
    } catch (error) {
      logger.error('Failed to disconnect calendar', error as Error, { userId });
      throw error;
    }
  }, [userId]);

  return {
    events,
    loading,
    connected,
    checkedConnection,
    fetchEvents,
    connectCalendar,
    disconnectCalendar,
  };
}
