'use client';

import { useDroppable } from '@dnd-kit/core';
import { Task } from '@/types';
import TaskCard from './TaskCard';
import { KANBAN_COLUMN_MIN_HEIGHT } from '@/lib/constants';

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  color?: string;
  viewMode?: 'normal' | 'compact';
  canEdit?: boolean;
}

export default function KanbanColumn({ id, title, tasks, onTaskClick, color, viewMode = 'normal', canEdit = true }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: !canEdit,
  });
  
  const columnColor = color || 'var(--color-primary)';
  
  // Convert hex to RGB for gradient
  const hexToRgb = (hex: string) => {
    if (hex.startsWith('var(')) return '0, 150, 70'; // fallback
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 150, 70';
  };

  return (
    <div
      ref={setNodeRef}
      className={`bg-surface rounded-xl border shadow-sm transition-all duration-200 ${
        isOver ? 'ring-2 ring-offset-2 scale-[1.02]' : ''
      }`}
      style={{ 
        minHeight: KANBAN_COLUMN_MIN_HEIGHT,
        borderColor: isOver ? columnColor : '#e2e8f0',
        ringColor: isOver ? columnColor : undefined,
        backgroundColor: isOver ? '#fafbfc' : 'white',
      }}
    >
      <div 
        className="flex items-center justify-between px-5 py-4" 
        style={{ 
          borderBottom: `3px solid ${columnColor}`,
          background: color ? `linear-gradient(135deg, rgba(${hexToRgb(color)}, 0.03) 0%, rgba(${hexToRgb(color)}, 0.01) 100%)` : 'linear-gradient(135deg, rgba(var(--color-primary-rgb, 0, 150, 70), 0.03) 0%, rgba(var(--color-primary-rgb, 0, 150, 70), 0.01) 100%)'
        }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text)', letterSpacing: '0.5px' }}>
          {title}
        </h2>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-semibold"
          style={{
            backgroundColor: columnColor,
            color: 'white',
          }}
        >
          {tasks.length}
        </span>
      </div>
      <div className={viewMode === 'compact' ? 'p-2 space-y-1.5' : 'p-3.5 space-y-3'}>
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            statusColor={columnColor}
            viewMode={viewMode}
            canDrag={canEdit}
          />
        ))}
      </div>
    </div>
  );
}
