/**
 * Custom hook for managing project data and operations
 * Extracted from app/page.tsx to improve maintainability
 */

import { useState, useCallback, useEffect } from 'react';
import { Project } from '@/types';
import { authenticatedFetch } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { DEFAULT_PROJECT_ICON } from '@/lib/constants';

interface UseProjectDataResult {
  projects: Project[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  loading: boolean;
  createProject: (name: string, icon?: string) => Promise<void>;
  refetchProjects: () => Promise<void>;
}

/**
 * Hook to manage projects list and selection
 * @param userId - Current user ID
 * @returns Project data and operations
 */
export function useProjectData(userId: string | undefined): UseProjectDataResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const res = await authenticatedFetch('/api/projects');
      const data = await res.json();
      setProjects(data);
      
      // Auto-select first project if none selected
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      logger.error('Failed to fetch projects', error as Error, {
        userId,
      });
    } finally {
      setLoading(false);
    }
  }, [userId, selectedProjectId]);

  const createProject = useCallback(async (name: string, icon?: string) => {
    try {
      const res = await authenticatedFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ 
          name, 
          description: '', 
          icon: icon || DEFAULT_PROJECT_ICON 
        }),
      });
      const newProject = await res.json();
      
      setProjects(prev => [...prev, newProject]);
      setSelectedProjectId(newProject.id);
    } catch (error) {
      logger.error('Failed to create project', error as Error, {
        projectName: name,
        userId,
      });
      throw error; // Re-throw so caller can handle
    }
  }, [userId]);

  // Fetch projects on mount
  useEffect(() => {
    if (userId) {
      fetchProjects();
    }
  }, [userId, fetchProjects]);

  return {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    loading,
    createProject,
    refetchProjects: fetchProjects,
  };
}
