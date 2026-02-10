/**
 * Custom hook for managing project data and operations
 * Extracted from app/page.tsx to improve maintainability
 * Now with caching for better performance
 */

import { useState, useCallback, useEffect } from 'react';
import { Project } from '@/types';
import { authenticatedFetch } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { DEFAULT_PROJECT_ICON } from '@/lib/constants';
import { useCachedFetch, useCache } from '@/lib/cache-context';

interface UseProjectDataResult {
  projects: Project[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  loading: boolean;
  createProject: (name: string, icon?: string) => Promise<void>;
  refetchProjects: () => Promise<unknown>;
}

/**
 * Hook to manage projects list and selection
 * @param userId - Current user ID
 * @returns Project data and operations
 */
export function useProjectData(userId: string | undefined): UseProjectDataResult {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const cache = useCache();

  // Check for cache invalidation flag from localStorage (e.g., after project deletion)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const shouldInvalidate = localStorage.getItem('invalidate-projects-cache');
      if (shouldInvalidate === 'true') {
        cache.invalidate('user-projects');
        localStorage.removeItem('invalidate-projects-cache');
      }
    }
  }, [cache]);

  // Use cached fetch with 30-minute TTL
  const { data: projects, isLoading, refetch } = useCachedFetch<Project[]>(
    'user-projects',
    async () => {
      const res = await authenticatedFetch('/api/projects');
      return res.json();
    },
    {
      ttl: 30 * 60 * 1000, // 30 minutes
      enabled: !!userId,
      onError: (error) => {
        logger.error('Failed to fetch projects', error, { userId });
      },
    }
  );

  // Auto-select first project if none selected
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      // Use React's own scheduling via callback form to avoid immediate setState
      setTimeout(() => {
        setSelectedProjectId(projects[0].id);
      }, 0);
    }
  }, [projects, selectedProjectId]);

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
      
      // Invalidate cache and refetch to get fresh data
      cache.invalidate('user-projects');
      await refetch();
      setSelectedProjectId(newProject.id);
    } catch (error) {
      logger.error('Failed to create project', error as Error, {
        projectName: name,
        userId,
      });
      throw error; // Re-throw so caller can handle
    }
  }, [userId, cache, refetch]);

  return {
    projects: projects || [],
    selectedProjectId,
    setSelectedProjectId,
    loading: isLoading,
    createProject,
    refetchProjects: refetch,
  };
}
