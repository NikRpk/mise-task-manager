/**
 * SubTasks List Component
 * Manages sub-tasks for a task with progress tracking
 */

'use client';

import { Plus } from 'lucide-react';
import { SubTask } from '@/types';

interface SubTasksListProps {
  subTasks: SubTask[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<SubTask>) => void;
  onRemove: (id: string) => void;
}

export function SubTasksList({ subTasks, onAdd, onUpdate, onRemove }: SubTasksListProps) {
  const completedCount = subTasks.filter(st => st.completed).length;
  const totalCount = subTasks.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 pb-3" style={{ borderBottom: '2px solid #f1f5f9' }}>
        <div className="flex items-center gap-4 flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text)', letterSpacing: '0.5px' }}>
            Sub-tasks ({totalCount})
          </label>
          
          {/* Progress Bar - Inline */}
          {totalCount > 0 && (
            <div className="flex items-center gap-2 flex-1">
              <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', maxWidth: '200px' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-success) 100%)',
                    width: `${progressPercentage}%`,
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--color-primary)', minWidth: '50px' }}>
                {completedCount}/{totalCount}
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors"
          style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
        >
          <Plus size={14} />
          Add
        </button>
      </div>
      
      {totalCount > 0 ? (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {subTasks.map((st, index) => (
                <tr 
                  key={st.id}
                  style={{ 
                    borderBottom: index < totalCount - 1 ? '1px solid #f1f5f9' : 'none',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fafbfc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = ''}
                >
                  <td style={{ width: '40px', textAlign: 'center', padding: '12px 8px' }}>
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={(e) => onUpdate(st.id, { completed: e.target.checked })}
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
                      onChange={(e) => onUpdate(st.id, { description: e.target.value })}
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
                      onClick={() => onRemove(st.id)}
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
          No sub-tasks yet. Click "Add" to create one.
        </div>
      )}
    </div>
  );
}
