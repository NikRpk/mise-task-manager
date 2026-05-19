'use client';

import { useDroppable } from '@dnd-kit/core';
import { Task } from '@/types';
import TaskCard from './TaskCard';
import { KANBAN_COLUMN_MIN_HEIGHT } from '@/lib/constants';
import { memo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onQuickComplete?: (taskId: string) => Promise<boolean> | boolean;
  color?: string;
  getTaskColor?: (task: Task) => string | undefined;
  viewMode?: 'normal' | 'compact';
  canEdit?: boolean;
  showOwner?: boolean;
  showPriority?: boolean;
  showDueDate?: boolean;
}

const INITIAL_DONE_LIMIT = 10;
const LOAD_MORE_INCREMENT = 20;

const KanbanColumn = memo(function KanbanColumn({ 
  id, 
  title, 
  tasks, 
  onTaskClick, 
  onQuickComplete, 
  color,
  getTaskColor,
  viewMode = 'normal', 
  canEdit = true, 
  showOwner = false,
  showPriority = true,
  showDueDate = true,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: !canEdit,
  });
  
  const columnColor = color || 'var(--color-primary)';
  
  // Pagination state for done column
  const [doneLimit, setDoneLimit] = useState(INITIAL_DONE_LIMIT);
  
  const isDoneColumn = id === 'done';
  
  const displayedTasks = isDoneColumn ? tasks.slice(0, doneLimit) : tasks;
  const hasMoreTasks = isDoneColumn && tasks.length > doneLimit;
  const remainingCount = isDoneColumn ? tasks.length - doneLimit : 0;
  
  // Convert hex to RGB for gradient
  const hexToRgb = (hex: string) => {
    if (hex.startsWith('var(')) return '0, 150, 70'; // fallback
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 150, 70';
  };

  const handleLoadMore = () => {
    setDoneLimit(prev => prev + LOAD_MORE_INCREMENT);
  };

  return (
    <div
      ref={setNodeRef}
      className={`bg-surface rounded-xl border shadow-sm transition-all duration-200 md:flex-shrink-0 flex flex-col w-full md:w-[280px] ${
        isOver ? 'ring-2 ring-offset-2 scale-[1.02]' : ''
      }`}
      style={{ 
        height: '100%',
        borderColor: isOver ? columnColor : '#e2e8f0',
        backgroundColor: isOver ? '#fafbfc' : 'white',
      }}
    >
      <div 
        className="flex items-center justify-between px-5 py-4 flex-shrink-0" 
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
      <div className={`md:flex-1 ${viewMode === 'compact' ? 'p-2 space-y-1.5' : 'p-3.5 space-y-3'} md:overflow-y-auto`}>
        {displayedTasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            onQuickComplete={onQuickComplete}
            statusColor={getTaskColor ? getTaskColor(task) : columnColor}
            viewMode={viewMode}
            canDrag={canEdit}
            showOwner={showOwner}
            showPriority={showPriority}
            showDueDate={showDueDate}
          />
        ))}
        
        {/* Show More button for done column */}
        {hasMoreTasks && (
          <button
            onClick={handleLoadMore}
            className="w-full py-3 mt-2 rounded-lg border-2 border-dashed transition-all duration-200 hover:border-solid hover:bg-gray-50 flex items-center justify-center gap-2 text-sm font-medium"
            style={{
              borderColor: columnColor,
              color: columnColor,
            }}
          >
            <ChevronDown size={16} />
            <span>Show {Math.min(remainingCount, LOAD_MORE_INCREMENT)} more {remainingCount > LOAD_MORE_INCREMENT ? `(${remainingCount} total)` : ''}</span>
          </button>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.title === nextProps.title &&
    prevProps.tasks.length === nextProps.tasks.length &&
    prevProps.tasks.every((task, idx) => 
      task.id === nextProps.tasks[idx]?.id && 
      task.updatedAt === nextProps.tasks[idx]?.updatedAt
    ) &&
    prevProps.color === nextProps.color &&
    prevProps.getTaskColor === nextProps.getTaskColor &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.canEdit === nextProps.canEdit &&
    prevProps.showOwner === nextProps.showOwner &&
    prevProps.showPriority === nextProps.showPriority &&
    prevProps.showDueDate === nextProps.showDueDate
  );
});

export default KanbanColumn;
