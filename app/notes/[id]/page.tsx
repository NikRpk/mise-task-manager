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
import { useUserSettings } from '@/hooks/useUserSettings';
import TipTapEditor from '@/components/TipTapEditor';
import AuthGuard from '@/components/AuthGuard';
import UserProfile from '@/components/UserProfile';
import ConfirmDialog from '@/components/ConfirmDialog';
import AlertDialog from '@/components/AlertDialog';
import { useToast } from '@/lib/toast-context';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import Link from 'next/link';
import { usePeopleData } from '@/hooks/usePeopleData';
import OwnerSelector from '@/components/OwnerSelector';
import PreviousMeetingSection from '@/components/PreviousMeetingSection';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { logger } from '@/lib/logger';

function NoteEditPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const noteId = params.id as string;
  
  const [note, setNote] = useState<Note | null>(null);
  const [previousNote, setPreviousNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tasks, setTasks] = useState<NoteTask[]>([]);
  const [templateId, setTemplateId] = useState('default');
  const [isSaving, setIsSaving] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [calendarEvent, setCalendarEvent] = useState<CalendarEvent | null>(null);
  const [updateGoogleDoc, setUpdateGoogleDoc] = useState(false);
  const { showToast, updateToast } = useToast();
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
  const { people } = usePeopleData();

  // Get timezone from cached settings
  const userTimezone = settings?.timezone || DEFAULT_TIMEZONE;

  // Check if user is organizer of the calendar event
  const isOrganizer = note?.calendarEventData?.attendees?.some(
    a => a.self && a.organizer
  ) ?? false;

  // Check if Google Doc has been attached
  const hasGoogleDocAttached = !!note?.googleDocId;

  // Fetch note data
  useEffect(() => {
    if (user && noteId) {
      fetchNote();
    }
  }, [user, noteId]);

  const fetchNote = async () => {
    try {
      setIsLoading(true);
      const res = await authenticatedFetch(`/api/notes/${noteId}?includePrevious=true`);
      if (res.ok) {
        const data = await res.json();
        
        // Handle new response format with currentNote and previousNote
        const currentNote = data.currentNote || data;
        const prevNote = data.previousNote || null;
        
        setNote(currentNote);
        setPreviousNote(prevNote);
        setTitle(currentNote.title);
        setContent(currentNote.content);
        setTasks(currentNote.tasks || []);
        setTemplateId(currentNote.templateId);
        
        // Fetch calendar event if linked
        if (currentNote.calendarEventId) {
          // For now, we'll just store the event data from the note
          // In a full implementation, you might want to fetch fresh event data
          if (currentNote.calendarEventLink) {
            setCalendarEvent({
              id: currentNote.calendarEventId,
              summary: currentNote.title, // Fallback
              start: new Date().toISOString(),
              end: new Date().toISOString(),
              htmlLink: currentNote.calendarEventLink,
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
      logger.error('Error fetching note', error as Error, {
        noteId: Array.isArray(params.id) ? params.id[0] : params.id,
        userId: user?.uid,
      });
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to load note. Please try again.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
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
      // Filter out tasks with empty titles
      const validTasks = tasks.filter(task => task.title.trim() !== '');
      
      const noteData: Partial<Note> = {
        title: title.trim(),
        content,
        tasks: validTasks,
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

      // If user checked "Update Google Doc", trigger the attachment/update
      if (updateGoogleDoc && note?.calendarEventData) {
        setIsAttaching(true);
        const toastId = showToast({
          type: 'loading',
          title: hasGoogleDocAttached ? 'Updating Google Doc' : 'Creating Google Doc',
          message: 'Please wait...',
          duration: 0,
        });

        try {
          const attachRes = await authenticatedFetch(`/api/notes/${noteId}/attach-to-calendar`, {
            method: 'POST',
          });

          if (attachRes.ok) {
            updateToast(toastId, {
              type: 'success',
              title: hasGoogleDocAttached ? 'Google Doc updated' : 'Google Doc created',
              message: hasGoogleDocAttached
                ? 'The document has been updated with your latest changes'
                : isOrganizer 
                  ? 'Document created and linked to event' 
                  : 'Document created and shared with attendees',
              duration: 5000,
            });
          } else {
            throw new Error('Attachment failed');
          }
        } catch (error) {
          updateToast(toastId, {
            type: 'error',
            title: hasGoogleDocAttached ? 'Update failed' : 'Creation failed',
            message: 'Note saved but could not update the Google Doc',
            duration: 5000,
          });
        } finally {
          setIsAttaching(false);
        }
      }
      
      setIsEditMode(false);
      setUpdateGoogleDoc(false); // Reset checkbox
      await fetchNote(); // Refresh data
      
      // Create actual tasks in the default project for checked tasks
      const tasksToCreate = validTasks.filter(task => 
        task.createInProject === true && 
        task.owner === user?.email &&
        !task.createdTaskId // Don't recreate if already created
      );
      
      if (tasksToCreate.length > 0 && settings?.defaultProjectId) {
        const createPromises = tasksToCreate.map(async (noteTask) => {
          try {
            const noteUrl = `${window.location.origin}/notes/${noteId}`;
            const taskData = {
              title: noteTask.title,
              description: `<p>Created from note: <a href="${noteUrl}" target="_blank" rel="noopener noreferrer">${title}</a></p>`,
              status: 'todo',
              priority: 'medium',
              owner: noteTask.owner,
              deadline: noteTask.deadline,
              projectId: settings.defaultProjectId,
              links: [],
            };
            
            const taskRes = await authenticatedFetch('/api/tasks', {
              method: 'POST',
              body: JSON.stringify(taskData),
            });
            
            if (taskRes.ok) {
              const createdTask = await taskRes.json();
              // Update the note task with the created task ID
              noteTask.createdTaskId = createdTask.id;
            }
          } catch (error) {
            logger.error('Failed to create task from note', error as Error, {
              noteId: Array.isArray(params.id) ? params.id[0] : params.id,
              userId: user?.uid,
            });
          }
        });
        
        await Promise.all(createPromises);
        
        if (tasksToCreate.length > 0) {
          // Update the note with the task IDs
          await authenticatedFetch(`/api/notes/${noteId}`, {
            method: 'PUT',
            body: JSON.stringify({ tasks: validTasks }),
          });
          
          showToast({
            type: 'success',
            title: 'Tasks created',
            message: `${tasksToCreate.length} task${tasksToCreate.length === 1 ? '' : 's'} created in your default project`,
            duration: 4000,
          });
        }
      }
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
          logger.error('Failed to delete note', error as Error, {
            noteId: Array.isArray(params.id) ? params.id[0] : params.id,
            userId: user?.uid,
          });
          setAlertDialog({
            isOpen: true,
            title: 'Error',
            message: 'Failed to delete note. Please try again.',
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
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const updatedTask = { ...task, ...updates };
        // Auto-check createInProject when owner is set to current user
        if (updates.owner === user?.email && task.owner !== user?.email) {
          updatedTask.createInProject = true;
        }
        // Uncheck if owner is changed away from current user
        if (updates.owner && updates.owner !== user?.email) {
          updatedTask.createInProject = false;
        }
        return updatedTask;
      }
      return task;
    }));
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
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Link
                href="/notes"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                title="Back to notes"
              >
                <ArrowLeft size={20} style={{ color: 'var(--color-text)' }} />
              </Link>
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="min-w-0 max-w-md relative">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Note title..."
                    disabled={!isEditMode}
                    className="text-2xl font-semibold bg-transparent border-none focus:outline-none w-full pr-8"
                    style={{ color: 'var(--color-text)' }}
                  />
                  {/* Fade overlay when title is long */}
                  {!isEditMode && title.length > 30 && (
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none"
                      style={{
                        background: 'linear-gradient(to left, var(--color-surface) 0%, transparent 100%)'
                      }}
                    />
                  )}
                </div>
                {note?.calendarEventData && (
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Calendar size={14} className="text-blue-600 flex-shrink-0" />
                    
                    {/* 2x2 Grid Layout */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 items-center text-sm">
                      {/* Row 1, Col 1: Date/Time */}
                      <a
                        href={note.calendarEventData.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-700 hover:text-blue-600 hover:underline transition-colors whitespace-nowrap"
                      >
                        {format(toZonedTime(new Date(note.calendarEventData.start), userTimezone), 'dd.MM.yyyy, HH:mm')}
                      </a>
                      
                      {/* Row 1, Col 2: Change Meeting */}
                      <a
                        href={note.calendarEventData.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline whitespace-nowrap"
                      >
                        Change meeting
                      </a>
                      
                      {/* Row 2, Col 1: Attendees */}
                      <div className="relative group">
                        {note.calendarEventData.attendees && note.calendarEventData.attendees.length > 0 && (
                          <>
                            <span className="text-gray-600 cursor-help whitespace-nowrap">{note.calendarEventData.attendees.length} attendees</span>
                            
                            {/* Hover Tooltip */}
                            <div className="absolute top-full left-0 mt-2 hidden group-hover:block z-50 w-64">
                              <div className="bg-white rounded-lg shadow-lg border p-3" style={{ borderColor: 'var(--color-border)' }}>
                                <div className="text-xs font-semibold mb-2 text-gray-700">Attendees</div>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                  {note.calendarEventData.attendees.map((attendee, index) => (
                                    <div key={index} className="flex items-center justify-between text-xs">
                                      <span className="text-gray-900">{attendee.displayName || attendee.email}</span>
                                      <span 
                                        className="px-1.5 py-0.5 rounded text-[10px] font-medium"
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
                                        {attendee.responseStatus === 'accepted' ? '✓ Yes' :
                                         attendee.responseStatus === 'declined' ? '✗ No' :
                                         attendee.responseStatus === 'tentative' ? '? Maybe' :
                                         '⋯ No response'}
                                        {attendee.organizer && ' (Organizer)'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Row 2, Col 2: Join Meeting */}
                      <div>
                        {(note.calendarEventData.hangoutLink || note.calendarEventData.conferenceData?.entryPoints?.[0]?.uri) && (
                          <a
                            href={note.calendarEventData.hangoutLink || note.calendarEventData.conferenceData?.entryPoints?.[0]?.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline whitespace-nowrap"
                          >
                            Join Meeting
                          </a>
                        )}
                      </div>
                    </div>
                    
                    {/* Google Doc Badge - Outside the grid */}
                    {note.googleDocId && note.googleDocUrl && (
                      <a
                        href={note.googleDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium hover:opacity-80 transition-opacity whitespace-nowrap"
                        style={{ backgroundColor: '#dcfce7', color: '#166534' }}
                        title="Open Google Doc"
                      >
                        📄 Google Doc
                      </a>
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
              people={people}
            />
          </div>

          {/* Tasks Section */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            {tasks.length === 0 ? (
              <div
                onClick={() => isEditMode && addTask()}
                className={`text-sm text-gray-500 text-center py-3 px-6 border-2 border-dashed rounded-lg m-6 flex items-center justify-center gap-2 ${isEditMode ? 'cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-colors' : ''}`}
                style={{ borderColor: 'var(--color-border)' }}
              >
                {isEditMode ? (
                  <>
                    <Plus size={16} className="text-gray-400" />
                    <p>Click here to create your first task</p>
                  </>
                ) : (
                  <p>No tasks yet.</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b" style={{ backgroundColor: '#f8fafc', borderColor: 'var(--color-border)' }}>
                      {isEditMode && (
                        <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748b', width: '5%' }} title="Create task in default project">
                          📋
                        </th>
                      )}
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748b', width: '50%' }}>
                        Task Title
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748b', width: '25%' }}>
                        Owner
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748b', width: '20%' }}>
                        Deadline
                      </th>
                      {isEditMode && (
                        <th className="px-4 py-2.5" style={{ width: '5%' }}></th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task, index) => {
                      // Check if this task is assigned to the current user
                      const isMyTask = user?.email && task.owner === user.email;
                      
                      return (
                      <tr
                        key={task.id}
                        className="border-b hover:bg-gray-50 transition-colors"
                        style={{ borderColor: '#f1f5f9' }}
                      >
                        {isEditMode && (
                          <td className="px-4 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={!!(task.createInProject !== false && isMyTask)}
                              onChange={(e) => updateTask(task.id, { createInProject: e.target.checked })}
                              disabled={!isMyTask}
                              className="w-4 h-4 rounded border-gray-300"
                              title={isMyTask ? "Create this task in your default project" : "Only your own tasks can be created in projects"}
                            />
                          </td>
                        )}
                        <td className="px-4 py-2">
                          <input
                            ref={(el) => { taskInputRefs.current[task.id] = el; }}
                            type="text"
                            value={task.title}
                            onChange={(e) => updateTask(task.id, { title: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey && isEditMode && index === tasks.length - 1) {
                                e.preventDefault();
                                addTask();
                              }
                            }}
                            placeholder="Task title..."
                            disabled={!isEditMode}
                            className="dense-table-input w-full px-2.5 py-1.5 border rounded-md text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <OwnerSelector
                            value={task.owner}
                            onChange={(value) => updateTask(task.id, { owner: value })}
                            people={people}
                            disabled={!isEditMode}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <DatePicker
                            selected={task.deadline ? new Date(task.deadline) : null}
                            onChange={(date: Date | null) => updateTask(task.id, { deadline: date ? date.toISOString().split('T')[0] : null })}
                            dateFormat="dd.MM.yyyy"
                            placeholderText="dd.mm.yyyy"
                            className="w-full px-2.5 py-1.5 border rounded-md text-sm"
                            wrapperClassName="w-full"
                            calendarClassName="modern-calendar"
                            popperClassName="datepicker-popper"
                            disabled={!isEditMode}
                            isClearable
                          />
                        </td>
                        {isEditMode && (
                          <td className="px-4 py-2">
                            <button
                              onClick={() => removeTask(task.id)}
                              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                              title="Remove task"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Add Row - Dashed Border Row */}
            {isEditMode && tasks.length > 0 && (
              <div
                onClick={addTask}
                className="border-t-2 border-dashed px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm text-gray-500"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <Plus size={16} />
                <span>Click here or press Enter to add another task</span>
              </div>
            )}
          </div>

          {/* Previous Meeting Section - Only show if there's a previous note */}
          {previousNote && (
            <PreviousMeetingSection 
              previousNote={previousNote}
              userTimezone={userTimezone}
            />
          )}

          {/* Create/Update Google Doc Checkbox - Only show when editing and calendar event is linked */}
          {isEditMode && note?.calendarEventData && (
            <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={updateGoogleDoc}
                  onChange={(e) => setUpdateGoogleDoc(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 group-hover:text-gray-700 transition-colors">
                    {hasGoogleDocAttached 
                      ? 'Update existing Google Doc with latest changes'
                      : 'Create and attach Google Doc to calendar event'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {hasGoogleDocAttached ? (
                      <>
                        The Google Doc will be updated with your latest note content.
                        {note.googleDocUrl && (
                          <> <a 
                            href={note.googleDocUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View document →
                          </a></>
                        )}
                      </>
                    ) : (
                      isOrganizer 
                        ? 'A Google Doc will be created and linked to the calendar event description. All attendees will have comment access.'
                        : 'A Google Doc will be created and shared with all attendees. You are not the organizer, so it cannot be added to the event description.'
                    )}
                  </div>
                </div>
              </label>
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
