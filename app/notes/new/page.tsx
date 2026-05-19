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
import { useUserSettings } from '@/hooks/useUserSettings';
import TipTapEditor from '@/components/TipTapEditor';
import AuthGuard from '@/components/AuthGuard';
import UserProfile from '@/components/UserProfile';
import CalendarEventSelector from '@/components/CalendarEventSelector';
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

function NewNotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { settings } = useUserSettings();
  
  const [title, setTitle] = useState('');
  const [agendaItems, setAgendaItems] = useState<string[]>(['', '', '']);
  const [content, setContent] = useState('');
  const [tasks, setTasks] = useState<NoteTask[]>([]);
  const [templateId, setTemplateId] = useState('default');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
  const [showCalendarSelector, setShowCalendarSelector] = useState(false);
  const [sendToSlack, setSendToSlack] = useState(true); // Default: checked
  const [previousNotes, setPreviousNotes] = useState<Note[]>([]);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const { showToast, updateToast } = useToast();
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'success' | 'warning' | 'info' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });
  const taskInputRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});
  const { people } = usePeopleData();

  // Get timezone from cached settings
  const userTimezone = settings?.timezone || DEFAULT_TIMEZONE;

  // Load notes template from settings on mount
  useEffect(() => {
    if (settings?.noteTemplate && typeof settings.noteTemplate === 'string') {
      setContent(settings.noteTemplate);
    } else {
      setContent('<ul><li><p></p></li></ul>');
    }
  }, [settings]);

  // Show calendar selector on mount if no event is pre-selected
  useEffect(() => {
    const eventParam = searchParams.get('event');
    if (!eventParam) {
      setShowCalendarSelector(true);
    }
  }, [searchParams]);

  const handleCalendarEventSelected = async (event: CalendarEvent | null) => {
    logger.debug('Calendar event selected for new note', { 
      eventId: event?.id,
      summary: event?.summary 
    });
    
    if (event) {
      // Check if a note already exists for this calendar event
      try {
        const res = await authenticatedFetch(`/api/notes?calendarEventId=${encodeURIComponent(event.id)}`);
        
        if (res.ok) {
          const data = await res.json();
          const existingNotes = data.notes || [];
          
          // If a note exists for this event, redirect to it
          if (existingNotes.length > 0) {
            const existingNote = existingNotes[0];
            logger.debug('Found existing note for calendar event, redirecting', {
              noteId: existingNote.id,
              eventId: event.id,
            });
            
            showToast({
              type: 'info',
              title: 'Note already exists',
              message: 'Opening existing note for this meeting',
              duration: 3000,
            });
            
            // Redirect to existing note
            router.push(`/notes/${existingNote.id}`);
            return;
          }
        }
      } catch (error) {
        logger.error('Error checking for existing note', error as Error, {
          eventId: event.id,
          userId: user?.uid,
        });
        // Continue with note creation if check fails
      }
    }
    
    setSelectedCalendarEvent(event);
    setShowCalendarSelector(false);
    if (event) {
      setTitle(event.summary);
      
      // Check if this is a recurring event and fetch previous note
      const recurringEventId = event.recurringEventId;
      const instanceDate = event.start;
      
      if (recurringEventId && instanceDate) {
        setIsLoadingPrevious(true);
        logger.debug('Fetching previous note for recurring event', {
          recurringEventId,
          instanceDate,
        });
        try {
          const url = `/api/notes/previous?recurringEventId=${encodeURIComponent(recurringEventId)}&instanceDate=${encodeURIComponent(instanceDate)}`;
          
          const res = await authenticatedFetch(url);
          
          if (res.ok) {
            const data = await res.json();
            logger.debug('Previous notes fetched', { count: data.previousNotes?.length ?? 0 });
            setPreviousNotes(data.previousNotes || []);
          }
        } catch (error) {
          logger.error('Error fetching previous note for recurring event', error as Error, {
            recurringEventId,
            instanceDate,
            userId: user?.uid,
          });
          // Silently fail - not critical
        } finally {
          setIsLoadingPrevious(false);
        }
      } else {
        // Not a recurring event, clear previous note
        setPreviousNotes([]);
      }
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
      // Extract recurring event info if calendar event is selected
      let recurringEventId = null;
      let recurringInstanceDate = null;
      if (selectedCalendarEvent) {
        // Get recurringEventId from the calendar event (if it exists)
        recurringEventId = selectedCalendarEvent.recurringEventId || null;
        // Use the event's start time as the instance date
        recurringInstanceDate = selectedCalendarEvent.start || null;
      }

      // Filter out tasks with empty titles
      const validTasks = tasks.filter(task => task.title.trim() !== '');

      // Strip agenda if the user left all items empty
      const nonEmptyAgendaItems = agendaItems.filter(item => item.trim() !== '');
      const savedAgenda = nonEmptyAgendaItems.length > 0
        ? JSON.stringify(nonEmptyAgendaItems)
        : '';

      const noteData: Partial<Note> = {
        title: title.trim(),
        agenda: savedAgenda,
        content,
        tasks: validTasks,
        templateId,
        calendarEventId: selectedCalendarEvent?.id || null,
        calendarEventLink: selectedCalendarEvent?.htmlLink || null,
        calendarEventData: selectedCalendarEvent || null,
        recurringEventId,
        recurringInstanceDate,
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

      // Create actual tasks in the default project for checked tasks
      const tasksToCreate = validTasks.filter(task => 
        task.createInProject === true && 
        task.owner === user?.email
      );
      
      if (tasksToCreate.length > 0 && settings?.defaultProjectId) {
        const createPromises = tasksToCreate.map(async (noteTask) => {
          try {
            const noteUrl = `${window.location.origin}/notes/${newNote.id}`;
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
            logger.error('Failed to create task from new note', error as Error, {
              userId: user?.uid,
              calendarEventId: selectedCalendarEvent?.id,
            });
          }
        });
        
        await Promise.all(createPromises);
        
        if (tasksToCreate.length > 0) {
          // Update the note with the task IDs
          await authenticatedFetch(`/api/notes/${newNote.id}`, {
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

      // Auto-attach to calendar if event is selected AND user wants to create doc
      // (Google Doc creation removed - using in-app note URL instead)
      
      // Send Slack notifications if enabled and calendar event is selected
      if (selectedCalendarEvent && sendToSlack && selectedCalendarEvent.attendees) {
        const attendees = selectedCalendarEvent.attendees
          .filter(a => !a.resource && a.email) // Filter out meeting rooms/resources
          .map(attendee => ({
            email: attendee.email,
            tasks: validTasks.filter(task => task.owner === attendee.email),
          }));

        if (attendees.length > 0) {
          const slackToastId = showToast({
            type: 'loading',
            title: 'Sending Slack notifications',
            message: `Notifying ${attendees.length} attendee${attendees.length !== 1 ? 's' : ''}...`,
            duration: 0,
          });

          // Fire and forget - run in background
          authenticatedFetch('/api/slack/send-note', {
            method: 'POST',
            body: JSON.stringify({
              noteTitle: title,
              noteContent: content,
              noteUrl: `${window.location.origin}/notes/${newNote.id}`,
              meetingDate: selectedCalendarEvent.start,
              allTasks: validTasks,
              attendees,
            }),
          }).then(async slackRes => {
            if (slackRes.ok) {
              const data = await slackRes.json();
              const { summary } = data;
              
              if (summary.failed === 0) {
                updateToast(slackToastId, {
                  type: 'success',
                  title: 'Slack notifications sent',
                  message: `Successfully notified ${summary.successful} attendee${summary.successful !== 1 ? 's' : ''}`,
                  duration: 5000,
                });
              } else {
                updateToast(slackToastId, {
                  type: 'error',
                  title: 'Slack notifications partially sent',
                  message: `${summary.successful} succeeded, ${summary.failed} failed`,
                  duration: 5000,
                });
              }
            } else {
              updateToast(slackToastId, {
                type: 'error',
                title: 'Slack notifications failed',
                message: 'Could not send Slack messages',
                duration: 5000,
              });
            }
          }).catch(() => {
            updateToast(slackToastId, {
              type: 'error',
              title: 'Slack notifications failed',
              message: 'An error occurred while sending notifications',
              duration: 5000,
            });
          });
        }
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
                  <div className="flex items-center gap-3">
                    <Calendar size={14} className="text-blue-600 flex-shrink-0" />
                    
                    {/* 2x2 Grid Layout */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 items-center text-sm">
                      {/* Row 1, Col 1: Date/Time */}
                      <a
                        href={selectedCalendarEvent.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-700 hover:text-blue-600 hover:underline transition-colors whitespace-nowrap"
                      >
                        {format(toZonedTime(new Date(selectedCalendarEvent.start), userTimezone), 'dd.MM.yyyy, HH:mm')}
                      </a>
                      
                      {/* Row 1, Col 2: Change button */}
                      <div>
                        <button
                          onClick={() => setShowCalendarSelector(true)}
                          className="text-blue-600 hover:underline whitespace-nowrap"
                        >
                          Change meeting
                        </button>
                      </div>
                      
                      {/* Row 2, Col 1: Attendees */}
                      <div className="relative group">
                        {selectedCalendarEvent.attendees && selectedCalendarEvent.attendees.length > 0 && (
                          <>
                            <span className="text-gray-600 cursor-help whitespace-nowrap">{selectedCalendarEvent.attendees.length} attendees</span>
                            
                            {/* Hover Tooltip */}
                            <div className="absolute top-full left-0 mt-2 hidden group-hover:block z-50 w-64">
                              <div className="bg-white rounded-lg shadow-lg border p-3" style={{ borderColor: 'var(--color-border)' }}>
                                <div className="text-xs font-semibold mb-2 text-gray-700">Attendees</div>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                  {selectedCalendarEvent.attendees.map((attendee, index) => (
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
                        {(selectedCalendarEvent.hangoutLink || selectedCalendarEvent.conferenceData?.entryPoints?.[0]?.uri) && (
                          <a
                            href={selectedCalendarEvent.hangoutLink || selectedCalendarEvent.conferenceData?.entryPoints?.[0]?.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline whitespace-nowrap"
                          >
                            Join Meeting
                          </a>
                        )}
                      </div>
                    </div>
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
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-7 py-8">
        <div className="space-y-4">
          {/* Agenda Section */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="px-6 pb-4 pt-4 space-y-2">
              {agendaItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-gray-400 select-none" style={{ fontSize: '0.6rem' }}>●</span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const updated = [...agendaItems];
                      updated[index] = e.target.value;
                      setAgendaItems(updated);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const updated = [...agendaItems];
                        updated.splice(index + 1, 0, '');
                        setAgendaItems(updated);
                      }
                      if (e.key === 'Backspace' && item === '' && agendaItems.length > 1) {
                        e.preventDefault();
                        const updated = agendaItems.filter((_, i) => i !== index);
                        setAgendaItems(updated);
                      }
                    }}
                    placeholder={`Agenda point ${index + 1}...`}
                    className="flex-1 px-2.5 py-1.5 border rounded-md text-sm bg-white focus:outline-none focus:ring-1"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  {agendaItems.length > 1 && (
                    <button
                      onClick={() => setAgendaItems(agendaItems.filter((_, i) => i !== index))}
                      className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                      title="Remove"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setAgendaItems([...agendaItems, ''])}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors pt-1"
              >
                <Plus size={12} />
                <span>Add point</span>
              </button>
            </div>
          </div>

          {/* Notes Section */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="px-6 pb-5 pt-5">
              <TipTapEditor
                value={content}
                onChange={setContent}
                placeholder="Start taking notes..."
                disabled={false}
                people={people}
              />
            </div>
          </div>

          {/* Tasks Section */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            {tasks.length === 0 ? (
              <div
                onClick={addTask}
                className="text-sm text-gray-400 text-center py-2 px-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <Plus size={14} className="text-gray-400" />
                <span>Click here to create your first task</span>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b" style={{ backgroundColor: '#f8fafc', borderColor: 'var(--color-border)' }}>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748b', width: '55%' }}>
                        Task Title
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748b', width: '25%' }}>
                        Owner
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748b', width: '20%' }}>
                        Deadline
                      </th>
                      <th className="px-4 py-2.5" style={{ width: '5%' }}></th>
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
                        <td className="px-4 py-2">
                          <textarea
                            ref={(el) => { taskInputRefs.current[task.id] = el; }}
                            value={task.title}
                            onChange={(e) => {
                              updateTask(task.id, { title: e.target.value });
                              e.target.style.height = 'auto';
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey && index === tasks.length - 1) {
                                e.preventDefault();
                                addTask();
                              }
                            }}
                            placeholder="Task title..."
                            rows={1}
                            className="dense-table-input w-full px-2.5 py-1.5 border rounded-md text-sm resize-none overflow-hidden"
                          ></textarea>
                        </td>
                        <td className="px-4 py-2">
                          <OwnerSelector
                            value={task.owner}
                            onChange={(value) => updateTask(task.id, { owner: value })}
                            people={people}
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
                            isClearable
                          />
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => removeTask(task.id)}
                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                            title="Remove task"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Add Row - Dashed Border Row */}
            {tasks.length > 0 && (
              <div
                onClick={addTask}
                className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm text-gray-500"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <Plus size={16} />
                <span>Click here or press Enter to add another task</span>
              </div>
            )}
          </div>

          {/* Previous Meeting Section - Show loading state or previous notes */}
          {selectedCalendarEvent && (isLoadingPrevious || previousNotes.length > 0) && (
            isLoadingPrevious ? (
              <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="px-6 py-8 flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 mb-3" style={{ borderColor: 'var(--color-primary)' }}></div>
                  <p className="text-sm text-gray-600">Loading previous meeting notes...</p>
                </div>
              </div>
            ) : (
              <PreviousMeetingSection
                previousNotes={previousNotes}
                userTimezone={userTimezone}
              />
            )
          )}

          {/* Slack Checkbox - Only show when calendar event is selected */}
          {selectedCalendarEvent && (
            <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={sendToSlack}
                  onChange={(e) => setSendToSlack(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 group-hover:text-gray-700 transition-colors">
                    Send summary to attendees on Slack
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedCalendarEvent.attendees && selectedCalendarEvent.attendees.filter(a => !a.resource).length > 0
                      ? `Send meeting notes and assigned tasks to ${selectedCalendarEvent.attendees.filter(a => !a.resource).length} attendee${selectedCalendarEvent.attendees.filter(a => !a.resource).length !== 1 ? 's' : ''} via Slack`
                      : 'No attendees to notify'}
                  </div>
                </div>
              </label>
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
