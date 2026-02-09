/**
 * Notes List Page
 * Table view of all notes with search and filters
 */

'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, Calendar, FileText, Trash2, Edit, Link as LinkIcon, Filter } from 'lucide-react';
import { Note, CalendarEvent } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { useNoteData } from '@/hooks/useNoteData';
import { useNoteTemplates } from '@/hooks/useNoteTemplates';
import { useUserSettings } from '@/hooks/useUserSettings';
import ConfirmDialog from '@/components/ConfirmDialog';
import AuthGuard from '@/components/AuthGuard';
import UserProfile from '@/components/UserProfile';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import Link from 'next/link';

function NotesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { settings } = useUserSettings();
  
  const { notes, loading, fetchNotes, createNote, updateNote, deleteNote } = useNoteData(user?.uid);
  const { templates } = useNoteTemplates(user?.uid);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  // Get timezone from cached settings
  const userTimezone = settings?.timezone || DEFAULT_TIMEZONE;

  // Fetch notes on mount
  useEffect(() => {
    if (user) {
      fetchNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Filtered and searched notes
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [notes, searchQuery]);

  const handleNewNote = () => {
    router.push('/notes/new');
  };

  const handleViewNote = (note: Note) => {
    router.push(`/notes/${note.id}`);
  };

  const handleEditNote = (note: Note) => {
    router.push(`/notes/${note.id}`);
  };

  const handleDeleteNote = (note: Note) => {
    setConfirmDialog({
      isOpen: true,
      message: `Are you sure you want to delete "${note.title}"? This action cannot be undone.`,
      onConfirm: async () => {
        await deleteNote(note.id);
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  };

  if (loading && notes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-primary)' }}></div>
          <p style={{ color: 'var(--color-text)' }}>Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <main className="px-7 py-7">
        {/* Page Header */}
        <div className="rounded-xl border mb-6 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {/* Top Bar */}
          <div className="flex justify-between items-center px-7 py-4" style={{ borderBottom: '3px solid var(--color-primary)' }}>
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
                <Link
                  href="/"
                  prefetch={true}
                  className="px-4 py-1.5 text-sm rounded-full transition-all duration-200"
                  style={{ 
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Tasks
                </Link>
                <span 
                  className="px-4 py-1.5 text-sm rounded-full font-semibold" 
                  style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                >
                  Notes
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewNote}
                className="px-4 py-2 text-sm rounded-md transition-all duration-200 flex items-center gap-2 font-medium text-white animate-fadeIn"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Plus size={16} />
                New Note
              </button>
              <UserProfile />
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-7 py-4" style={{ backgroundColor: 'var(--color-bg)' }}>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notes Table */}
        <div className="rounded-xl border shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {filteredNotes.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <FileText size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                No Notes Yet
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {searchQuery ? 'No notes match your search.' : 'Create your first note to get started.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleNewNote}
                  className="px-6 py-3 rounded-md text-white font-medium flex items-center gap-2 mx-auto"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Plus size={18} />
                  Create First Note
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Note
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Attendees
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotes.map(note => {
                    const createdDate = toZonedTime(new Date(note.createdAt), userTimezone);
                    const eventDate = note.calendarEventData?.start 
                      ? toZonedTime(new Date(note.calendarEventData.start), userTimezone)
                      : null;
                    
                    // Get attendees (exclude resources like meeting rooms)
                    const attendees = note.calendarEventData?.attendees?.filter(a => !a.resource) || [];
                    const displayAttendees = attendees.slice(0, 2);
                    const remainingCount = Math.max(0, attendees.length - 2);
                    
                    // Check if this is a recurring event
                    const isRecurring = !!note.recurringEventId;
                    
                    return (
                      <tr
                        key={note.id}
                        className="border-b hover:bg-gray-50 transition-colors"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        {/* Note Title + Recurring Indicator */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleViewNote(note)}
                            className="flex items-center gap-2 hover:underline text-left"
                          >
                            <FileText size={16} className="text-gray-400 flex-shrink-0" />
                            <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                              {note.title}
                            </span>
                            {isRecurring && (
                              <span 
                                className="text-gray-400"
                                title="Recurring meeting"
                              >
                                <svg 
                                  width="14" 
                                  height="14" 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="2" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                >
                                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                                </svg>
                              </span>
                            )}
                          </button>
                        </td>
                        
                        {/* Attendees */}
                        <td className="px-6 py-4">
                          {attendees.length > 0 ? (
                            <div className="relative group">
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                {displayAttendees.map((attendee, idx) => (
                                  <span key={idx}>
                                    {attendee.displayName || attendee.email.split('@')[0]}
                                    {idx < displayAttendees.length - 1 && ', '}
                                  </span>
                                ))}
                                {remainingCount > 0 && (
                                  <span className="text-gray-400">
                                    , +{remainingCount} more
                                  </span>
                                )}
                              </div>
                              
                              {/* Tooltip with all attendees */}
                              {attendees.length > 2 && (
                                <div className="absolute left-0 top-full mt-2 p-3 bg-white rounded-lg shadow-lg border border-gray-200 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[200px]">
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                    All Attendees
                                  </div>
                                  {attendees.map((attendee, idx) => (
                                    <div key={idx} className="text-sm text-gray-700 py-1">
                                      {attendee.displayName || attendee.email.split('@')[0]}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        
                        {/* Date (Event date or Created date) */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">
                            {eventDate 
                              ? format(eventDate, 'dd.MM.yyyy HH:mm')
                              : format(createdDate, 'dd.MM.yyyy HH:mm')
                            }
                          </span>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditNote(note)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title="Edit note"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete note"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title="Delete Note"
        message={confirmDialog.message}
        type="danger"
      />
    </div>
  );
}

export default function Notes() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-primary)' }}></div>
            <p style={{ color: 'var(--color-text)' }}>Loading notes...</p>
          </div>
        </div>
      }>
        <NotesPage />
      </Suspense>
    </AuthGuard>
  );
}
