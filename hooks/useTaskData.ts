/**
 * Custom hook for managing task data and operations
 * Extracted from app/page.tsx to improve maintainability
 */

import { useState, useCallback } from 'react';
import { Task, TaskStatus, StatusHistoryEntry } from '@/types';
import { authenticatedFetch } from '@/lib/api-client';
import { logger } from '@/lib/logger';

/**
 * Calculate the next deadline for a recurring task
 */
function calculateNextDeadline(
  currentDeadline: string | null,
  interval: number,
  unit: 'days' | 'weeks' | 'months'
): string {
  const baseDate = currentDeadline ? new Date(currentDeadline) : new Date();
  const newDate = new Date(baseDate);
  
  switch (unit) {
    case 'days':
      newDate.setDate(newDate.getDate() + interval);
      break;
    case 'weeks':
      newDate.setDate(newDate.getDate() + (interval * 7));
      break;
    case 'months':
      newDate.setMonth(newDate.getMonth() + interval);
      break;
  }
  
  return newDate.toISOString();
}

interface UseTaskDataResult {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  fetchTasks: () => Promise<void>;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  saveTask: (taskData: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => void;
  loading: boolean;
}

/**
 * Hook to manage tasks for a project
 * @param projectId - Current project ID
 * @param userId - Current user ID
 * @returns Task data and operations
 */
export function useTaskData(
  projectId: string | null,
  userId: string | undefined
): UseTaskDataResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const res = await authenticatedFetch(`/api/tasks?projectId=${projectId}`);
      const data = await res.json();
      
      // Handle both old format (array) and new format (object with tasks array)
      const tasksArray = Array.isArray(data) ? data : data.tasks || [];
      setTasks(tasksArray);
    } catch (error) {
      logger.error('Failed to fetch tasks', error as Error, {
        projectId,
        userId,
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, userId]);

  const updateTaskStatus = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const originalStatus = task.status;

    // Create status history entry
    const historyEntry: StatusHistoryEntry = {
      id: Date.now().toString(),
      fromStatus: originalStatus,
      toStatus: newStatus,
      changedBy: userId || 'Unknown',
      changedAt: new Date().toISOString(),
    };

    // Optimistic update - immediately update UI
    setTasks(prevTasks =>
      prevTasks.map(t =>
        t.id === taskId 
          ? { 
              ...t, 
              status: newStatus, 
              updatedAt: new Date().toISOString(),
              statusHistory: [...(t.statusHistory || []), historyEntry]
            } 
          : t
      )
    );

    // Background save with rollback on error
    try {
      await authenticatedFetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          ...task, 
          status: newStatus,
          statusHistory: [...(task.statusHistory || []), historyEntry]
        }),
      });
      
      // Handle recurring tasks - create new instance when marked as done
      console.log('[Recurring Task Check]', {
        newStatus,
        isDone: newStatus === 'done',
        isRecurring: task.isRecurring,
        recurrenceInterval: task.recurrenceInterval,
        recurrenceUnit: task.recurrenceUnit,
        deadline: task.deadline,
        taskTitle: task.title,
        hasDeadline: !!task.deadline,
      });
      
      if (newStatus === 'done' && task.isRecurring && task.recurrenceInterval && task.recurrenceUnit && task.deadline) {
        console.log('[Recurring Task] Creating new instance for task:', task.title || task.description);
        const newDeadline = calculateNextDeadline(
          task.deadline,
          task.recurrenceInterval,
          task.recurrenceUnit
        );
        
        console.log('[Recurring Task] Calculated new deadline:', newDeadline);
        
        // Create new recurring task instance
        const newRecurringTask: Partial<Task> = {
          ...task,
          id: undefined, // Let backend generate new ID
          status: 'todo',
          deadline: newDeadline,
          parentRecurringTaskId: task.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          statusHistory: [], // Start fresh status history
          comments: [], // Start fresh comments
          subTasks: task.subTasks?.map(st => ({ ...st, completed: false })) || [], // Reset subtasks
        };
        
        console.log('[Recurring Task] New task payload:', {
          title: newRecurringTask.title,
          isRecurring: newRecurringTask.isRecurring,
          recurrenceInterval: newRecurringTask.recurrenceInterval,
          recurrenceUnit: newRecurringTask.recurrenceUnit,
          deadline: newRecurringTask.deadline,
          parentRecurringTaskId: newRecurringTask.parentRecurringTaskId,
        });
        
        // Create the new task
        const response = await authenticatedFetch('/api/tasks', {
          method: 'POST',
          body: JSON.stringify(newRecurringTask),
        });
        
        console.log('[Recurring Task] API response:', response.status, response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Recurring Task] Failed to create new instance:', errorText);
          logger.error('Failed to create recurring task instance', new Error(errorText), {
            taskId: task.id,
            taskTitle: task.title,
          });
        } else {
          console.log('[Recurring Task] Successfully created new instance');
        }
        
        // Refresh tasks to show the new recurring instance
        await fetchTasks();
      }
    } catch (error) {
      logger.error('Failed to update task status', error as Error, {
        taskId,
        oldStatus: originalStatus,
        newStatus,
        userId,
      });
      
      // Rollback on error
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === taskId ? { ...t, status: originalStatus } : t
        )
      );
      
      throw error; // Re-throw so caller can show error
    }
  }, [tasks, userId, fetchTasks]);

  const saveTask = useCallback(async (taskData: Partial<Task>) => {
    try {
      console.log('[useTaskData] saveTask called:', {
        isNew: !taskData.id,
        taskId: taskData.id,
        title: taskData.title,
        projectId: taskData.projectId,
      });
      
      // Determine if update or create based on presence of id
      if (taskData.id) {
        // Update existing task
        console.log('[useTaskData] Updating existing task');
        await authenticatedFetch(`/api/tasks/${taskData.id}`, {
          method: 'PUT',
          body: JSON.stringify(taskData),
        });
      } else {
        // Create new task
        console.log('[useTaskData] Creating new task');
        const response = await authenticatedFetch('/api/tasks', {
          method: 'POST',
          body: JSON.stringify(taskData),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[useTaskData] Failed to create task:', errorText);
          throw new Error(`Failed to create task: ${errorText}`);
        }
        
        console.log('[useTaskData] Task created successfully, refreshing list...');
      }
      
      // Refresh tasks after save
      await fetchTasks();
      console.log('[useTaskData] Tasks refreshed');
    } catch (error) {
      logger.error('Failed to save task', error as Error, {
        isUpdate: !!taskData.id,
        taskId: taskData.id || 'new',
        projectId: projectId || 'none',
        userId: userId || 'unknown',
      });
      throw error;
    }
  }, [projectId, userId, fetchTasks]);

  const deleteTask = useCallback((taskId: string) => {
    // Optimistically remove the task from the UI
    setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
    
    logger.info('Task removed from UI', { taskId });
  }, []);

  return {
    tasks,
    setTasks,
    fetchTasks,
    updateTaskStatus,
    saveTask,
    deleteTask,
    loading,
  };
}
