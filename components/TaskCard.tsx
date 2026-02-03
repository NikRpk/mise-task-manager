'use client';

import { useDraggable } from '@dnd-kit/core';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Calendar, User } from 'lucide-react';
import { Task, Priority } from '@/types';
import { useState, useEffect } from 'react';
import { DEFAULT_TIMEZONE, DEFAULT_DATE_FORMAT } from '@/lib/constants';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  statusColor?: string;
  viewMode?: 'normal' | 'compact';
  canDrag?: boolean;
}

const priorityColors: Record<Priority, { bg: string; text: string; border: string }> = {
  high: { bg: '#fef2f2', text: '#f30047', border: '#fecaca' },
  medium: { bg: '#fffbeb', text: '#f6c400', border: '#fde68a' },
  low: { bg: '#f0fdf4', text: '#00a61c', border: '#bbf7d0' },
};

export default function TaskCard({ task, onClick, statusColor, viewMode = 'normal', canDrag = true }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !canDrag,
  });

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done';
  const completedSubtasks = task.subTasks.filter(st => st.completed).length;
  const totalSubtasks = task.subTasks.length;
  
  // Use status color if provided, otherwise fall back to primary color
  const borderColor = statusColor || 'var(--color-primary)';

  const dragStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
      }
    : {};
  
  // Separate click handler to prevent conflict with drag
  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      onClick();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatInTimeZone(parseISO(dateString), DEFAULT_TIMEZONE, DEFAULT_DATE_FORMAT);
    } catch {
      // Fallback: if parsing fails, return a safe default
      return 'Invalid date';
    }
  };

  // Compact view rendering
  if (viewMode === 'compact') {
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={handleClick}
        className={`rounded-lg border-l-4 border-r border-t border-b px-3 py-2 select-none ${
          isDragging ? 'opacity-40 shadow-2xl scale-105 cursor-grabbing' : canDrag ? 'cursor-grab hover:shadow-lg' : 'cursor-pointer hover:shadow-lg'
        }`}
        style={{
          backgroundColor: isDragging ? '#ffffff' : '#fafbfc',
          borderLeftColor: borderColor,
          borderRightColor: isDragging ? '#cbd5e1' : '#e2e8f0',
          borderTopColor: isDragging ? '#cbd5e1' : '#e2e8f0',
          borderBottomColor: isDragging ? '#cbd5e1' : '#e2e8f0',
          transition: isDragging ? 'none' : 'box-shadow 0.15s ease, background-color 0.15s ease',
          willChange: 'transform',
          pointerEvents: isDragging ? 'none' : 'auto',
          ...dragStyle
        }}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Title */}
          <div className="flex-1 min-w-0">
            {task.title && (
              <h3 className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                {task.title}
              </h3>
            )}
          </div>
          
          {/* Priority and Date */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {task.priority && (
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                style={{
                  backgroundColor: priorityColors[task.priority].bg,
                  color: priorityColors[task.priority].text,
                  border: `1px solid ${priorityColors[task.priority].border}`,
                }}
              >
                {task.priority[0]}
              </span>
            )}
            {task.deadline && (
              <span
                className="flex items-center gap-1 text-[11px] font-medium"
                style={isOverdue ? { color: '#f30047' } : { color: 'var(--color-text-secondary)' }}
              >
                <Calendar size={10} />
                {formatDate(task.deadline)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Normal view rendering
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={`rounded-lg border-l-4 border-r border-t border-b p-4 select-none ${
        isDragging ? 'opacity-40 shadow-2xl scale-105 cursor-grabbing' : canDrag ? 'cursor-grab hover:shadow-lg' : 'cursor-pointer hover:shadow-lg'
      }`}
      style={{
        backgroundColor: isDragging ? '#ffffff' : '#fafbfc',
        borderLeftColor: borderColor,
        borderRightColor: isDragging ? '#cbd5e1' : '#e2e8f0',
        borderTopColor: isDragging ? '#cbd5e1' : '#e2e8f0',
        borderBottomColor: isDragging ? '#cbd5e1' : '#e2e8f0',
        transition: isDragging ? 'none' : 'box-shadow 0.15s ease, background-color 0.15s ease',
        willChange: 'transform',
        pointerEvents: isDragging ? 'none' : 'auto',
        ...dragStyle
      }}
    >
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex-1 mr-2">
          {task.title && (
            <h3 className="text-sm font-medium leading-snug" style={{ color: 'var(--color-text)', lineHeight: '1.4' }}>
              {task.title}
            </h3>
          )}
        </div>
        {task.priority && (
          <span
            className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase whitespace-nowrap"
            style={{
              backgroundColor: priorityColors[task.priority].bg,
              color: priorityColors[task.priority].text,
              border: `1px solid ${priorityColors[task.priority].border}`,
            }}
          >
            {task.priority}
          </span>
        )}
      </div>

      {task.owner && (
        <div className="mb-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <span className="flex items-center gap-1">
            <User size={11} />
            {task.owner}
          </span>
        </div>
      )}

      {totalSubtasks > 0 && (
        <div className="mb-2.5">
          <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
            <div className="flex-1 rounded-full h-1.5" style={{ backgroundColor: '#e2e8f0' }}>
              <div
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: `${(completedSubtasks / totalSubtasks) * 100}%`,
                  backgroundColor: 'var(--color-primary)',
                }}
              />
            </div>
            <span className="font-medium">{completedSubtasks}/{totalSubtasks}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
        {task.deadline ? (
          <span
            className="flex items-center gap-1"
            style={isOverdue ? { color: '#f30047', fontWeight: 600 } : { fontWeight: 500 }}
          >
            <Calendar size={11} />
            {formatDate(task.deadline)}
          </span>
        ) : (
          <span></span>
        )}
        {task.tags && task.tags.length > 0 && (
          <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {task.tags.length} tag{task.tags.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
