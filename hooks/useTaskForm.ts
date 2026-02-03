/**
 * Custom hook for managing task form state with auto-save
 * Abstracts the repeated update pattern from TaskModal
 * Fixes the inconsistency bug in updateSubTask
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Task } from '@/types';
import { debounce } from '@/lib/utils';
import { authenticatedFetch } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { AUTO_SAVE_DELAY_MS } from '@/lib/constants';

interface UseTaskFormResult {
  formData: Partial<Task>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Task>>>;
  updateField: (updates: Partial<Task>) => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  saveError: string | null;
  forceSave: () => Promise<void>;
}

/**
 * Hook to manage task form state with auto-save functionality
 * @param task - Existing task (null for new tasks)
 * @param defaultData - Default form data for new tasks
 * @returns Form state and update functions
 */
export function useTaskForm(
  task: Task | null,
  defaultData: Partial<Task>
): UseTaskFormResult {
  const [formData, setFormData] = useState<Partial<Task>>(defaultData);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Refs to prevent stale closures
  const taskRef = useRef<Task | null>(task);
  const formDataRef = useRef<Partial<Task>>(formData);
  const saveInProgressRef = useRef(false);

  // Update refs when values change
  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      setFormData(task);
      setHasUnsavedChanges(false);
    } else {
      setFormData(defaultData);
      setHasUnsavedChanges(false);
    }
  }, [task, defaultData]);

  // Save function
  const saveToServer = useCallback(async (data: Partial<Task>) => {
    if (!taskRef.current || saveInProgressRef.current) return;

    saveInProgressRef.current = true;
    setIsSaving(true);
    setSaveError(null);

    try {
      await authenticatedFetch(`/api/tasks/${taskRef.current.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      logger.error('Failed to auto-save task', error as Error, {
        taskId: taskRef.current?.id,
      });
      setSaveError('Failed to save changes');
      throw error;
    } finally {
      setIsSaving(false);
      saveInProgressRef.current = false;
    }
  }, []);

  // Debounced save
  const debouncedSave = useRef(
    debounce((data: Partial<Task>) => {
      saveToServer(data);
    }, AUTO_SAVE_DELAY_MS)
  ).current;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debouncedSave.cancel) {
        debouncedSave.cancel();
      }
    };
  }, [debouncedSave]);

  /**
   * Generic update function - replaces 10+ repeated functions in TaskModal
   * This fixes the inconsistency bug where some functions were missing setHasUnsavedChanges
   */
  const updateField = useCallback((updates: Partial<Task>) => {
    const newData = { ...formDataRef.current, ...updates };
    setFormData(newData);
    setHasUnsavedChanges(true);

    // Auto-save for existing tasks
    if (taskRef.current) {
      debouncedSave(newData);
    }
  }, [debouncedSave]);

  /**
   * Force save without debounce (used on modal close)
   */
  const forceSave = useCallback(async () => {
    // Cancel pending debounced save
    if (debouncedSave.cancel) {
      debouncedSave.cancel();
    }

    // Only save if there are unsaved changes
    if (taskRef.current && hasUnsavedChanges && !saveInProgressRef.current) {
      await saveToServer(formDataRef.current);
    }

    // Wait for in-progress save
    if (saveInProgressRef.current) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, [debouncedSave, hasUnsavedChanges, saveToServer]);

  return {
    formData,
    setFormData,
    updateField,
    isSaving,
    hasUnsavedChanges,
    saveError,
    forceSave,
  };
}
