/**
 * Task Details Sidebar
 * Right sidebar with task metadata (status, priority, deadline, owner, etc.)
 */

'use client';

import { Plus, X, Trash2 } from 'lucide-react';
import { TaskStatus, Priority, StatusOption, PriorityOption, CustomField } from '@/types';
import { formatInTimeZone } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { DatePicker } from '@/components/ui';

interface TaskDetailsProps {
  isNewTask: boolean;
  status: TaskStatus;
  priority: Priority;
  deadline: string | null | undefined;
  owner: string;
  projectId: string;
  links: string[];
  tags: string[];
  projects: { id: string; name: string }[];
  statusOptions: StatusOption[];
  priorityOptions: PriorityOption[];
  customFields: CustomField[];
  onUpdate: (field: string, value: string | null | string[]) => void;
  onAddLink: () => void;
  onRemoveLink: (index: number) => void;
  onAddTag: () => void;
  onRemoveTag: (index: number) => void;
}

export function TaskDetails({
  isNewTask,
  status,
  priority,
  deadline,
  owner,
  projectId,
  links,
  tags,
  projects,
  statusOptions,
  priorityOptions,
  customFields,
  onUpdate,
  onAddLink,
  onRemoveLink,
  onAddTag,
  onRemoveTag,
}: TaskDetailsProps) {
  
  const formatDateLocal = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const berlinDate = formatInTimeZone(date, DEFAULT_TIMEZONE, 'yyyy-MM-dd');
      return berlinDate;
    } catch {
      return '';
    }
  };

  return (
    <div>
      <div className="mb-3 pb-3" style={{ borderBottom: '2px solid #f1f5f9' }}>
        <span className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text)', letterSpacing: '0.5px' }}>
          Details
        </span>
      </div>
      
      <div className="rounded-lg p-5" style={{ background: '#fafbfc', border: '1px solid #e2e8f0' }}>
        <div className="space-y-4">
          {/* Status */}
          <div className="pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
              Status
            </label>
            <select
              value={status || (statusOptions[0]?.id || 'todo')}
              onChange={(e) => onUpdate('status', e.target.value as TaskStatus)}
              className="w-full px-3 py-2 rounded-md focus:outline-none text-sm font-medium"
              style={{
                background: '#ffffff',
                color: status && statusOptions.find(s => s.id === status)?.color 
                  ? statusOptions.find(s => s.id === status)?.color 
                  : '#0f172a',
                border: `2px solid ${status && statusOptions.find(s => s.id === status)?.color ? statusOptions.find(s => s.id === status)?.color : '#e2e8f0'}`,
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
              value={priority || (priorityOptions[0]?.id || 'medium')}
              onChange={(e) => onUpdate('priority', e.target.value as Priority)}
              className="w-full px-3 py-2 rounded-md focus:outline-none text-sm font-medium"
              style={{
                background: priority && priorityOptions.find(p => p.id === priority)?.color 
                  ? `${priorityOptions.find(p => p.id === priority)?.color}20` 
                  : '#ffffff',
                color: priority && priorityOptions.find(p => p.id === priority)?.color 
                  ? priorityOptions.find(p => p.id === priority)?.color 
                  : '#0f172a',
                border: `2px solid ${priority && priorityOptions.find(p => p.id === priority)?.color ? priorityOptions.find(p => p.id === priority)?.color : '#e2e8f0'}`,
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
            <DatePicker
              label="Due Date"
              value={deadline}
              onChange={(date) => onUpdate('deadline', date ? new Date(date).toISOString() : null)}
              fullWidth
            />
          </div>

          {/* Owner */}
          <div className="pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
              Owner
            </label>
            <input
              type="text"
              value={owner || ''}
              onChange={(e) => onUpdate('owner', e.target.value)}
              className="w-full px-3 py-2 border-0 rounded-md focus:outline-none text-sm font-medium"
              style={{
                background: '#ffffff',
                color: 'var(--color-text)',
              }}
              placeholder="Task owner"
            />
          </div>

          {/* Links */}
          <div className="pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                Links
              </label>
              <button
                type="button"
                onClick={onAddLink}
                className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: 'var(--color-primary)' }}
              >
                <Plus size={14} />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {links?.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-md" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 truncate transition-colors text-xs"
                    style={{
                      color: 'var(--color-primary)',
                    }}
                  >
                    {link}
                  </a>
                  <button
                    type="button"
                    onClick={() => onRemoveLink(idx)}
                    className="transition-colors"
                    style={{ color: '#f30047' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
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
                onClick={onAddTag}
                className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: 'var(--color-primary)' }}
              >
                <Plus size={14} />
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags?.map((tag, idx) => (
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
                    onClick={() => onRemoveTag(idx)}
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
  );
}
