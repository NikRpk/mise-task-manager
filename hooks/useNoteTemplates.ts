/**
 * Custom hook for managing note templates
 */

import { useState, useCallback, useEffect } from 'react';
import { NoteTemplate } from '@/types';
import { authenticatedFetch } from '@/lib/api-client';
import { logger } from '@/lib/logger';

interface UseNoteTemplatesResult {
  templates: NoteTemplate[];
  loading: boolean;
  fetchTemplates: () => Promise<void>;
  createTemplate: (template: Partial<NoteTemplate>) => Promise<NoteTemplate>;
  updateTemplate: (templateId: string, updates: Partial<NoteTemplate>) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
}

/**
 * Hook to manage note templates
 * @param userId - Current user ID
 * @returns Template data and operations
 */
export function useNoteTemplates(userId: string | undefined): UseNoteTemplatesResult {
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const res = await authenticatedFetch('/api/note-templates');
      const data = await res.json();
      
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      logger.error('Failed to fetch templates', error as Error, { userId });
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createTemplate = useCallback(async (template: Partial<NoteTemplate>): Promise<NoteTemplate> => {
    if (!userId) throw new Error('User not authenticated');

    try {
      const res = await authenticatedFetch('/api/note-templates', {
        method: 'POST',
        body: JSON.stringify(template),
      });
      
      if (!res.ok) {
        throw new Error('Failed to create template');
      }
      
      const newTemplate = await res.json();
      setTemplates(prev => [...prev, newTemplate]);
      
      return newTemplate;
    } catch (error) {
      logger.error('Failed to create template', error as Error, { userId });
      throw error;
    }
  }, [userId]);

  const updateTemplate = useCallback(async (templateId: string, updates: Partial<NoteTemplate>) => {
    if (!userId) return;

    try {
      const res = await authenticatedFetch(`/api/note-templates/${templateId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      
      if (!res.ok) {
        throw new Error('Failed to update template');
      }
      
      const updatedTemplate = await res.json();
      setTemplates(prev => prev.map(t => 
        t.id === templateId ? updatedTemplate : t
      ));
    } catch (error) {
      logger.error('Failed to update template', error as Error, { userId, templateId });
      throw error;
    }
  }, [userId]);

  const deleteTemplate = useCallback(async (templateId: string) => {
    if (!userId) return;

    try {
      const res = await authenticatedFetch(`/api/note-templates/${templateId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete template');
      }
      
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (error) {
      logger.error('Failed to delete template', error as Error, { userId, templateId });
      throw error;
    }
  }, [userId]);

  // Fetch templates on mount
  useEffect(() => {
    if (userId) {
      fetchTemplates();
    }
  }, [userId, fetchTemplates]);

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
