/**
 * Task Header Component
 * Header section with title, metadata, and action buttons
 */

'use client';

import { useState } from 'react';
import { X, Share2, Check } from 'lucide-react';
import { Task } from '@/types';

interface TaskHeaderProps {
  task: Task | null;
  title: string;
  projectId: string;
  projects: { id: string; name: string }[];
  subTasks: any[];
  deadline: string | null;
  isSaving: boolean;
  saveError: string | null;
  onClose: () => void;
  onTitleChange: (title: string) => void;
  onProjectChange: (projectId: string) => void;
  onShare: () => void;
}

export function TaskHeader({
  task,
  title,
  projectId,
  projects,
  subTasks,
  deadline,
  isSaving,
  saveError,
  onClose,
  onTitleChange,
  onProjectChange,
  onShare,
}: TaskHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState(title);

  const handleTitleSave = () => {
    if (editingTitle.trim()) {
      onTitleChange(editingTitle);
    }
    setIsEditingTitle(false);
  };

  const completedSubtasks = subTasks?.filter(st => st.completed).length || 0;
  const totalSubtasks = subTasks?.length || 0;
  const progressPercentage = totalSubtasks > 0 
    ? Math.round((completedSubtasks / totalSubtasks) * 100) 
    : 0;

  const daysLeft = deadline 
    ? Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div
      className="sticky top-0 bg-surface px-8 py-2 z-10"
      style={{ borderBottom: '2px solid #e2e8f0' }}
    >
      <div className="flex justify-between items-center">
        <div className="flex-1">
          {task ? (
            isEditingTitle ? (
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTitleSave();
                  } else if (e.key === 'Escape') {
                    setEditingTitle(title);
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
                  setEditingTitle(title);
                  setIsEditingTitle(true);
                }}
                title="Click to edit"
              >
                {title || 'Untitled Task'}
              </h2>
            )
          ) : (
            <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
              Create Task
            </h2>
          )}
          {task && (
            <div className="flex gap-4 text-xs items-center" style={{ color: 'var(--color-text-secondary)' }}>
              <div className="flex items-center gap-2">
                <span>🎯</span>
                <select
                  value={projectId || ''}
                  onChange={(e) => onProjectChange(e.target.value)}
                  className="border-0 bg-transparent text-xs font-medium cursor-pointer hover:underline focus:outline-none"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <option value="">No Project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <span>•</span>
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
              onClick={onShare}
              type="button"
              className="flex items-center gap-2 px-3 py-1 rounded-md transition-colors hover:bg-gray-100"
              style={{ color: 'var(--color-primary)' }}
              title="Share task"
            >
              <Share2 size={16} />
              <span className="text-sm font-medium">Share</span>
            </button>
            <div className="flex gap-4">
              {/* Complete % - Only show if there are sub-tasks */}
              {totalSubtasks > 0 && (
                <div className="text-center px-4 py-2 bg-surface border rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
                    {progressPercentage}%
                  </div>
                  <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Complete</div>
                </div>
              )}
              {/* Days Left - Only show if there's a deadline */}
              {daysLeft !== null && (
                <div className="text-center px-4 py-2 bg-surface border rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
                    {daysLeft}d
                  </div>
                  <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Left</div>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 ml-6">
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 hover:shadow-md transition-all cursor-pointer"
            style={{ color: 'var(--color-text-secondary)' }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
