/**
 * Create New Note Page
 * Full-page view for creating a new note with optional calendar event link
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, Calendar, Plus, Trash2, ArrowLeft, X } from 'lucide-react';
import { Note, NoteTemplate, NoteTask, CalendarEvent } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { authenticatedFetch } from '@/lib/api-client';
import TipTapEditor from '@/components/TipTapEditor';
import AuthGuard from '@/components/AuthGuard';
import UserProfile from '@/components/UserProfile';
import CalendarEventSelector from '@/components/CalendarEventSelector';
import AlertDialog from '@/components/AlertDialog';
import { ToastContainer, useToast } from '@/components/Toast';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import Link from 'next/link';

function NewNotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tasks, setTasks] = useState<NoteTask[]>([]);
  const [templateId, setTemplateId] = useState('default');
  const [isSaving, setIsSaving] = useState(false);
  const [userTimezone, setUserTimezone] = useState(DEFAULT_TIMEZONE);
  const [attachToCalendar, setAttachToCalendar] = useState(true);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
  const [showCalendarSelector, setShowCalendarSelector] = useState(false);
  const { toasts, showToast, dismissToast, updateToast } = useToast();
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'success' | 'warning' | 'info' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });
  const taskInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Load template and user settings
  useEffect(() => {
    if (user) {
      fetchUserSettings();
      // Prefetch calendar events in background for faster loading
      prefetchCalendarEvents();
    }
  }, [user]);

  const prefetchCalendarEvents = async () => {
    try {
      // Check if user is connected to calendar
      const settingsRes = await authenticatedFetch('/api/settings');
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        if (settings.googleCalendarRefreshToken) {
          // Silently prefetch events in background
          authenticatedFetch('/api/calendar/events').catch(() => {
            // Ignore errors - this is just prefetching
          });
        }
      }
    } catch (error) {
      // Ignore errors - this is just prefetching
    }
  };

  // Show calendar selector on mount if no event is pre-selected
  useEffect(() => {
    const eventParam = searchParams.get('event');
    if (!eventParam) {
      setShowCalendarSelector(true);
    }
  }, [searchParams]);

  const fetchUserSettings = async () => {
    try {
      const res = await authenticatedFetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.timezone) {
          setUserTimezone(data.timezone);
        }
        if (data.noteTemplate) {
          setContent(data.noteTemplate);
        } else {
          // Use default template
          setContent(`<h2>Agenda</h2>
<ul>
  <li></li>
</ul>

<h2>Discussion & Notes</h2>
<ul>
  <li></li>
</ul>

<h2>Decisions Made</h2>
<ul>
  <li></li>
</ul>

<h2>Action Items</h2>
<ul>
  <li></li>
</ul>`);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleCalendarEventSelected = (event: CalendarEvent | null) => {
    setSelectedCalendarEvent(event);
    setShowCalendarSelector(false);
    if (event) {
      setTitle(event.summary);
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
        calendarEventId: selectedCalendarEvent?.id || null,
        calendarEventLink: selectedCalendarEvent?.htmlLink || null,
        calendarEventData: selectedCalendarEvent || null,
      };

      const res = await authenticatedFetch('/api/notes', {
        method: 'POST',
        body: JSON.stringify(noteData),
      });

      if (!res.ok) {
        throw new Error('Failed to create note');
      }

      const newNote = await res.json();
      
      showToast({
        type: 'success',
        title: 'Note created',
        message: 'Your note has been saved successfully',
        duration: 3000,
      });

      // If attachment is enabled, do it in the background (don't wait)
      if (attachToCalendar && selectedCalendarEvent) {
        const toastId = showToast({
          type: 'loading',
          title: 'Attaching to calendar',
          message: 'Creating Google Doc...',
          duration: 0, // Don't auto-dismiss
        });

        // Fire and forget - run in background
        authenticatedFetch(`/api/notes/${newNote.id}/attach-to-calendar`, {
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
      }
      
      // Navigate immediately without waiting for attachment
      router.push(`/notes/${newNote.id}`);
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Failed to create note',
        message: 'Please try again',
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
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
                  className="text-2xl font-semibold bg-transparent border-none focus:outline-none min-w-[200px]"
                  style={{ color: 'var(--color-text)' }}
                />
                {selectedCalendarEvent && (
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-blue-600 flex-shrink-0" />
                      <a
                        href={selectedCalendarEvent.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {format(toZonedTime(new Date(selectedCalendarEvent.start), userTimezone), 'dd.MM.yyyy, HH:mm')}
                      </a>
                    </div>
                    {selectedCalendarEvent.attendees && selectedCalendarEvent.attendees.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-600">{selectedCalendarEvent.attendees.length} attendees</span>
                      </div>
                    )}
                    {(selectedCalendarEvent.hangoutLink || selectedCalendarEvent.conferenceData?.entryPoints?.[0]?.uri) && (
                      <>
                        <span className="text-gray-500">•</span>
                        <a
                          href={selectedCalendarEvent.hangoutLink || selectedCalendarEvent.conferenceData?.entryPoints?.[0]?.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Join Meeting
                        </a>
                      </>
                    )}
                    <button
                      onClick={() => setShowCalendarSelector(true)}
                      className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      Change
                    </button>
                  </div>
                )}
                {!selectedCalendarEvent && (
                  <button
                    onClick={() => setShowCalendarSelector(true)}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors"
                  >
                    <Calendar size={14} />
                    <span>Link to meeting</span>
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => router.push('/notes')}
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
                    Creating...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Create Note
                  </>
                )}
              </button>
              <UserProfile />
            </div>
          </div>
          
          {/* Expandable Attendees Details */}
          {selectedCalendarEvent && selectedCalendarEvent.attendees && selectedCalendarEvent.attendees.length > 0 && (
            <details className="mt-3 ml-12">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                Show attendee details
              </summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedCalendarEvent.attendees.map((attendee, index) => (
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
              disabled={false}
              attendees={[]}
            />
          </div>

          {/* Tasks Section */}
          <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                Tasks
              </h3>
              <button
                onClick={addTask}
                className="px-3 py-1.5 text-sm rounded-md flex items-center gap-2 text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Plus size={14} />
                Add Task
              </button>
            </div>

            {tasks.length === 0 ? (
              <div
                onClick={addTask}
                className="text-sm text-gray-500 text-center py-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-colors"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <Plus size={20} className="mx-auto mb-2 text-gray-400" />
                <p>Click here to create your first task</p>
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
                        <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Actions
                        </th>
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
                                if (e.key === 'Enter' && index === tasks.length - 1) {
                                  e.preventDefault();
                                  addTask();
                                }
                              }}
                              placeholder="Task title..."
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
                                if (e.key === 'Enter' && index === tasks.length - 1) {
                                  e.preventDefault();
                                  addTask();
                                }
                              }}
                              placeholder="Owner..."
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
                                if (e.key === 'Enter' && index === tasks.length - 1) {
                                  e.preventDefault();
                                  addTask();
                                }
                              }}
                              className="w-full px-2 py-1 border rounded text-sm"
                              style={{ borderColor: 'var(--color-border)' }}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => removeTask(task.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Remove task"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div
                  onClick={addTask}
                  className="mt-2 py-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center gap-2 text-sm text-gray-500"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <Plus size={16} />
                  <span>Click here or press Enter to add another task</span>
                </div>
              </div>
            )}
          </div>

          {/* Calendar Attachment Option */}
          {selectedCalendarEvent && (
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

      {/* Calendar Event Selector */}
      <CalendarEventSelector
        isOpen={showCalendarSelector}
        onClose={() => setShowCalendarSelector(false)}
        onSelectEvent={handleCalendarEventSelected}
      />

      {/* Alert Dialog */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function CreateNotePage() {
  return (
    <AuthGuard>
      <NewNotePage />
    </AuthGuard>
  );
}
