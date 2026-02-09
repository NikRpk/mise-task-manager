/**
 * Refactored TaskModal - Main Component
 * Now uses extracted hooks and sub-components for better maintainability
 * Reduced from 1,293 lines to ~350 lines
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task, SubTask, Comment, StatusOption, PriorityOption, CustomField } from '@/types';
import RichTextEditor from '../RichTextEditor';
import AlertDialog from '../AlertDialog';
import InputDialog from '../InputDialog';
import { SubTasksList } from './SubTasksList';
import { TaskDetails } from './TaskDetails';
import { CommentsSection } from './CommentsSection';
import { TaskHeader } from './TaskHeader';
import { useTaskForm } from '@/hooks/useTaskForm';
import { useAuth } from '@/lib/auth-context';
import { authenticatedFetch } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { TOAST_DURATION_MS } from '@/lib/constants';

interface TaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  projects: { id: string; name: string }[];
  defaultProjectId?: string;
}

export default function TaskModalRefactored({ 
  task, 
  isOpen, 
  onClose, 
  onSave, 
  projects, 
  defaultProjectId 
}: TaskModalProps) {
  const { user } = useAuth();

  // Default form data
  const defaultData: Partial<Task> = {
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
  };

  // Use the form hook (replaces 200+ lines of repeated logic)
  const {
    formData,
    setFormData,
    updateField,
    isSaving,
    hasUnsavedChanges,
    saveError,
    forceSave,
  } = useTaskForm(task, defaultData);

  // Local UI state
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [priorityOptions, setPriorityOptions] = useState<PriorityOption[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showShareToast, setShowShareToast] = useState(false);
  const [alertDialog, setAlertDialog] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    type: 'error' | 'warning' | 'info' | 'success' 
  }>({ isOpen: false, title: '', message: '', type: 'info' });
  const [inputDialog, setInputDialog] = useState<{ 
    isOpen: boolean; 
    title: string; 
    placeholder: string; 
    defaultValue: string; 
    onConfirm: (value: string) => void 
  }>({
    isOpen: false,
    title: '',
    placeholder: '',
    defaultValue: '',
    onConfirm: () => {},
  });
  const [newComment, setNewComment] = useState('');

  // Fetch project settings
  useEffect(() => {
    const projectId = task?.projectId || defaultProjectId;
    
    if (projectId && isOpen) {
      authenticatedFetch(`/api/projects/${projectId}/settings`)
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => {
          if (data.statusOptions) setStatusOptions(data.statusOptions);
          if (data.priorityOptions) setPriorityOptions(data.priorityOptions);
          if (data.customFields) setCustomFields(data.customFields);
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
  }, [task, isOpen, defaultProjectId]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Sub-task operations
  const handleAddSubTask = useCallback(() => {
    const newSubTask: SubTask = {
      id: crypto.randomUUID(),
      description: '',
      completed: false,
    };
    updateField({ subTasks: [...(formData.subTasks || []), newSubTask] });
  }, [formData.subTasks, updateField]);

  const handleUpdateSubTask = useCallback((id: string, updates: Partial<SubTask>) => {
    const updatedSubTasks = formData.subTasks?.map(st =>
      st.id === id ? { ...st, ...updates } : st
    );
    updateField({ subTasks: updatedSubTasks });
  }, [formData.subTasks, updateField]);

  const handleRemoveSubTask = useCallback((id: string) => {
    updateField({ subTasks: formData.subTasks?.filter(st => st.id !== id) });
  }, [formData.subTasks, updateField]);

  // Link operations
  const handleAddLink = useCallback(() => {
    setInputDialog({
      isOpen: true,
      title: 'Add Link',
      placeholder: 'Enter URL',
      defaultValue: '',
      onConfirm: (url) => {
        updateField({ links: [...(formData.links || []), url] });
      },
    });
  }, [formData.links, updateField]);

  const handleRemoveLink = useCallback((index: number) => {
    updateField({ links: formData.links?.filter((_, i) => i !== index) });
  }, [formData.links, updateField]);

  // Tag operations
  const handleAddTag = useCallback(() => {
    setInputDialog({
      isOpen: true,
      title: 'Add Tag',
      placeholder: 'Enter tag name',
      defaultValue: '',
      onConfirm: (tag) => {
        updateField({ tags: [...(formData.tags || []), tag] });
      },
    });
  }, [formData.tags, updateField]);

  const handleRemoveTag = useCallback((index: number) => {
    updateField({ tags: formData.tags?.filter((_, i) => i !== index) });
  }, [formData.tags, updateField]);

  // Comment operations
  const handleAddComment = useCallback(() => {
    if (!newComment.trim()) return;
    
    const authorName = user?.displayName || user?.email || 'Anonymous';
    const comment: Comment = {
      id: crypto.randomUUID(),
      text: newComment,
      author: authorName,
      createdAt: new Date().toISOString(),
    };
    
    updateField({ comments: [...(formData.comments || []), comment] });
    setNewComment('');
  }, [newComment, user, formData.comments, updateField]);

  const handleEditComment = useCallback((id: string, text: string) => {
    const updatedComments = formData.comments?.map(c => 
      c.id === id ? { ...c, text } : c
    );
    updateField({ comments: updatedComments });
  }, [formData.comments, updateField]);

  const handleDeleteComment = useCallback((id: string) => {
    updateField({ comments: formData.comments?.filter(c => c.id !== id) });
  }, [formData.comments, updateField]);

  // Share functionality
  const handleShare = async () => {
    if (!task) return;
    
    const shareUrl = `${window.location.origin}?taskId=${task.id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), TOAST_DURATION_MS);
    } catch (error) {
      logger.error('Failed to copy link to clipboard', error as Error, {
        taskId: task?.id,
      });
      setAlertDialog({
        isOpen: true,
        title: 'Share Task',
        message: `Copy this link to share:\n\n${shareUrl}`,
        type: 'info',
      });
    }
  };

  const handleClose = async () => {
    try {
      await forceSave();
      onClose();
    } catch (error) {
      setAlertDialog({
        isOpen: true,
        title: 'Unsaved Changes',
        message: 'Failed to save your changes. Do you want to close anyway?',
        type: 'warning',
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) {
      onSave(formData);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
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
        <TaskHeader
          task={task}
          title={formData.title || ''}
          projectId={formData.projectId || ''}
          projects={projects}
          deadline={formData.deadline}
          isSaving={isSaving}
          saveError={saveError}
          onClose={handleClose}
          onTitleChange={(title) => updateField({ title })}
          onProjectChange={(projectId) => updateField({ projectId })}
          onShare={handleShare}
        />

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-4">
              {/* Title - Only for new tasks */}
              {!task && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => updateField({ title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-all"
                    style={{ borderColor: 'var(--color-border)' }}
                    onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px var(--color-primary)'}
                    onBlur={(e) => e.target.style.boxShadow = ''}
                    placeholder="Enter task title"
                    required
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  Description
                </label>
                <RichTextEditor
                  value={formData.description || ''}
                  onChange={(value) => updateField({ description: value })}
                  placeholder="Task description (supports rich text formatting)"
                />
              </div>

              {/* Sub-tasks */}
              <SubTasksList
                subTasks={formData.subTasks || []}
                onAdd={handleAddSubTask}
                onUpdate={handleUpdateSubTask}
                onRemove={handleRemoveSubTask}
              />

              {/* Comments */}
              <CommentsSection
                comments={formData.comments || []}
                newComment={newComment}
                onNewCommentChange={setNewComment}
                onAddComment={handleAddComment}
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
              />
            </div>

            {/* Right Column - Metadata Sidebar */}
            <TaskDetails
              isNewTask={!task}
              status={formData.status || 'todo'}
              priority={formData.priority || 'medium'}
              deadline={formData.deadline}
              owner={formData.owner || ''}
              projectId={formData.projectId || ''}
              links={formData.links || []}
              tags={formData.tags || []}
              projects={projects}
              statusOptions={statusOptions}
              priorityOptions={priorityOptions}
              customFields={customFields}
              onUpdate={(field, value) => updateField({ [field]: value })}
              onAddLink={handleAddLink}
              onRemoveLink={handleRemoveLink}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
            />
          </div>

          {/* Create Task Button - Only for new tasks */}
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
      
      {/* Input Dialog */}
      <InputDialog
        isOpen={inputDialog.isOpen}
        onClose={() => setInputDialog({ ...inputDialog, isOpen: false })}
        onConfirm={inputDialog.onConfirm}
        title={inputDialog.title}
        placeholder={inputDialog.placeholder}
        defaultValue={inputDialog.defaultValue}
      />
    </div>
  );
}
