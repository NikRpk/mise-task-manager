/**
 * Custom hook for managing task data and operations
 * Extracted from app/page.tsx to improve maintainability
 */

import { useState, useCallback, useRef } from 'react';
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

  // Tracks task IDs currently being updated to prevent double-clicks / race conditions
  const inFlightRef = useRef<Set<string>>(new Set());

  const fetchTasks = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      // Use a high limit to load all tasks — the board must show all tasks so
      // nothing is silently hidden from the user (e.g. old overdue ones).
      const res = await authenticatedFetch(`/api/tasks?projectId=${projectId}&limit=500`);
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

    // Prevent double-click / race conditions — only one in-flight update per task at a time
    if (inFlightRef.current.has(taskId)) return;
    inFlightRef.current.add(taskId);

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
      
      if (newStatus === 'done' && task.isRecurring && task.recurrenceInterval && task.recurrenceUnit && task.deadline) {
        logger.info('Creating recurring task instance', {
          taskId: task.id,
          taskTitle: task.title,
        });

        const newDeadline = calculateNextDeadline(
          task.deadline,
          task.recurrenceInterval,
          task.recurrenceUnit
        );
        
        const newRecurringTask: Partial<Task> = {
          ...task,
          id: undefined,
          status: 'todo',
          deadline: newDeadline,
          parentRecurringTaskId: task.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          statusHistory: [],
          comments: [],
          subTasks: task.subTasks?.map(st => ({ ...st, completed: false })) || [],
        };
        
        const response = await authenticatedFetch('/api/tasks', {
          method: 'POST',
          body: JSON.stringify(newRecurringTask),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          logger.error('Failed to create recurring task instance', new Error(errorText), {
            taskId: task.id,
            taskTitle: task.title,
          });
        }
        
        // The real-time Firestore listener will call fetchTasks once the new
        // document lands — no manual fetchTasks() call needed here, which would
        // race with the listener and could cause a duplicate to flash briefly.
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
    } finally {
      inFlightRef.current.delete(taskId);
    }
  }, [tasks, userId]);

  const saveTask = useCallback(async (taskData: Partial<Task>) => {
    try {
      if (taskData.id) {
        await authenticatedFetch(`/api/tasks/${taskData.id}`, {
          method: 'PUT',
          body: JSON.stringify(taskData),
        });
      } else {
        const response = await authenticatedFetch('/api/tasks', {
          method: 'POST',
          body: JSON.stringify(taskData),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to create task: ${errorText}`);
        }
      }
      
      await fetchTasks();
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
