'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Plus, Trash2, Send, Edit2, Check, Share2 } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { Task, SubTask, TaskStatus, Priority, Comment, CustomField, StatusOption, PriorityOption } from '@/types';
import TipTapEditor from './TipTapEditor';
import AlertDialog from './AlertDialog';
import InputDialog from './InputDialog';
import ConfirmDialog from './ConfirmDialog';
import { debounce } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { authenticatedFetch } from '@/lib/api-client';
import { AUTO_SAVE_DELAY_MS, TOAST_DURATION_MS, DEFAULT_PROJECT_ICON } from '@/lib/constants';
import { logger } from '@/lib/logger';
import OwnerSelector from './OwnerSelector';
import { usePeopleData } from '@/hooks/usePeopleData';

interface TaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  onDelete?: (taskId: string) => void; // Optional callback for deletion
  onUpdate?: (taskId: string, updates: Partial<Task>) => void; // Optional callback for optimistic updates
  projects: { id: string; name: string }[];
  defaultProjectId?: string; // Add default project context
}

const priorityColors: Record<Priority, { bg: string; text: string; border: string }> = {
  high: { bg: '#fef2f2', text: '#f30047', border: '#fecaca' },
  medium: { bg: '#fffbeb', text: '#f6c400', border: '#fde68a' },
  low: { bg: '#f0fdf4', text: '#00a61c', border: '#bbf7d0' },
};

