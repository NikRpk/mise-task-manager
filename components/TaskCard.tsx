'use client';

import { useDraggable } from '@dnd-kit/core';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Calendar, User, CheckSquare, Square, GripVertical } from 'lucide-react';
import { Task, Priority } from '@/types';
import { useState, useEffect, memo, useMemo, useCallback, useRef } from 'react';
import { DEFAULT_TIMEZONE, DEFAULT_DATE_FORMAT } from '@/lib/constants';
import { usePeopleData } from '@/hooks/usePeopleData';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onQuickComplete?: (taskId: string) => Promise<boolean> | boolean; // Handler returns true if completion should proceed
  statusColor?: string;
  viewMode?: 'normal' | 'compact';
  canDrag?: boolean;
  showOwner?: boolean;
  showPriority?: boolean;
  showDueDate?: boolean;
}

// Utility function to truncate text to a specified length
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

const priorityColors: Record<Priority, { bg: string; text: string; border: string }> = {
  high: { bg: '#fef2f2', text: '#f30047', border: '#fecaca' },
  medium: { bg: '#fffbeb', text: '#f6c400', border: '#fde68a' },
  low: { bg: '#f0fdf4', text: '#00a61c', border: '#bbf7d0' },
};

const TaskCard = memo(function TaskCard({ 
  task, 
  onClick, 
  onQuickComplete, 
  statusColor, 
  viewMode = 'normal', 
  canDrag = true, 
  showOwner = false,
  showPriority = true,
  showDueDate = true,
}: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !canDrag,
  });
  const { people } = usePeopleData();
  
  // Track if a drag operation occurred (to prevent click after drag)
  const dragOccurredRef = useRef(false);
  
  // Track completion animation
  const [isCompleting, setIsCompleting] = useState(false);

  // Helper to get display name from email
  const getDisplayName = useCallback((ownerEmail: string) => {
    const person = people.find(p => p.email === ownerEmail);
    return person?.displayName || ownerEmail;
  }, [people]);
  
  // Track when dragging starts
  useEffect(() => {
    if (isDragging) {
      dragOccurredRef.current = true;
    }
  }, [isDragging]);
  
  // Reset drag flag after a short delay when drag ends
  useEffect(() => {
    if (!isDragging && dragOccurredRef.current) {
      const timer = setTimeout(() => {
        dragOccurredRef.current = false;
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isDragging]);

  // Memoize expensive computations
  const isOverdue = useMemo(() => {
    if (!task.deadline || task.status === 'done') return false;
    const deadline = new Date(task.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    return deadline < today;
  }, [task.deadline, task.status]);
  
  const isToday = useMemo(() => {
    if (!task.deadline || task.status === 'done') return false;
    const deadline = new Date(task.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    return deadline.getTime() === today.getTime();
  }, [task.deadline, task.status]);
  
  const isTomorrow = useMemo(() => {
    if (!task.deadline || task.status === 'done') return false;
    const deadline = new Date(task.deadline);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    return deadline.getTime() === tomorrow.getTime();
  }, [task.deadline, task.status]);
  
  // Calculate days overdue
  const daysOverdue = useMemo(() => {
    if (!task.deadline || task.status === 'done') return 0;
    const deadline = new Date(task.deadline);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = now.getTime() - deadline.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [task.deadline, task.status]);
  
  // Use status color if provided, otherwise fall back to primary color
  const borderColor = statusColor || 'var(--color-primary)';

  const dragStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
        backfaceVisibility: 'hidden' as const,
        WebkitFontSmoothing: 'antialiased' as const,
      }
    : {};
  
  // Separate click handler to prevent conflict with drag
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Only prevent click if currently dragging or a drag just completed
    if (!isDragging && !dragOccurredRef.current) {
      onClick();
    }
  }, [isDragging, onClick]);
  
  const handleQuickComplete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onQuickComplete && task.status !== 'done') {
      // Call handler first to check if completion should proceed
      const shouldProceed = await onQuickComplete(task.id);
      
      // Only start animation if validation passed
      if (shouldProceed) {
        setIsCompleting(true);
        
        // Animation plays for 2 seconds, status is already updated by parent
      }
    }
  }, [onQuickComplete, task.id, task.status]);
  
  // Memoize date formatting
  const formatDate = useCallback((dateString: string) => {
    try {
      return formatInTimeZone(parseISO(dateString), DEFAULT_TIMEZONE, DEFAULT_DATE_FORMAT);
    } catch {
      return 'Invalid date';
    }
  }, []);
  
  // Format deadline display with overdue text
  const formatDeadlineDisplay = useCallback((dateString: string) => {
    if (isToday) {
      return 'Today';
    }
    if (isTomorrow) {
      return 'Tomorrow';
    }
    if (daysOverdue > 0) {
      return `Overdue ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}`;
    }
    return formatDate(dateString);
  }, [isToday, isTomorrow, daysOverdue, formatDate]);

  // Compact view rendering
  if (viewMode === 'compact') {
    return (
      <div
        ref={setNodeRef}
        onClick={handleClick}
        className={`task-card-compact rounded-lg border-l-4 border-r border-t border-b px-3 py-2 select-none relative ${
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
          ...dragStyle
        }}
      >
        {/* Drag area - covers most of the card */}
        {canDrag && (
          <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className="absolute inset-0 z-0"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          />
        )}
        
        <div className="flex items-center justify-between gap-2 relative z-10">
          {/* Title */}
          <div className="flex-1 min-w-0">
            {task.title && (
              <h3 className="text-[13px] truncate" style={{ color: 'var(--color-text)' }} title={task.title}>
                {truncateText(task.title, 50)}
              </h3>
            )}
          </div>
          
          {/* Priority and Date */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {showPriority && task.priority && (
              <span
                className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase"
                style={{
                  backgroundColor: priorityColors[task.priority].bg,
                  color: priorityColors[task.priority].text,
                  border: `1px solid ${priorityColors[task.priority].border}`,
                }}
              >
                {task.priority[0]}
              </span>
            )}
            {showDueDate && task.deadline && (
              <span
                className="flex items-center gap-1 text-[10px] font-medium"
                style={isOverdue ? { color: '#f30047' } : (isToday || isTomorrow) ? { color: '#00a61c', fontWeight: 600 } : { color: 'var(--color-text-secondary)' }}
              >
                <Calendar size={10} />
                {formatDeadlineDisplay(task.deadline)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Check if card should be compact (no deadline showing, no owner showing)
  const shouldBeCompact = !(showDueDate && task.deadline) && !(showOwner && task.owner);

  // Normal view rendering
  return (
    <>
      <div
        ref={setNodeRef}
        {...(canDrag && !isCompleting ? listeners : {})}
        {...(canDrag && !isCompleting ? attributes : {})}
        onClick={handleClick}
        className={`task-card rounded-lg border-l-4 border-r border-t border-b select-none relative ${
          isDragging ? 'opacity-40 shadow-2xl scale-105 cursor-grabbing' : canDrag ? 'cursor-grab hover:shadow-lg' : 'cursor-pointer hover:shadow-lg'
        } ${shouldBeCompact ? 'py-2 px-3' : 'p-3'} ${isCompleting ? 'task-completing' : ''}`}
        style={{
          backgroundColor: isCompleting ? undefined : (isDragging ? '#ffffff' : '#fafbfc'),
          borderLeftColor: borderColor,
          borderRightColor: isDragging ? '#cbd5e1' : '#e2e8f0',
          borderTopColor: isDragging ? '#cbd5e1' : '#e2e8f0',
          borderBottomColor: isDragging ? '#cbd5e1' : '#e2e8f0',
          transition: isCompleting ? 'none' : (isDragging ? 'none' : 'box-shadow 0.15s ease, background-color 0.15s ease'),
          willChange: 'transform',
          minHeight: '52px',
          ...dragStyle
        }}
      >
      {/* Progress Circle - absolutely positioned in top right, aligned with content */}
      {onQuickComplete && task.status !== 'done' && (
        <div 
          onClick={handleQuickComplete}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          className="absolute right-2 cursor-pointer progress-circle-wrapper"
          title="Mark as done"
          style={{ 
            width: '24px', 
            height: '24px',
            top: shouldBeCompact ? '8px' : '12px',
            zIndex: 10,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background circle */}
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="2.5"
            />
            {/* Progress circle - fills on hover */}
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeDasharray="62.83"
              strokeDashoffset="62.83"
              style={{
                transition: 'stroke-dashoffset 0.3s ease',
              }}
              className="progress-stroke"
            />
          </svg>
        </div>
      )}

      {/* Title and Priority row */}
      <div className={`flex items-start justify-between pr-6 relative ${shouldBeCompact ? 'mb-0' : 'mb-2'}`}>
        <div className="flex-1 mr-2">
          {task.title && (
            <h3 className="text-[13px] leading-snug" style={{ color: 'var(--color-text)', lineHeight: '1.4' }} title={task.title}>
              {truncateText(task.title, 50)}
            </h3>
          )}
        </div>
        {showPriority && task.priority && (
          <span
            className="px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase whitespace-nowrap flex-shrink-0"
            style={{
              backgroundColor: priorityColors[task.priority].bg,
              color: priorityColors[task.priority].text,
              border: `1px solid ${priorityColors[task.priority].border}`,
              marginTop: '1px',
            }}
          >
            {task.priority}
          </span>
        )}
      </div>

      {showOwner && task.owner && (
        <div className="mb-1.5 text-[11px] relative" style={{ color: 'var(--color-text-secondary)' }}>
          <span className="flex items-center gap-1">
            <User size={11} />
            {getDisplayName(task.owner)}
          </span>
        </div>
      )}

      {/* Bottom row: Date and Tags - only show if there's content */}
      {((showDueDate && task.deadline) || (task.tags && task.tags.length > 0)) && (
        <div className="flex items-center justify-between text-[10px] relative" style={{ color: 'var(--color-text-secondary)' }}>
          {showDueDate && task.deadline ? (
            <span
              className="flex items-center gap-1"
              style={isOverdue ? { color: '#f30047', fontWeight: 600 } : (isToday || isTomorrow) ? { color: '#00a61c', fontWeight: 600 } : { fontWeight: 500 }}
            >
              <Calendar size={11} />
              {formatDeadlineDisplay(task.deadline)}
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
      )}
    </div>
  </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  // Only re-render if task data, color, or view mode actually changed
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.updatedAt === nextProps.task.updatedAt &&
    prevProps.statusColor === nextProps.statusColor &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.canDrag === nextProps.canDrag &&
    prevProps.showOwner === nextProps.showOwner &&
    prevProps.showPriority === nextProps.showPriority &&
    prevProps.showDueDate === nextProps.showDueDate
  );
});

export default TaskCard;
