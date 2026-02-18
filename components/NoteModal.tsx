/**
 * Note Modal Component
 * Editor for meeting notes with template sections and task extraction
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Save, Calendar, Link as LinkIcon, FileText, Plus, Trash2, Edit, ChevronDown } from 'lucide-react';
import { Note, NoteTemplate, NoteTask, CalendarEvent } from '@/types';
import TipTapEditor from './TipTapEditor';
import ConfirmDialog from './ConfirmDialog';
import AlertDialog from './AlertDialog';
import { authenticatedFetch } from '@/lib/api-client';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { DatePicker } from './ui';

interface NoteModalProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteData: Partial<Note>) => Promise<string>; // Returns note ID
  templates: NoteTemplate[];
  calendarEvent?: CalendarEvent | null;
  readOnly?: boolean;
}

export default function NoteModal({
  note,
  isOpen,
  onClose,
  onSave,
  templates,
  calendarEvent,
  readOnly = false,
}: NoteModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tasks, setTasks] = useState<NoteTask[]>([]);
  const [templateId, setTemplateId] = useState('default');
  const [isSaving, setIsSaving] = useState(false);
  const [attachToCalendar, setAttachToCalendar] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!readOnly);
  const [userTimezone, setUserTimezone] = useState(DEFAULT_TIMEZONE);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'success' | 'warning' | 'info' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const currentTemplate = templates.find(t => t.id === templateId) || templates[0];

  // Initialize or reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsEditMode(!readOnly);
      
      // Fetch user timezone
      (async () => {
        try {
          const token = await (await import('@/lib/firebase')).auth.currentUser?.getIdToken();
          const res = await fetch('/api/settings', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.timezone) {
              setUserTimezone(data.timezone);
            }
          }
        } catch (error) {
          // Use default timezone
        }
      })();
      
      if (note) {
        // Editing existing note
        setTitle(note.title);
        setContent(note.content);
        setTasks(note.tasks);
        setTemplateId(note.templateId);
      } else {
        // Creating new note - load user's saved template
        setTitle(calendarEvent?.summary || '');
        setTasks([]);
        setTemplateId('default');
        
        // Load template asynchronously
        (async () => {
          try {
            const token = await (await import('@/lib/firebase')).auth.currentUser?.getIdToken();
            const res = await fetch('/api/settings', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            if (res.ok) {
              const data = await res.json();
              if (data.noteTemplate) {
                setContent(data.noteTemplate);
              } else {
                // Use default template
                setContent(`AGENDA
• 

DISCUSSION & NOTES
• 

DECISIONS MADE
• 

ACTION ITEMS
• `);
              }
            }
          } catch (error) {
            // Use default on error
            setContent(`AGENDA
• 

DISCUSSION & NOTES
• 

DECISIONS MADE
• 

ACTION ITEMS
• `);
          }
        })();
      }
    }
  }, [isOpen, note, calendarEvent, readOnly, templates]);

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
        id: note?.id,
        title: title.trim(),
        content,
        tasks,
        templateId,
        calendarEventId: note?.calendarEventId || calendarEvent?.id || null,
        calendarEventLink: note?.calendarEventLink || calendarEvent?.htmlLink || null,
      };

      // Save the note first and get the ID back
      const savedNoteId = await onSave(noteData);
      
      // If checkbox is enabled and note is linked to calendar, attach it
      if (attachToCalendar && (note?.calendarEventId || calendarEvent?.id)) {
        try {
          const attachRes = await authenticatedFetch(`/api/notes/${savedNoteId}/attach-to-calendar`, {
            method: 'POST',
          });
          
          if (attachRes.ok) {
            setAlertDialog({
              isOpen: true,
              title: 'Success',
              message: 'Note saved and attached to calendar event as a Google Doc',
              type: 'success',
            });
            // Close after success message
            setTimeout(() => onClose(), 1500);
          } else {
            setAlertDialog({
              isOpen: true,
              title: 'Note Saved',
              message: 'Note saved, but failed to attach to calendar event. You may need to reconnect Google Calendar with Drive permissions.',
              type: 'warning',
            });
            // Don't auto-close - let user read the warning
          }
        } catch (error) {
          console.warn('Failed to attach to calendar:', error);
          setAlertDialog({
            isOpen: true,
            title: 'Note Saved',
            message: 'Note saved successfully, but failed to attach to calendar event. Check your Google Calendar connection.',
            type: 'warning',
          });
          // Don't auto-close - let user read the warning
        }
      } else {
        // No attachment needed, just close
        onClose();
      }
    } catch (error) {
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to save note. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTemplateChange = (newTemplateId: string) => {
    // Warn if there's content
    const hasContent = content.trim() && content !== currentTemplate?.content;
    
    if (hasContent) {
      setConfirmMessage('Switching templates will replace all current content. Are you sure?');
      setConfirmAction(() => () => {
        setTemplateId(newTemplateId);
        const newTemplate = templates.find(t => t.id === newTemplateId);
        setContent(newTemplate?.content || '');
        setShowConfirm(false);
      });
      setShowConfirm(true);
    } else {
      setTemplateId(newTemplateId);
      const newTemplate = templates.find(t => t.id === newTemplateId);
      setContent(newTemplate?.content || '');
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
  };

  const updateTask = (taskId: string, updates: Partial<NoteTask>) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  };

  const removeTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };


  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      >
        <div
          className="rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"
          style={{ backgroundColor: 'var(--color-surface)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="px-6 py-4 border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title..."
                disabled={!isEditMode}
                className="flex-1 text-xl font-semibold bg-transparent border-none focus:outline-none"
                style={{ color: 'var(--color-text)' }}
              />
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Close"
              >
                <X size={20} style={{ color: 'var(--color-text)' }} />
              </button>
            </div>
            
            {/* Meeting Info */}
            {(note?.calendarEventId || calendarEvent) && calendarEvent && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={14} className="text-blue-600" />
                <span className="font-medium">{calendarEvent.summary}</span>
                <span>•</span>
                <span>
                  {format(toZonedTime(new Date(calendarEvent.start), userTimezone), 'dd.MM.yyyy, HH:mm')}
                </span>
              </div>
            )}
          </div>

          {/* Consolidated Toolbar removed - meeting info now in header */}

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Stable Rich Text Editor */}
              <div>
                <TipTapEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Start taking notes..."
                  disabled={!isEditMode}
                  attendees={[]}
                />
              </div>

              {/* Tasks Section */}
              <div className="mt-8">
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
                  <p className="text-sm text-gray-500 text-center py-8 border-2 border-dashed rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
                    No tasks yet. {isEditMode && 'Click "Add Task" to create action items from this note.'}
                  </p>
                ) : (
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
                        {tasks.map((task) => (
                          <tr
                            key={task.id}
                            className="border-b"
                            style={{ borderColor: 'var(--color-border)' }}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={task.title}
                                onChange={(e) => updateTask(task.id, { title: e.target.value })}
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
                                placeholder="Owner..."
                                disabled={!isEditMode}
                                className="w-full px-2 py-1 border rounded text-sm"
                                style={{ borderColor: 'var(--color-border)' }}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <DatePicker
                                value={task.deadline || ''}
                                onChange={(date) => updateTask(task.id, { deadline: date })}
                                disabled={!isEditMode}
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
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-6 py-4 border-t"
            style={{ borderColor: 'var(--color-border)', backgroundColor: '#f8fafc' }}
          >
            <div className="flex items-center gap-3">
              {(note?.calendarEventId || calendarEvent) && !readOnly && (
                <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
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
                    <span>Attach to calendar event on save</span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isEditMode ? (
                <>
                  <button
                    onClick={onClose}
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
                    onClick={() => setIsEditMode(true)}
                    className="px-4 py-2 text-sm rounded-md flex items-center gap-2 text-white font-medium"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Edit size={16} />
                    Edit Note
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50 transition-colors"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmAction}
        title="Confirm Action"
        message={confirmMessage}
        type="warning"
      />

      {/* Alert Dialog */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
    </>
  );
}