export default function TaskModal({ task, isOpen, onClose, onSave, onDelete, onUpdate, projects, defaultProjectId }: TaskModalProps) {
  const { user } = useAuth();
  const { people } = usePeopleData();
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    subTasks: [],
    deadline: null,
    status: 'todo',
    links: [],
    owner: '',
    projectId: '',
    priority: 'medium',
    tags: [],
    images: [],
    comments: [],
  });

  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [priorityOptions, setPriorityOptions] = useState<PriorityOption[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showShareToast, setShowShareToast] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'warning' | 'info' | 'success' }>({ isOpen: false, title: '', message: '', type: 'info' });
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  
  // Input dialog states
  const [inputDialog, setInputDialog] = useState<{ isOpen: boolean; title: string; placeholder: string; defaultValue: string; onConfirm: (value: string) => void }>({
    isOpen: false,
    title: '',
    placeholder: '',
    defaultValue: '',
    onConfirm: () => {},
  });

  // Save status tracking
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Refs to avoid stale closures
  const taskRef = useRef<Task | null>(task);
  const formDataRef = useRef<Partial<Task>>(formData);
  const saveInProgressRef = useRef(false);
  
  // Update refs when values change
  useEffect(() => {
    taskRef.current = task;
  }, [task]);
  
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Stable save function
  const saveTaskToServer = useCallback(async (data: Partial<Task>) => {
    if (!taskRef.current || saveInProgressRef.current) return;
    
    saveInProgressRef.current = true;
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // Ensure we're sending the complete task data with updates
      const taskToSave = {
        ...taskRef.current,
        ...data,
        id: taskRef.current.id, // Ensure ID is preserved
      };
      
      // Optimistically update the parent's task list immediately
      if (onUpdate && taskRef.current.id) {
        onUpdate(taskRef.current.id, data);
      }
      
      await authenticatedFetch(`/api/tasks/${taskRef.current.id}`, {
        method: 'PUT',
        body: JSON.stringify(taskToSave),
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      logger.error('Failed to auto-save task', error as Error, {
        taskId: taskRef.current?.id,
        userId: user?.uid,
      });
      setSaveError('Failed to save changes');
      setAlertDialog({
        isOpen: true,
        title: 'Save Failed',
        message: 'Your changes could not be saved. Please try again or check your connection.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
      saveInProgressRef.current = false;
    }
  }, [onUpdate]);

  // Debounced auto-save function with stable reference
  const debouncedSave = useRef(
    debounce((data: Partial<Task>) => {
      saveTaskToServer(data);
    }, AUTO_SAVE_DELAY_MS)
  ).current;
  
  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending debounced saves
      if (debouncedSave.cancel) {
        debouncedSave.cancel();
      }
    };
  }, [debouncedSave]);

  useEffect(() => {
    // Determine which project to fetch settings for
    const projectId = task?.projectId || defaultProjectId;
    
    if (projectId && isOpen) {
      authenticatedFetch(`/api/projects/${projectId}/settings`)
        .then(res => {
          if (res.ok) {
            return res.json();
          }
          throw new Error(`Failed to fetch settings: ${res.status}`);
        })
        .then(data => {
          if (data.statusOptions && Array.isArray(data.statusOptions)) {
            setStatusOptions(data.statusOptions);
          }
          if (data.priorityOptions && Array.isArray(data.priorityOptions)) {
            setPriorityOptions(data.priorityOptions);
          }
          if (data.customFields && Array.isArray(data.customFields)) {
            setCustomFields(data.customFields);
          }
        })
        .catch((error) => {
          logger.error('Failed to fetch project settings', error as Error, {
            projectId: task?.projectId || defaultProjectId,
          });
          // Use defaults if fetch fails
          setStatusOptions([
            { id: 'todo', label: 'To Do', color: 'var(--color-text-secondary)' },
            { id: 'in-progress', label: 'In Progress', color: '#f6c400' },
            { id: 'review', label: 'Review', color: '#3b82f6' },
            { id: 'done', label: 'Done', color: '#00a61c' },
          ]);
          setPriorityOptions([
            { id: 'low', label: 'Low', color: '#00a61c' },
            { id: 'medium', label: 'Medium', color: '#f6c400' },
            { id: 'high', label: 'High', color: '#f30047' },
          ]);
          setCustomFields([]);
        });
    }

    if (task) {
      setFormData(task);
    } else {
      // For new tasks, use the default project ID
      setFormData({
        title: '',
        description: '',
        subTasks: [],
        deadline: null,
        status: 'todo',
        links: [],
        owner: '',
        projectId: defaultProjectId || projects[0]?.id || '',
        priority: 'medium',
        tags: [],
        images: [],
        comments: [],
      });
    }
  }, [task, isOpen, defaultProjectId]);

  useEffect(() => {
    // Prevent body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        // Don't close if we're in edit mode for title or if dialogs are open
        if (!isEditingTitle && !alertDialog.isOpen && !inputDialog.isOpen && !deleteConfirmDialog) {
          handleClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [isOpen, isEditingTitle, alertDialog.isOpen, inputDialog.isOpen, deleteConfirmDialog]);

  // Update formData and trigger auto-save
  const updateFormData = (updates: Partial<Task>) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    setHasUnsavedChanges(true);
    debouncedSave(newData);
  };

  const handleClose = async () => {
    // Cancel any pending debounced saves
    if (debouncedSave.cancel) {
      debouncedSave.cancel();
    }
    
    // Force save if there are unsaved changes
    if (task && hasUnsavedChanges && !saveInProgressRef.current) {
      try {
        await saveTaskToServer(formDataRef.current);
      } catch (error) {
        // Show warning to user before closing
        setAlertDialog({
          isOpen: true,
          title: 'Unsaved Changes',
          message: 'Failed to save your changes. Do you want to close anyway?',
          type: 'warning',
        });
        return; // Don't close if save failed
      }
    }
    
    // Wait for any in-progress save to complete
    if (saveInProgressRef.current) {
      // Wait a bit for save to complete
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    onClose();
  };

  const handleShare = async () => {
    if (!task) return;
    
    // Create a shareable link with the task ID
    const shareUrl = `${window.location.origin}?taskId=${task.id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), TOAST_DURATION_MS);
    } catch (error) {
      logger.error('Failed to copy link to clipboard', error as Error, {
        taskId: task?.id,
      });
      // Fallback: show the URL in a custom alert
      setAlertDialog({
        isOpen: true,
        title: 'Share Task',
        message: `Copy this link to share:\n\n${shareUrl}`,
        type: 'info',
      });
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;

    setIsDeleting(true);

    try {
      const response = await authenticatedFetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete task');
      }

      logger.info('Task deleted successfully', { taskId: task.id });

      // Call the onDelete callback if provided
      if (onDelete) {
        onDelete(task.id);
      }

      // Close the modal
      onClose();
    } catch (error) {
      logger.error('Failed to delete task', error as Error, {
        taskId: task.id,
      });

      setAlertDialog({
        isOpen: true,
        title: 'Delete Failed',
        message: error instanceof Error ? error.message : 'Failed to delete task. Please try again.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) {
      // Only save on submit for new tasks
      onSave(formData);
      onClose();
    }
  };

  const addSubTask = () => {
    const newSubTask: SubTask = {
      id: crypto.randomUUID(),
      description: '',
      completed: false,
    };
    const updatedData = {
      ...formData,
      subTasks: [...(formData.subTasks || []), newSubTask],
    };
    setFormData(updatedData);
    setHasUnsavedChanges(true);
    
    // Auto-save
    if (task) {
      debouncedSave(updatedData);
    }
  };

  const updateSubTask = (id: string, updates: Partial<SubTask>) => {
    const updatedData = {
      ...formData,
      subTasks: formData.subTasks?.map(st =>
        st.id === id ? { ...st, ...updates } : st
      ),
    };
    setFormData(updatedData);
    setHasUnsavedChanges(true); // Fix: Was missing this line
    debouncedSave(updatedData);
  };

  const removeSubTask = (id: string) => {
    const updatedData = {
      ...formData,
      subTasks: formData.subTasks?.filter(st => st.id !== id),
    };
    setFormData(updatedData);
    setHasUnsavedChanges(true);
    
    // Auto-save
    if (task) {
      debouncedSave(updatedData);
    }
  };

  const addLink = () => {
    setInputDialog({
      isOpen: true,
      title: 'Add Link',
      placeholder: 'Enter URL',
      defaultValue: '',
      onConfirm: (url) => {
        const updatedData = {
          ...formData,
          links: [...(formData.links || []), url],
        };
        setFormData(updatedData);
        setHasUnsavedChanges(true);
        
        // Auto-save
        if (task) {
          debouncedSave(updatedData);
        }
      },
    });
  };

  const removeLink = (index: number) => {
    const updatedData = {
      ...formData,
      links: formData.links?.filter((_, i) => i !== index),
    };
    setFormData(updatedData);
    setHasUnsavedChanges(true);
    
    // Auto-save
    if (task) {
      debouncedSave(updatedData);
    }
  };

  const addTag = () => {
    setInputDialog({
      isOpen: true,
      title: 'Add Tag',
      placeholder: 'Enter tag name',
      defaultValue: '',
      onConfirm: (tag) => {
        const updatedData = {
          ...formData,
          tags: [...(formData.tags || []), tag],
        };
        setFormData(updatedData);
        setHasUnsavedChanges(true);
        
        // Auto-save
        if (task) {
          debouncedSave(updatedData);
        }
      },
    });
  };

  const removeTag = (index: number) => {
    const updatedData = {
      ...formData,
      tags: formData.tags?.filter((_, i) => i !== index),
    };
    setFormData(updatedData);
    setHasUnsavedChanges(true);
    
    // Auto-save
    if (task) {
      debouncedSave(updatedData);
    }
  };

  const addComment = () => {
    if (!newComment.trim()) return;
    
    const authorName = user?.displayName || user?.email || 'Anonymous';
    
    const comment: Comment = {
      id: crypto.randomUUID(),
      text: newComment,
      author: authorName,
      createdAt: new Date().toISOString(),
    };
    
    const updatedData = {
      ...formData,
      comments: [...(formData.comments || []), comment],
    };
    setFormData(updatedData);
    setNewComment('');
    setHasUnsavedChanges(true);
    
    // Auto-save
    if (task) {
      debouncedSave(updatedData);
    }
  };

  const removeComment = (id: string) => {
    const updatedData = {
      ...formData,
      comments: formData.comments?.filter(c => c.id !== id),
    };
    setFormData(updatedData);
    setHasUnsavedChanges(true);
    
    // Auto-save
    if (task) {
      debouncedSave(updatedData);
    }
  };

  const startEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
  };

  const saveEditComment = () => {
    if (!editingCommentId || !editingCommentText.trim()) return;
    
    const updatedData = {
      ...formData,
      comments: formData.comments?.map(c => 
        c.id === editingCommentId 
          ? { ...c, text: editingCommentText }
          : c
      ),
    };
    setFormData(updatedData);
    setEditingCommentId(null);
    setEditingCommentText('');
    setHasUnsavedChanges(true);
    
    // Auto-save
    if (task) {
      debouncedSave(updatedData);
    }
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const formatDateLocal = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const berlinDate = formatInTimeZone(date, 'Europe/Berlin', 'yyyy-MM-dd');
      return berlinDate;
    } catch {
      return '';
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center z-[100] p-4 overflow-y-auto"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        onClick={handleClose}
      >
      <div
        className="bg-surface rounded-lg w-full max-w-7xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          border: '1px solid #e2e8f0',
          zIndex: 101,
        }}
      >
        <div
          className="sticky top-0 bg-surface px-8 py-2 z-10"
          style={{ borderBottom: '2px solid #e2e8f0' }}
        >
          {/* Close button - absolutely positioned in top right */}
          <button
            onClick={handleClose}
            type="button"
            className="absolute top-2 right-2 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 hover:shadow-md transition-all cursor-pointer z-20"
            style={{ color: 'var(--color-text-secondary)' }}
            title="Close"
          >
            <X size={20} />
          </button>

          <div className="flex justify-between items-center pr-12">
            <div className="flex-1">
              {task ? (
                isEditingTitle ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => {
                      if (editingTitle.trim()) {
                        updateFormData({ title: editingTitle });
                      }
                      setIsEditingTitle(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingTitle.trim()) {
                          updateFormData({ title: editingTitle });
                        }
                        setIsEditingTitle(false);
                      } else if (e.key === 'Escape') {
                        setEditingTitle(formData.title || '');
                        setIsEditingTitle(false);
                      }
                    }}
                    autoFocus
                    className="text-base font-semibold mb-1 px-2 py-1 border-0 focus:outline-none w-full"
                    style={{ color: 'var(--color-text)', background: '#f8fafc', borderRadius: '4px' }}
                  />
                ) : (
                  <h2 
                    className="text-base font-semibold mb-1 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded inline-block" 
                    style={{ color: 'var(--color-text)' }}
                    onClick={() => {
                      setEditingTitle(formData.title || '');
                      setIsEditingTitle(true);
                    }}
                    title="Click to edit"
                  >
                    {formData.title || 'Untitled Task'}
                  </h2>
                )
              ) : (
                <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                  Create Task
                </h2>
              )}
              {task && (
                <div className="flex gap-3 text-xs px-2" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>Created {task.createdAt ? new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}</span>
                  <span>•</span>
                  <span>Last updated {task.updatedAt ? new Date(task.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }) : 'N/A'}</span>
                  {/* Save Status Indicator */}
                  {isSaving && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-primary)' }}>
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    </>
                  )}
                  {saveError && (
                    <>
                      <span>•</span>
                      <span className="text-xs" style={{ color: '#f30047' }} title={saveError}>
                        ⚠️ Save failed
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            {task && (
              <div className="flex items-center gap-6">
                <button
                  onClick={handleShare}
                  type="button"
                  className="flex items-center gap-2 px-3 py-1 rounded-md transition-colors hover:bg-gray-100"
                  style={{ color: 'var(--color-primary)' }}
                  title="Share task"
                >
                  <Share2 size={16} />
                  <span className="text-sm font-medium">Share</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteConfirmDialog(true);
                  }}
                  type="button"
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-3 py-1 rounded-md transition-colors hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: '#f30047' }}
                  title="Delete task"
                >
                  <Trash2 size={16} />
                  <span className="text-sm font-medium">
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </span>
                </button>
                <div className="flex gap-4">
                  {/* Days Left/Overdue - Only show if there's a deadline */}
                  {formData.deadline && (() => {
                    const daysRemaining = Math.ceil((new Date(formData.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const isOverdue = daysRemaining < 0;
                    const daysCount = Math.abs(daysRemaining);
                    
                    return (
                      <div className="text-center px-4 py-2 bg-surface border rounded-lg" style={{ borderColor: isOverdue ? '#fecaca' : 'var(--color-border)', backgroundColor: isOverdue ? '#fef2f2' : undefined }}>
                        {isOverdue ? (
                          <>
                            <div className="text-[10px] uppercase tracking-wide font-semibold mb-0.5" style={{ color: '#f30047' }}>Overdue</div>
                            <div className="text-sm font-bold" style={{ color: '#f30047' }}>
                              {daysCount} day{daysCount !== 1 ? 's' : ''}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
                              {daysCount}d
                            </div>
                            <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Left</div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 ml-6">
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content (2/3 width) */}
            <div className="lg:col-span-2 space-y-4">
              {/* Title - Only show for new tasks */}
              {!task && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    Title
                  </label>
                  <textarea
                    value={formData.title || ''}
                    onChange={(e) => {
                      updateFormData({ title: e.target.value });
                      // Auto-resize
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-all resize-none overflow-hidden"
                    style={{
                      borderColor: 'var(--color-border)',
                      minHeight: '42px',
                      maxHeight: '200px',
                    }}
                    onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px var(--color-primary)'}
                    onBlur={(e) => e.target.style.boxShadow = ''}
                    placeholder="Task title..."
                    rows={1}
                    required
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  Description
                </label>
                {isOpen && (
                  <TipTapEditor
                    key={task?.id || 'new-task'}
                    value={formData.description || ''}
                    onChange={(value) => updateFormData({ description: value })}
                    placeholder="Task description (supports rich text formatting and @mentions)"
                    people={people}
                    disabled={false}
                  />
                )}
              </div>

              {/* Sub-tasks - Table Format */}
              <div>
                <div className="flex items-center justify-between mb-3 pb-3" style={{ borderBottom: '2px solid #f1f5f9' }}>
                  <div className="flex items-center gap-4 flex-1">
                    <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text)', letterSpacing: '0.5px' }}>
                      Sub-tasks ({formData.subTasks?.length || 0})
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={addSubTask}
                    className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
                
                {formData.subTasks && formData.subTasks.length > 0 ? (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        {formData.subTasks.map((st, index) => (
                          <tr 
                            key={st.id}
                            style={{ 
                              borderBottom: index < (formData.subTasks?.length || 0) - 1 ? '1px solid #f1f5f9' : 'none',
                              transition: 'background 0.1s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#fafbfc'}
                            onMouseLeave={(e) => e.currentTarget.style.background = ''}
                          >
                            <td style={{ width: '40px', textAlign: 'center', padding: '12px 8px' }}>
                              <input
                                type="checkbox"
                                checked={st.completed}
                                onChange={(e) => updateSubTask(st.id, { completed: e.target.checked })}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                }}
                              />
                            </td>
                            <td style={{ padding: '12px 8px' }}>
                              <input
                                type="text"
                                value={st.description}
                                onChange={(e) => updateSubTask(st.id, { description: e.target.value })}
                                className="w-full px-2 py-1 border-0 focus:outline-none"
                                style={{
                                  fontSize: '14px',
                                  color: st.completed ? 'var(--color-text-secondary)' : '#0f172a',
                                  textDecoration: st.completed ? 'line-through' : 'none',
                                  background: 'transparent',
                                }}
                                placeholder="Sub-task description"
                              />
                            </td>
                            <td style={{ width: '40px', textAlign: 'center', padding: '12px 8px' }}>
                              <button
                                type="button"
                                onClick={() => removeSubTask(st.id)}
                                className="transition-colors"
                                style={{ 
                                  color: '#cbd5e1',
                                  width: '24px',
                                  height: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '4px',
                                  fontSize: '16px',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#fee';
                                  e.currentTarget.style.color = '#f30047';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '';
                                  e.currentTarget.style.color = '#cbd5e1';
                                }}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    No sub-tasks yet. Click &quot;Add&quot; to create one.
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                  Comments
                </label>
                
                {/* Existing Comments */}
                <div className="space-y-3 mb-3 max-h-60 overflow-y-auto">
                  {formData.comments && formData.comments.length > 0 ? (
                    formData.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="p-3 rounded-lg border"
                        style={{
                          backgroundColor: '#f8fafc',
                          borderColor: 'var(--color-border)',
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                              {comment.author}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {new Date(comment.createdAt).toLocaleString('de-DE', {
                                timeZone: 'Europe/Berlin',
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {editingCommentId !== comment.id && (
                              <button
                                type="button"
                                onClick={() => startEditComment(comment)}
                                className="transition-colors"
                                style={{ color: 'var(--color-primary)' }}
                                title="Edit comment"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeComment(comment.id)}
                              className="transition-colors"
                              style={{ color: '#f30047' }}
                              title="Delete comment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {editingCommentId === comment.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              className="w-full px-3 py-2 border rounded-md text-sm resize-none"
                              style={{
                                borderColor: 'var(--color-border)',
                              }}
                              rows={3}
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={cancelEditComment}
                                className="px-3 py-1 text-sm rounded-md border"
                                style={{
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text-secondary)',
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={saveEditComment}
                                className="px-3 py-1 text-sm rounded-md flex items-center gap-1"
                                style={{
                                  backgroundColor: 'var(--color-primary)',
                                  color: '#ffffff',
                                }}
                              >
                                <Check size={14} />
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {comment.text}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>
                      No comments yet
                    </p>
                  )}
                </div>

                {/* Add New Comment */}
                <div className="flex gap-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        addComment();
                      }
                    }}
                    className="flex-1 px-3 py-2 border rounded-md text-sm resize-none"
                    style={{
                      borderColor: 'var(--color-border)',
                    }}
                    placeholder="Add a comment... (Ctrl/Cmd + Enter to post)"
                    rows={2}
                  />
                  <button
                    type="button"
                    onClick={addComment}
                    className="px-4 py-2 rounded-md transition-colors flex items-center gap-2"
                    style={{
                      backgroundColor: '#009646',
                      color: '#ffffff',
                    }}
                    disabled={!newComment.trim()}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Metadata Sidebar */}
            <div>
              <div className="mb-3 pb-3" style={{ borderBottom: '2px solid #f1f5f9' }}>
                <span className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text)', letterSpacing: '0.5px' }}>
                  Details
                </span>
              </div>
              
              <div className="rounded-lg p-5" style={{ background: '#fafbfc', border: '1px solid #e2e8f0' }}>
                <div className="space-y-4">
                  {/* Project - Only show for new tasks */}
                  {!task && (
                    <div className="pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                        Project
                      </label>
                      <select
                        value={formData.projectId || ''}
                        onChange={(e) => updateFormData({ projectId: e.target.value })}
                        className="w-full px-3 py-2 border-0 rounded-md focus:outline-none text-sm font-medium"
                        style={{
                          background: '#ffffff',
                          color: 'var(--color-text)',
                        }}
                        required
                      >
                        <option value="">Select a project</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Project */}
                  <div className="pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                      Project
                    </label>
                    <select
                      value={formData.projectId || ''}
                      onChange={(e) => {
                        const newProjectId = e.target.value;
                        
                        // Reload project settings when project changes
                        if (newProjectId) {
                          authenticatedFetch(`/api/projects/${newProjectId}/settings`)
                            .then(res => {
                              if (!res.ok) throw new Error('Failed to fetch settings');
                              return res.json();
                            })
                            .then(data => {
                              const newStatusOptions = data.statusOptions || [];
                              const newPriorityOptions = data.priorityOptions || [];
                              const newCustomFields = data.customFields || [];

                              // Update options
                              if (Array.isArray(newStatusOptions)) {
                                setStatusOptions(newStatusOptions);
                              }
                              if (Array.isArray(newPriorityOptions)) {
                                setPriorityOptions(newPriorityOptions);
                              }
                              if (Array.isArray(newCustomFields)) {
                                setCustomFields(newCustomFields);
                              }

                              // Check if current field values exist in new project's options
                              const updatedFormData: Partial<Task> = { projectId: newProjectId };

                              // Clear status if it doesn't exist in new project
                              if (formData.status && !newStatusOptions.find((opt: StatusOption) => opt.id === formData.status)) {
                                updatedFormData.status = newStatusOptions[0]?.id || 'todo';
                                logger.info('Cleared incompatible status when moving to new project', {
                                  oldStatus: formData.status,
                                  newStatus: updatedFormData.status,
                                  newProjectId,
                                });
                              }

                              // Clear priority if it doesn't exist in new project
                              if (formData.priority && !newPriorityOptions.find((opt: PriorityOption) => opt.id === formData.priority)) {
                                updatedFormData.priority = newPriorityOptions[0]?.id || 'medium';
                                logger.info('Cleared incompatible priority when moving to new project', {
                                  oldPriority: formData.priority,
                                  newPriority: updatedFormData.priority,
                                  newProjectId,
                                });
                              }

                              // Clear custom fields if they don't exist in new project
                              // (Assuming customFields is an object with field IDs as keys)
                              // This would need to be adjusted based on your actual custom fields structure

                              // Apply all updates at once
                              updateFormData(updatedFormData);
                            })
                            .catch((error) => {
                              logger.error('Failed to fetch project settings after project change', error as Error, {
                                projectId: newProjectId,
                              });
                              // Still update the projectId even if settings fetch fails
                              updateFormData({ projectId: newProjectId });
                            });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-md focus:outline-none text-sm font-medium"
                      style={{
                        background: '#ffffff',
                        color: '#0f172a',
                        border: '2px solid var(--color-primary)',
                      }}
                    >
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div className="pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                      Status
                    </label>
                    <select
                      value={formData.status || (statusOptions[0]?.id || 'todo')}
                      onChange={(e) => updateFormData({ status: e.target.value as TaskStatus })}
                      className="w-full px-3 py-2 rounded-md focus:outline-none text-sm font-medium"
                      style={{
                        background: formData.status && statusOptions.find(s => s.id === formData.status)?.color 
                          ? `${statusOptions.find(s => s.id === formData.status)?.color}20` 
                          : '#ffffff',
                        color: formData.status && statusOptions.find(s => s.id === formData.status)?.color 
                          ? statusOptions.find(s => s.id === formData.status)?.color 
                          : '#0f172a',
                        border: `2px solid ${formData.status && statusOptions.find(s => s.id === formData.status)?.color ? statusOptions.find(s => s.id === formData.status)?.color : '#e2e8f0'}`,
                      }}
                    >
                      {statusOptions.length > 0 ? (
                        statusOptions.map(option => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="todo">To Do</option>
                          <option value="in-progress">In Progress</option>
                          <option value="review">Review</option>
                          <option value="done">Done</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                      Priority
                    </label>
                    <select
                      value={formData.priority || (priorityOptions[0]?.id || 'medium')}
                      onChange={(e) => updateFormData({ priority: e.target.value as Priority })}
                      className="w-full px-3 py-2 rounded-md focus:outline-none text-sm font-medium"
                      style={{
                        background: formData.priority && priorityOptions.find(p => p.id === formData.priority)?.color 
                          ? `${priorityOptions.find(p => p.id === formData.priority)?.color}20` 
                          : '#ffffff',
                        color: formData.priority && priorityOptions.find(p => p.id === formData.priority)?.color 
                          ? priorityOptions.find(p => p.id === formData.priority)?.color 
                          : '#0f172a',
                        border: `2px solid ${formData.priority && priorityOptions.find(p => p.id === formData.priority)?.color ? priorityOptions.find(p => p.id === formData.priority)?.color : '#e2e8f0'}`,
                      }}
                    >
                      {priorityOptions.length > 0 ? (
                        priorityOptions.map(option => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Deadline */}
                  <div className="pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={formatDateLocal(formData.deadline)}
                      onChange={(e) => updateFormData({ deadline: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="w-full px-3 py-2 border-0 rounded-md focus:outline-none text-sm font-medium"
                      style={{
                        background: '#ffffff',
                        color: 'var(--color-text)',
                      }}
                    />
                  </div>

                  {/* Owner */}
                  <div className="pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                      Owner
                    </label>
                    {isOpen && (
                      <OwnerSelector
                        key={`owner-${task?.id || 'new'}-${people.length}`}
                        value={formData.owner || ''}
                        onChange={(value) => updateFormData({ owner: value })}
                        people={people}
                        disabled={false}
                      />
                    )}
                  </div>

                  {/* Links */}
                  <div className="pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                        Links
                      </label>
                      <button
                        type="button"
                        onClick={addLink}
                        className="text-xs flex items-center gap-1 transition-colors"
                        style={{ color: '#009646' }}
                      >
                        <Plus size={14} />
                        Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formData.links?.map((link, idx) => {
                        // Handle both string links and object links {url, label}
                        interface LinkObject {
                          url?: string;
                          label?: string;
                        }
                        const linkUrl = typeof link === 'string' ? link : (link as LinkObject).url || '';
                        const linkLabel = typeof link === 'string' ? link : (link as LinkObject).label || linkUrl;
                        
                        return (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded-md" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
                            <a
                              href={linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 truncate transition-colors text-xs"
                              style={{
                                color: '#009646',
                              }}
                            >
                              {linkLabel}
                            </a>
                            <button
                              type="button"
                              onClick={() => removeLink(idx)}
                              className="transition-colors"
                              style={{ color: '#f30047' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                        Tags
                      </label>
                      <button
                        type="button"
                        onClick={addTag}
                        className="text-xs flex items-center gap-1 transition-colors"
                        style={{ color: '#009646' }}
                      >
                        <Plus size={14} />
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.tags?.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded-md text-xs flex items-center gap-1"
                          style={{
                            backgroundColor: 'var(--color-surface)',
                            color: 'var(--color-text)',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(idx)}
                            className="transition-colors"
                            style={{ color: '#f30047' }}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Custom Fields */}
                  {customFields.length > 0 && customFields.map((field) => (
                    <div key={field.id} className="pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                        {field.name} {field.required && <span style={{ color: '#f30047' }}>*</span>}
                      </label>
                      {field.type === 'text' && (
                        <input
                          type="text"
                          className="w-full px-3 py-2 border-0 rounded-md focus:outline-none text-sm font-medium"
                          style={{
                            background: '#ffffff',
                            color: 'var(--color-text)',
                          }}
                          placeholder={`Enter ${field.name.toLowerCase()}`}
                          required={field.required}
                        />
                      )}
                      {field.type === 'number' && (
                        <input
                          type="number"
                          className="w-full px-3 py-2 border-0 rounded-md focus:outline-none text-sm font-medium"
                          style={{
                            background: '#ffffff',
                            color: 'var(--color-text)',
                          }}
                          placeholder={`Enter ${field.name.toLowerCase()}`}
                          required={field.required}
                        />
                      )}
                      {field.type === 'date' && (
                        <input
                          type="date"
                          className="w-full px-3 py-2 border-0 rounded-md focus:outline-none text-sm font-medium"
                          style={{
                            background: '#ffffff',
                            color: 'var(--color-text)',
                          }}
                          required={field.required}
                        />
                      )}
                      {field.type === 'select' && field.options && (
                        <select
                          className="w-full px-3 py-2 border-0 rounded-md focus:outline-none text-sm font-medium"
                          style={{
                            background: '#ffffff',
                            color: 'var(--color-text)',
                          }}
                          required={field.required}
                        >
                          <option value="">Select {field.name.toLowerCase()}</option>
                          {field.options.map((option, idx) => (
                            <option key={idx} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {!task && (
            <div
              className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md transition-colors"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white rounded-md transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Create Task
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Share Toast Notification */}
      {showShareToast && (
        <div
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-surface border rounded-lg shadow-xl px-6 py-3 z-[110] flex items-center gap-2"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Check size={18} style={{ color: 'var(--color-primary)' }} />
          <span style={{ color: 'var(--color-text)' }}>Link copied to clipboard!</span>
        </div>
      )}
      
      {/* Alert Dialog */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
      
      <InputDialog
        isOpen={inputDialog.isOpen}
        onClose={() => setInputDialog({ ...inputDialog, isOpen: false })}
        onConfirm={inputDialog.onConfirm}
        title={inputDialog.title}
        placeholder={inputDialog.placeholder}
        defaultValue={inputDialog.defaultValue}
      />
    </div>

    {/* Delete Confirmation Dialog - Rendered outside modal with higher z-index */}
    {deleteConfirmDialog && (
      <div style={{ position: 'relative', zIndex: 150 }}>
        <ConfirmDialog
          isOpen={deleteConfirmDialog}
          onClose={() => {
            setDeleteConfirmDialog(false);
          }}
          onConfirm={() => {
            handleDeleteTask();
          }}
          title="Delete Task"
          message="Are you sure you want to delete this task? This action cannot be undone and all associated data will be permanently removed."
          confirmText="Delete Task"
          cancelText="Cancel"
          type="danger"
        />
      </div>
    )}
    </>
  );
}
