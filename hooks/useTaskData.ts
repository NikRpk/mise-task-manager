/**
 * Custom hook for managing task data and operations
 * Extracted from app/page.tsx to improve maintainability
 */

import { useState, useCallback } from 'react';
import { Task, TaskStatus } from '@/types';
import { authenticatedFetch } from '@/lib/api-client';
import { logger } from '@/lib/logger';

interface UseTaskDataResult {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  fetchTasks: () => Promise<void>;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  saveTask: (taskData: Partial<Task>) => Promise<void>;
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

    // Optimistic update - immediately update UI
    setTasks(prevTasks =>
      prevTasks.map(t =>
        t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t
      )
    );

    // Background save with rollback on error
    try {
      await authenticatedFetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...task, status: newStatus }),
      });
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
  }, [tasks, userId]);

  const saveTask = useCallback(async (taskData: Partial<Task>) => {
    try {
      // Determine if update or create based on presence of id
      if (taskData.id) {
        // Update existing task
        await authenticatedFetch(`/api/tasks/${taskData.id}`, {
          method: 'PUT',
          body: JSON.stringify(taskData),
        });
      } else {
        // Create new task
        await authenticatedFetch('/api/tasks', {
          method: 'POST',
          body: JSON.stringify(taskData),
        });
      }
      
      // Refresh tasks after save
      await fetchTasks();
    } catch (error) {
      logger.error('Failed to save task', error as Error, {
        isUpdate: !!taskData.id,
        taskId: taskData.id,
        projectId,
        userId,
      });
      throw error;
    }
  }, [projectId, userId, fetchTasks]);

  return {
    tasks,
    setTasks,
    fetchTasks,
    updateTaskStatus,
    saveTask,
    loading,
  };
}
