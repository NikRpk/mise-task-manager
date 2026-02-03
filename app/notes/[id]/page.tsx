/**
 * Individual Note Page
 * Full-page view/edit for a single note with rich text editor
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, Calendar, Plus, Trash2, ArrowLeft, Edit, X } from 'lucide-react';
import { Note, NoteTemplate, NoteTask, CalendarEvent } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { authenticatedFetch } from '@/lib/api-client';
import TipTapEditor from '@/components/TipTapEditor';
import AuthGuard from '@/components/AuthGuard';
import UserProfile from '@/components/UserProfile';
import ConfirmDialog from '@/components/ConfirmDialog';
import AlertDialog from '@/components/AlertDialog';
import { ToastContainer, useToast } from '@/components/Toast';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import Link from 'next/link';

function NoteEditPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const noteId = params.id as string;
  
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tasks, setTasks] = useState<NoteTask[]>([]);
  const [templateId, setTemplateId] = useState('default');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [userTimezone, setUserTimezone] = useState(DEFAULT_TIMEZONE);
  const [attachToCalendar, setAttachToCalendar] = useState(false);
  const [calendarEvent, setCalendarEvent] = useState<CalendarEvent | null>(null);
  const { toasts, showToast, dismissToast, updateToast } = useToast();
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'success' | 'warning' | 'info' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });
  const taskInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Fetch note data
  useEffect(() => {
    if (user && noteId) {
      fetchNote();
      fetchUserTimezone();
    }
  }, [user, noteId]);

  const fetchNote = async () => {
    try {
      setIsLoading(true);
      const res = await authenticatedFetch(`/api/notes/${noteId}`);
      if (res.ok) {
        const data = await res.json();
        setNote(data);
        setTitle(data.title);
        setContent(data.content);
        setTasks(data.tasks || []);
        setTemplateId(data.templateId);
        
        // Fetch calendar event if linked
        if (data.calendarEventId) {
          // For now, we'll just store the event data from the note
          // In a full implementation, you might want to fetch fresh event data
          if (data.calendarEventLink) {
            setCalendarEvent({
              id: data.calendarEventId,
              summary: data.title, // Fallback
              start: new Date().toISOString(),
              end: new Date().toISOString(),
              htmlLink: data.calendarEventLink,
            });
          }
        }
      } else {
        setAlertDialog({
          isOpen: true,
          title: 'Error',
          message: 'Note not found',
          type: 'error',
        });
        setTimeout(() => router.push('/notes'), 2000);
      }
    } catch (error) {
      console.error('Error fetching note:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to load note',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleSave = async () => {
    if (!title.trim()) {
      setAlertDialog({
        isOpen: true,
        title: 'Missing Title',
        message: 'Please enter a title for your note',
        type: 'warning',
      });
      return;
    }

    setIsSaving(true);
    try {
      const noteData: Partial<Note> = {
        title: title.trim(),
        content,
        tasks,
        templateId,
        calendarEventId: note?.calendarEventId || null,
        calendarEventLink: note?.calendarEventLink || null,
      };

      const res = await authenticatedFetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        body: JSON.stringify(noteData),
      });

      if (!res.ok) {
        throw new Error('Failed to save note');
      }

      showToast({
        type: 'success',
        title: 'Note saved',
        message: 'Your changes have been saved',
        duration: 3000,
      });

      // If checkbox is enabled and note is linked to calendar, attach it in background
      if (attachToCalendar && note?.calendarEventId) {
        const toastId = showToast({
          type: 'loading',
          title: 'Attaching to calendar',
          message: 'Creating Google Doc...',
          duration: 0,
        });

        // Fire and forget
        authenticatedFetch(`/api/notes/${noteId}/attach-to-calendar`, {
          method: 'POST',
        }).then(attachRes => {
          if (attachRes.ok) {
            updateToast(toastId, {
              type: 'success',
              title: 'Attached to calendar',
              message: 'Google Doc created and linked to event',
              duration: 5000,
            });
          } else {
            updateToast(toastId, {
              type: 'error',
              title: 'Attachment failed',
              message: 'Note saved but could not attach to calendar',
              duration: 5000,
            });
          }
        }).catch(() => {
          updateToast(toastId, {
            type: 'error',
            title: 'Attachment failed',
            message: 'Note saved but could not attach to calendar',
            duration: 5000,
          });
        });
        
        setAttachToCalendar(false);
      }
      
      setIsEditMode(false);
      await fetchNote(); // Refresh data
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Failed to save note',
        message: 'Please try again',
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    setConfirmDialog({
      isOpen: true,
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await authenticatedFetch(`/api/notes/${noteId}`, {
            method: 'DELETE',
          });
          
          if (res.ok) {
            router.push('/notes');
          } else {
            setAlertDialog({
              isOpen: true,
              title: 'Error',
              message: 'Failed to delete note',
              type: 'error',
            });
          }
        } catch (error) {
          setAlertDialog({
            isOpen: true,
            title: 'Error',
            message: 'Failed to delete note',
            type: 'error',
          });
        }
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  };

  const addTask = () => {
    const newTask: NoteTask = {
      id: `task-${Date.now()}`,
      title: '',
      owner: '',
      deadline: null,
    };
    setTasks([...tasks, newTask]);
    
    // Focus the first input of the new task after render
    setTimeout(() => {
      const inputRef = taskInputRefs.current[newTask.id];
      if (inputRef) {
        inputRef.focus();
      }
    }, 0);
  };

  const updateTask = (taskId: string, updates: Partial<NoteTask>) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  };

  const removeTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-primary)' }}></div>
          <p style={{ color: 'var(--color-text)' }}>Loading note...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="px-7 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <Link
                href="/notes"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                title="Back to notes"
              >
                <ArrowLeft size={20} style={{ color: 'var(--color-text)' }} />
              </Link>
              <div className="flex-1 flex items-center gap-4 flex-wrap">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title..."
                  disabled={!isEditMode}
                  className="text-2xl font-semibold bg-transparent border-none focus:outline-none min-w-[200px]"
                  style={{ color: 'var(--color-text)' }}
                />
                {note?.calendarEventData && (
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-blue-600 flex-shrink-0" />
                      <a
                        href={note.calendarEventData.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {format(toZonedTime(new Date(note.calendarEventData.start), userTimezone), 'dd.MM.yyyy, HH:mm')}
                      </a>
                    </div>
                    {note.calendarEventData.attendees && note.calendarEventData.attendees.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-600">{note.calendarEventData.attendees.length} attendees</span>
                      </div>
                    )}
                    {(note.calendarEventData.hangoutLink || note.calendarEventData.conferenceData?.entryPoints?.[0]?.uri) && (
                      <>
                        <span className="text-gray-500">•</span>
                        <a
                          href={note.calendarEventData.hangoutLink || note.calendarEventData.conferenceData?.entryPoints?.[0]?.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Join Meeting
                        </a>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-shrink-0">
              {isEditMode ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditMode(false);
                      fetchNote(); // Reset to saved state
                    }}
                    className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50 transition-colors"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm rounded-md flex items-center gap-2 text-white font-medium disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save Note
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleDelete}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete note"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="px-4 py-2 text-sm rounded-md flex items-center gap-2 text-white font-medium"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Edit size={16} />
                    Edit Note
                  </button>
                </>
              )}
              <UserProfile />
            </div>
          </div>
          
          {/* Expandable Attendees Details */}
          {note?.calendarEventData && note.calendarEventData.attendees && note.calendarEventData.attendees.length > 0 && (
            <details className="mt-3 ml-12">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                Show attendee details
              </summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {note.calendarEventData.attendees.map((attendee, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                    style={{
                      backgroundColor:
                        attendee.responseStatus === 'accepted' ? '#dcfce7' :
                        attendee.responseStatus === 'declined' ? '#fee2e2' :
                        attendee.responseStatus === 'tentative' ? '#fef9c3' :
                        '#f3f4f6',
                      color:
                        attendee.responseStatus === 'accepted' ? '#166534' :
                        attendee.responseStatus === 'declined' ? '#991b1b' :
                        attendee.responseStatus === 'tentative' ? '#854d0e' :
                        '#374151',
                    }}
                  >
                    <span>{attendee.email}</span>
                    {attendee.organizer && <span className="font-semibold">(Organizer)</span>}
                    <span className="opacity-70">
                      {attendee.responseStatus === 'accepted' ? '✓' :
                       attendee.responseStatus === 'declined' ? '✗' :
                       attendee.responseStatus === 'tentative' ? '?' :
                       '⋯'}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-7 py-8">
        <div className="space-y-8">
          {/* Rich Text Editor */}
          <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <TipTapEditor
              value={content}
              onChange={setContent}
              placeholder="Start taking notes..."
              disabled={!isEditMode}
              attendees={[]}
            />
          </div>

          {/* Tasks Section */}
          <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                Tasks
              </h3>
              {isEditMode && (
                <button
                  onClick={addTask}
                  className="px-3 py-1.5 text-sm rounded-md flex items-center gap-2 text-white"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Plus size={14} />
                  Add Task
                </button>
              )}
            </div>

            {tasks.length === 0 ? (
              <div
                onClick={() => isEditMode && addTask()}
                className={`text-sm text-gray-500 text-center py-8 border-2 border-dashed rounded-lg ${isEditMode ? 'cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-colors' : ''}`}
                style={{ borderColor: 'var(--color-border)' }}
              >
                {isEditMode ? (
                  <>
                    <Plus size={20} className="mx-auto mb-2 text-gray-400" />
                    <p>Click here to create your first task</p>
                  </>
                ) : (
                  <p>No tasks yet.</p>
                )}
              </div>
            ) : (
              <div>
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b" style={{ borderColor: 'var(--color-border)' }}>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Task Title
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Owner
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Deadline
                        </th>
                        {isEditMode && (
                          <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task, index) => (
                        <tr
                          key={task.id}
                          className="border-b"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <td className="px-4 py-3">
                            <input
                              ref={(el) => { taskInputRefs.current[task.id] = el; }}
                              type="text"
                              value={task.title}
                              onChange={(e) => updateTask(task.id, { title: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && isEditMode && index === tasks.length - 1) {
                                  e.preventDefault();
                                  addTask();
                                }
                              }}
                              placeholder="Task title..."
                              disabled={!isEditMode}
                              className="w-full px-2 py-1 border rounded text-sm"
                              style={{ borderColor: 'var(--color-border)' }}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={task.owner}
                              onChange={(e) => updateTask(task.id, { owner: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && isEditMode && index === tasks.length - 1) {
                                  e.preventDefault();
                                  addTask();
                                }
                              }}
                              placeholder="Owner..."
                              disabled={!isEditMode}
                              className="w-full px-2 py-1 border rounded text-sm"
                              style={{ borderColor: 'var(--color-border)' }}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="date"
                              value={task.deadline || ''}
                              onChange={(e) => updateTask(task.id, { deadline: e.target.value || null })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && isEditMode && index === tasks.length - 1) {
                                  e.preventDefault();
                                  addTask();
                                }
                              }}
                              disabled={!isEditMode}
                              className="w-full px-2 py-1 border rounded text-sm"
                              style={{ borderColor: 'var(--color-border)' }}
                            />
                          </td>
                          {isEditMode && (
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => removeTask(task.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remove task"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {isEditMode && (
                  <div
                    onClick={addTask}
                    className="mt-2 py-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center gap-2 text-sm text-gray-500"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <Plus size={16} />
                    <span>Click here or press Enter to add another task</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Calendar Attachment Option */}
          {isEditMode && note?.calendarEventId && (
            <div className="rounded-xl border p-4" style={{ backgroundColor: '#f0f9ff', borderColor: '#bfdbfe' }}>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="attach-to-calendar"
                  checked={attachToCalendar}
                  onChange={(e) => setAttachToCalendar(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <label 
                  htmlFor="attach-to-calendar"
                  className="text-sm font-medium cursor-pointer select-none flex items-center gap-2"
                  style={{ color: '#1e40af' }}
                >
                  <Calendar size={14} />
                  <span>Attach to calendar event on save (creates Google Doc)</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title="Delete Note"
        message={confirmDialog.message}
        type="danger"
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function NotePage() {
  return (
    <AuthGuard>
      <NoteEditPage />
    </AuthGuard>
  );
}
