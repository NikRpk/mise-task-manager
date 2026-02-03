/**
 * Mini Calendar Event Selector for changing meeting
 */

'use client';

import { useEffect, useState } from 'react';
import { X, Search, Calendar, Clock } from 'lucide-react';
import { CalendarEvent } from '@/types';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useAuth } from '@/lib/auth-context';
import { format, toZonedTime } from 'date-fns-tz';

interface MeetingSelectorDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (event: CalendarEvent | null) => void;
  currentEventId?: string | null;
}

export default function MeetingSelectorDropdown({
  isOpen,
  onClose,
  onSelect,
  currentEventId,
}: MeetingSelectorDropdownProps) {
  const { user } = useAuth();
  const { events, fetchEvents } = useCalendarEvents(user?.uid);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchEvents();
    }
  }, [isOpen, user, fetchEvents]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.meeting-selector-dropdown')) {
        onClose();
      }
    };
    
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredEvents = events.filter(event =>
    event.summary.toLowerCase().includes(searchQuery.toLowerCase()) &&
    event.id !== currentEventId
  );

  return (
    <div
      className="meeting-selector-dropdown absolute top-full left-0 mt-1 w-[500px] bg-white border rounded-lg shadow-xl z-50 max-h-[400px] flex flex-col"
      style={{ borderColor: 'var(--color-border)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <input
          type="text"
          placeholder="Search meetings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-md"
          style={{ borderColor: 'var(--color-border)' }}
        />
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <button
          onClick={() => onSelect(null)}
          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors text-gray-500"
        >
          Remove meeting link
        </button>
        
        {filteredEvents.map(event => {
          const startDate = toZonedTime(new Date(event.start), 'Europe/Berlin');
          
          return (
            <button
              key={event.id}
              onClick={() => onSelect(event)}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-blue-50 transition-colors"
            >
              <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                {event.summary}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {format(startDate, 'EEE, dd.MM.yyyy HH:mm')}
              </div>
            </button>
          );
        })}
        
        {filteredEvents.length === 0 && searchQuery && (
          <p className="text-sm text-gray-500 text-center py-4">No meetings found</p>
        )}
      </div>
    </div>
  );
}
