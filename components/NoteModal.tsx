/**
 * Note Modal Component
 * Editor for meeting notes with single rich text field and task extraction
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Save, Calendar, Link as LinkIcon, FileText, Plus, Trash2, Edit, ChevronDown } from 'lucide-react';
import { Note, NoteTemplate, NoteTask, CalendarEvent, Project } from '@/types';
import TipTapEditor from './TipTapEditor';
import ConfirmDialog from './ConfirmDialog';
import AlertDialog from './AlertDialog';
import MeetingSelectorDropdown from './MeetingSelectorDropdown';
import { authenticatedFetch } from '@/lib/api-client';

interface NoteModalProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteData: Partial<Note>) => Promise<string>; // Returns note ID
  templates: NoteTemplate[];
  projects: Project[];
  calendarEvent?: CalendarEvent | null;
  defaultProjectId?: string;
  readOnly?: boolean;
}

export default function NoteModal({
  note,
  isOpen,
  onClose,
  onSave,
  templates,
  projects,
  calendarEvent,
  defaultProjectId,
  readOnly = false,
}: NoteModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tasks, setTasks] = useState<NoteTask[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState('default');
  const [isSaving, setIsSaving] = useState(false);
  const [attachToCalendar, setAttachToCalendar] = useState(true);
  const [isEditMode, setIsEditMode] = useState(!readOnly);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showMeetingSelector, setShowMeetingSelector] = useState(false);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(calendarEvent || null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'success' | 'warning' | 'info' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const currentTemplate = templates.find(t => t.id === templateId) || templates[0];

  const handleChangeMeeting = (newEvent: CalendarEvent | null) => {
    setSelectedCalendarEvent(newEvent);
    if (newEvent) {
      setTitle(newEvent.summary);
    }
    setShowMeetingSelector(false);
  };

  // Initialize or reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsEditMode(!readOnly);
      // Reset alert dialog
      setAlertDialog({ isOpen: false, title: '', message: '', type: 'info' });
      
      if (note) {
        // Editing existing note
        setTitle(note.title);
        setContent(note.content);
        setTasks(note.tasks);
        setProjectId(note.projectId);
        setTemplateId(note.templateId);
      } else {
        // Creating new note - use template content
        setTitle(calendarEvent?.summary || '');
        const template = templates.find(t => t.id === templateId) || templates[0];
        setContent(template?.content || '');
        setTasks([]);
        setProjectId(defaultProjectId || null);
        setTemplateId('default');
      }
    }
  }, [isOpen, note, calendarEvent, defaultProjectId, readOnly, templates, templateId]);

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
        projectId,
        templateId,
        calendarEventId: note?.calendarEventId || selectedCalendarEvent?.id || calendarEvent?.id || null,
        calendarEventLink: note?.calendarEventLink || selectedCalendarEvent?.htmlLink || calendarEvent?.htmlLink || null,
      };

      // Save the note first and get the ID back
      const savedNoteId = await onSave(noteData);
      
      // If checkbox is enabled and note is linked to calendar, attach it
      if (attachToCalendar && (note?.calendarEventId || selectedCalendarEvent?.id || calendarEvent?.id)) {
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
          } else {
            setAlertDialog({
              isOpen: true,
              title: 'Note Saved',
              message: 'Note saved, but failed to attach to calendar event',
              type: 'warning',
            });
          }
        } catch (error) {
          console.warn('Failed to attach to calendar:', error);
          setAlertDialog({
            isOpen: true,
            title: 'Note Saved',
            message: 'Note saved successfully, but failed to attach to calendar event',
            type: 'warning',
          });
        }
      }
      
      setTimeout(() => {
        onClose();
      }, attachToCalendar && (note?.calendarEventId || selectedCalendarEvent?.id || calendarEvent?.id) ? 1500 : 0);
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

  const handleCreateTasks = async () => {
    if (!note?.id || !projectId) return;
    
    const tasksToCreate = tasks.filter(t => !t.createdTaskId && t.title.trim());
    
    setConfirmMessage(`Create ${tasksToCreate.length} task(s) in the selected project? This will add them to your task board.`);
    setConfirmAction(() => async () => {
      try {
        const res = await authenticatedFetch(`/api/notes/${note.id}/create-tasks`, {
          method: 'POST',
          body: JSON.stringify({ projectId }),
        });
        
        if (res.ok) {
          setAlertDialog({
            isOpen: true,
            title: 'Success',
            message: `${tasksToCreate.length} task(s) created successfully`,
            type: 'success',
          });
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch (error) {
        setAlertDialog({
          isOpen: true,
          title: 'Error',
          message: 'Failed to create tasks',
          type: 'error',
        });
      }
      setShowConfirm(false);
    });
    setShowConfirm(true);
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
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex-1 flex items-center gap-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title..."
                disabled={!isEditMode}
                className="flex-1 text-xl font-semibold bg-transparent border-none focus:outline-none"
                style={{ color: 'var(--color-text)' }}
              />
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Close"
            >
              <X size={20} style={{ color: 'var(--color-text)' }} />
            </button>
          </div>

          {/* Consolidated Toolbar */}
          <div
            className="px-6 py-3 border-b"
            style={{ borderColor: 'var(--color-border)', backgroundColor: '#f8fafc' }}
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* Left side - Project and Event */}
              <div className="flex items-center gap-4">
                {/* Project Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Project:</span>
                  <select
                    value={projectId || ''}
                    onChange={(e) => setProjectId(e.target.value || null)}
                    disabled={!isEditMode}
                    className="px-3 py-1.5 text-sm border rounded-md"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <option value="">No Project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.icon} {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Event Info or Link Button */}
                {selectedCalendarEvent || calendarEvent ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
                    <Calendar size={14} className="text-blue-600" />
                    <div className="text-sm">
                      <div className="font-medium text-blue-900">{(selectedCalendarEvent || calendarEvent)?.summary}</div>
                      <div className="text-xs text-blue-600">
                        {new Date((selectedCalendarEvent || calendarEvent)!.start).toLocaleString('de-DE', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Europe/Berlin'
                        })}
                      </div>
                    </div>
                    {isEditMode && (
                      <button
                        onClick={() => setShowMeetingSelector(true)}
                        className="ml-2 p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                        title="Change meeting"
                      >
                        <Edit size={14} />
                      </button>
                    )}
                  </div>
                ) : (
                  isEditMode && (
                    <button
                      onClick={() => setShowMeetingSelector(true)}
                      className="px-3 py-1.5 text-sm border-2 border-dashed rounded-md flex items-center gap-2 hover:bg-blue-50 transition-colors"
                      style={{ borderColor: '#3b82f6', color: '#3b82f6' }}
                    >
                      <Calendar size={14} />
                      <span>Link to Meeting</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

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
                  attendees={[]} // TODO: Extract from calendar event
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
                    No tasks yet. Click "Add Task" to create action items from this note.
                  </p>
                ) : (
                  <>
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
                                  style={{ 
                                    borderColor: 'var(--color-border)',
                                    backgroundColor: isEditMode ? '#ffffff' : '#f9fafb',
                                  }}
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
                                  style={{ 
                                    borderColor: 'var(--color-border)',
                                    backgroundColor: isEditMode ? '#ffffff' : '#f9fafb',
                                  }}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="date"
                                  value={task.deadline || ''}
                                  onChange={(e) => updateTask(task.id, { deadline: e.target.value || null })}
                                  disabled={!isEditMode}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                  style={{ 
                                    borderColor: 'var(--color-border)',
                                    backgroundColor: isEditMode ? '#ffffff' : '#f9fafb',
                                  }}
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
                    
                    {/* Create Tasks Button */}
                    {isEditMode && projectId && note?.id && tasks.some(t => !t.createdTaskId && t.title.trim()) && (
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          💡 Tasks will be created in your project's task board and linked back to this note
                        </p>
                        <button
                          onClick={handleCreateTasks}
                          className="px-4 py-2 text-sm rounded-md flex items-center gap-2 font-medium border-2 hover:bg-green-50 transition-colors"
                          style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                        >
                          <Plus size={16} />
                          Create {tasks.filter(t => !t.createdTaskId && t.title.trim()).length} Task(s) in Project
                        </button>
                      </div>
                    )}
                  </>
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
              {(note?.calendarEventId || selectedCalendarEvent || calendarEvent) && isEditMode && (
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
