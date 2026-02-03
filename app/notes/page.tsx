/**
 * Notes List Page
 * Table view of all notes with search and filters
 */

'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, Calendar, FileText, Trash2, Edit, Link as LinkIcon, Filter } from 'lucide-react';
import { Note, CalendarEvent, Project } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { useNoteData } from '@/hooks/useNoteData';
import { useNoteTemplates } from '@/hooks/useNoteTemplates';
import { useProjectData } from '@/hooks/useProjectData';
import { authenticatedFetch } from '@/lib/api-client';
import NoteModal from '@/components/NoteModal';
import CalendarEventSelector from '@/components/CalendarEventSelector';
import ConfirmDialog from '@/components/ConfirmDialog';
import AuthGuard from '@/components/AuthGuard';
import UserProfile from '@/components/UserProfile';
import ProjectSelector from '@/components/ProjectSelector';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import Link from 'next/link';

function NotesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const { notes, loading, fetchNotes, createNote, updateNote, deleteNote } = useNoteData(user?.uid);
  const { templates } = useNoteTemplates(user?.uid);
  const { projects, selectedProjectId, setSelectedProjectId } = useProjectData(user?.uid);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isCalendarSelectorOpen, setIsCalendarSelectorOpen] = useState(false);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
  const [userTimezone, setUserTimezone] = useState(DEFAULT_TIMEZONE);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  // Fetch user's timezone setting
  useEffect(() => {
    if (user) {
      const fetchUserSettings = async () => {
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
      fetchUserSettings();
    }
  }, [user]);

  // Fetch notes on mount or when filter changes
  useEffect(() => {
    if (user) {
      fetchNotes(filterProject);
    }
  }, [user, filterProject, fetchNotes]);

  // Filtered and searched notes
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [notes, searchQuery]);

  const handleNewNote = () => {
    setSelectedNote(null);
    setSelectedCalendarEvent(null);
    setIsCalendarSelectorOpen(true);
  };

  const handleCalendarEventSelected = (event: CalendarEvent | null) => {
    setSelectedCalendarEvent(event);
    setIsNoteModalOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setSelectedNote(note);
    setIsNoteModalOpen(true);
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

  const handleSaveNote = async (noteData: Partial<Note>) => {
    if (noteData.id) {
      // Update existing note
      await updateNote(noteData.id, noteData);
    } else {
      // Create new note
      await createNote(noteData);
    }
    setIsNoteModalOpen(false);
    setSelectedNote(null);
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project ? `${project.icon} ${project.name}` : null;
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
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="px-4 py-2 text-sm rounded-md transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Tasks
                </Link>
                <span className="px-4 py-2 text-sm rounded-md font-semibold" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                  Notes
                </span>
              </div>
              <div className="border-l pl-4" style={{ borderColor: 'var(--color-border)' }}>
                <ProjectSelector
                  projects={projects}
                  selectedProjectId={filterProject}
                  onChange={setFilterProject}
                  onCreateProject={() => {}}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewNote}
                className="px-4 py-2 text-sm rounded-md transition-colors flex items-center gap-2 font-medium text-white"
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
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Meeting
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Tasks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Created
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotes.map(note => {
                    const projectName = getProjectName(note.projectId);
                    const createdDate = toZonedTime(new Date(note.createdAt), userTimezone);
                    
                    return (
                      <tr
                        key={note.id}
                        className="border-b hover:bg-gray-50 transition-colors"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-gray-400" />
                            <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                              {note.title}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {projectName ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100" style={{ color: 'var(--color-text)' }}>
                              {projectName}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No project</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {note.calendarEventLink ? (
                            <a
                              href={note.calendarEventLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                            >
                              <LinkIcon size={14} />
                              View
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">
                            {note.tasks.length} {note.tasks.length === 1 ? 'task' : 'tasks'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">
                            {format(createdDate, 'dd.MM.yyyy HH:mm')}
                          </span>
                        </td>
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

      {/* Calendar Event Selector */}
      <CalendarEventSelector
        isOpen={isCalendarSelectorOpen}
        onClose={() => setIsCalendarSelectorOpen(false)}
        onSelectEvent={handleCalendarEventSelected}
      />

      {/* Note Modal */}
      <NoteModal
        note={selectedNote}
        isOpen={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false);
          setSelectedNote(null);
          setSelectedCalendarEvent(null);
        }}
        onSave={handleSaveNote}
        templates={templates}
        projects={projects}
        calendarEvent={selectedCalendarEvent}
        defaultProjectId={filterProject || undefined}
      />

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
