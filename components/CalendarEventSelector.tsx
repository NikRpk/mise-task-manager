/**
 * Calendar Event Selector Component
 * Allows users to select a meeting or create a standalone note
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { X, Calendar, Clock, Link as LinkIcon, Plus, AlertCircle } from 'lucide-react';
import { CalendarEvent } from '@/types';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useAuth } from '@/lib/auth-context';
import { authenticatedFetch } from '@/lib/api-client';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

interface CalendarEventSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEvent: (event: CalendarEvent | null) => void;
}

export default function CalendarEventSelector({
  isOpen,
  onClose,
  onSelectEvent,
}: CalendarEventSelectorProps) {
  const { user } = useAuth();
  const { events, loading, connected, checkedConnection, error, isAuthError, connectCalendar, clearError, fetchEvents } = useCalendarEvents(user?.uid);
  const [searchQuery, setSearchQuery] = useState('');
  const [userTimezone, setUserTimezone] = useState(DEFAULT_TIMEZONE);
  const [hasRefreshedOnOpen, setHasRefreshedOnOpen] = useState(false);
  const [pastEvents, setPastEvents] = useState<CalendarEvent[]>([]);
  const [loadingPast, setLoadingPast] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);

  // Combine current and past events
  const allEvents = useMemo(() => {
    return [...pastEvents, ...events];
  }, [pastEvents, events]);

  // Fetch user's timezone setting
  useEffect(() => {
    if (user) {
      const fetchUserTimezone = async () => {
        try {
          const res = await authenticatedFetch('/api/settings');
          if (res.ok) {
            const data = await res.json();
            if (data.timezone) {
              setUserTimezone(data.timezone);
            }
          }
        } catch (error) {
          // Use default timezone
        }
      };
      fetchUserTimezone();
    }
  }, [user]);

  // Fetch events in background when dialog opens (only once per open)
  useEffect(() => {
    if (isOpen && connected && !hasRefreshedOnOpen) {
      setHasRefreshedOnOpen(true);
      // Background fetch - doesn't block UI
      fetchEvents().catch(() => {
        // Silently fail - we already have cached data
      });
    }
    
    // Reset when dialog closes
    if (!isOpen && hasRefreshedOnOpen) {
      setHasRefreshedOnOpen(false);
    }
  }, [isOpen, connected, hasRefreshedOnOpen, fetchEvents]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Filter events by search query
  const filteredEvents = useMemo(() => {
    return allEvents.filter(event =>
      event.summary.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allEvents, searchQuery]);

  // Load more past events
  const loadMorePastEvents = useCallback(async () => {
    if (loadingPast || !canLoadMore) return;
    
    setLoadingPast(true);
    try {
      // Get the earliest event we have
      const earliestEvent = allEvents.length > 0 
        ? allEvents.reduce((earliest, event) => 
            new Date(event.start) < new Date(earliest.start) ? event : earliest
          )
        : null;
      
      if (!earliestEvent) {
        setCanLoadMore(false);
        return;
      }
      
      const beforeDate = new Date(earliestEvent.start).toISOString();
      const res = await authenticatedFetch(`/api/calendar/events/past?before=${beforeDate}`);
      
      if (!res.ok) {
        throw new Error('Failed to load past events');
      }
      
      const data = await res.json();
      
      if (data.events.length === 0) {
        setCanLoadMore(false);
      } else {
        setPastEvents(prev => [...data.events, ...prev]);
      }
    } catch (error) {
      console.error('Failed to load past events:', error);
    } finally {
      setLoadingPast(false);
    }
  }, [loadingPast, canLoadMore, allEvents]);

  // Group events by day
  const eventsByDay = useMemo(() => {
    const groups: Record<string, CalendarEvent[]> = {};
    
    filteredEvents.forEach(event => {
      const startDate = toZonedTime(new Date(event.start), userTimezone);
      const dayKey = format(startDate, 'yyyy-MM-dd');
      
      if (!groups[dayKey]) {
        groups[dayKey] = [];
      }
      groups[dayKey].push(event);
    });
    
    return groups;
  }, [filteredEvents, userTimezone]);

  const handleEventSelect = (event: CalendarEvent) => {
    onSelectEvent(event);
    onClose();
  };

  const handleNoMeeting = () => {
    onSelectEvent(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col"
        style={{ backgroundColor: 'var(--color-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
              Select Meeting
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Choose an upcoming meeting or create a standalone note
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Close"
          >
            <X size={20} style={{ color: 'var(--color-text)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!checkedConnection ? (
            /* Initial Load - checking connection status */
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-primary)' }}></div>
              <p className="text-sm text-gray-500">Checking connection...</p>
            </div>
          ) : error && isAuthError ? (
            /* Calendar Authentication Error - show reconnection prompt */
            <div className="text-center py-12 px-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
                <AlertCircle size={32} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                Calendar Connection Issue
              </h3>
              <p className="text-sm text-red-600 mb-2 font-medium">
                {error}
              </p>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                Your calendar connection has expired or been revoked. Please reconnect to access your meetings.
              </p>
              <div className="flex flex-col gap-3 items-center">
                <button
                  onClick={() => {
                    clearError();
                    connectCalendar();
                  }}
                  className="px-6 py-3 rounded-md text-white font-medium flex items-center gap-2"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Calendar size={18} />
                  Reconnect Google Calendar
                </button>
                <button
                  onClick={handleNoMeeting}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Skip and create note without meeting
                </button>
              </div>
            </div>
          ) : !connected ? (
            /* Not Connected State */
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
                <Calendar size={32} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                Connect Google Calendar
              </h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                Connect your Google Calendar to see upcoming meetings and link notes to events
              </p>
              <button
                onClick={connectCalendar}
                className="px-6 py-3 rounded-md text-white font-medium flex items-center gap-2 mx-auto"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Calendar size={18} />
                Connect Google Calendar
              </button>
              <div className="mt-6">
                <button
                  onClick={handleNoMeeting}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Skip and create note without meeting
                </button>
              </div>
            </div>
          ) : events.length === 0 && !loading ? (
            /* No Events State - only show if not loading */
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <AlertCircle size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                No Upcoming Meetings
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                You don&apos;t have any meetings scheduled in the next 30 days
              </p>
              <button
                onClick={handleNoMeeting}
                className="px-6 py-3 rounded-md text-white font-medium"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Create Note Without Meeting
              </button>
            </div>
          ) : events.length === 0 && loading ? (
            /* Loading State - only when explicitly loading and no cached events */
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-primary)' }}></div>
              <p className="text-sm text-gray-500">Loading meetings...</p>
            </div>
          ) : (
            /* Events List - show immediately if we have any events */
            <>
              {/* Sticky Search Bar */}
              <div className="sticky top-0 z-20 px-6 pt-6 pb-4" style={{ backgroundColor: 'var(--color-surface)' }}>
                <input
                  type="text"
                  placeholder="Search meetings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  style={{ borderColor: 'var(--color-border)' }}
                />
                
                {/* Optional: Show a subtle loading indicator if refreshing events */}
                {loading && (
                  <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
                    <span>Refreshing...</span>
                  </div>
                )}
              </div>

              {/* Scrollable Events Area */}
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                {/* Load More Past Events Button */}
                {canLoadMore && allEvents.length > 0 && (
                  <div className="mb-4">
                    <button
                      onClick={loadMorePastEvents}
                      disabled={loadingPast}
                      className="w-full p-3 border rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      {loadingPast ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
                          <span>Loading earlier events...</span>
                        </>
                      ) : (
                        <>
                          <Clock size={16} />
                          <span>Load earlier events (past week)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
                
                {/* Events Grouped by Day */}
                <div className="space-y-4">
                  {Object.entries(eventsByDay)
                    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                    .map(([dayKey, dayEvents]) => {
                      const dayDate = toZonedTime(new Date(dayKey), userTimezone);
                      
                      return (
                        <div key={dayKey}>
                          {/* Sticky Day Header */}
                          <div className="sticky top-0 z-10 px-3 py-2 rounded-md mb-2 border" style={{ backgroundColor: 'var(--color-surface-muted)', borderColor: 'var(--color-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
                            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                              {format(dayDate, 'EEEE, dd.MM.yyyy')}
                            </h3>
                          </div>
                          
                          {/* Events for this day */}
                          <div className="space-y-2 ml-2">
                            {dayEvents.map(event => {
                              const startDate = toZonedTime(new Date(event.start), userTimezone);
                              const endDate = toZonedTime(new Date(event.end), userTimezone);
                              
                              return (
                                <button
                                  key={event.id}
                                  onClick={() => handleEventSelect(event)}
                                  className="w-full text-left p-4 border rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
                                  style={{ borderColor: 'var(--color-border)' }}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                                        {event.summary}
                                      </h4>
                                      <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Clock size={14} />
                                        {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                                      </div>
                                    </div>
                                    {event.htmlLink && (
                                      <LinkIcon size={16} className="text-gray-400 flex-shrink-0 ml-2" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* No Meeting Option */}
                <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <button
                    onClick={handleNoMeeting}
                    className="w-full p-4 border-2 border-dashed rounded-lg hover:border-green-500 hover:bg-green-50 transition-all flex items-center justify-center gap-2"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <Plus size={18} style={{ color: 'var(--color-primary)' }} />
                    <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                      Create Note Without Meeting
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
