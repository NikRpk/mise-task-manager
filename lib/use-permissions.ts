/**
 * Custom hook to fetch and manage user permissions for a project
 * Provides role-based access control information to UI components
 */

import { useState, useEffect } from 'react';
import { authenticatedFetch } from './api-client';
import { ProjectRole } from '@/types';
import { logger } from './logger';

interface PermissionState {
  role: ProjectRole | null;
  loading: boolean;
  error: string | null;
  canView: boolean;
  canEdit: boolean;
  canAdmin: boolean;
}

/**
 * Hook to get user's permissions for a specific project
 * @param projectId - The project ID to check permissions for
 * @returns Permission state including role and capability flags
 */
export function useProjectPermissions(projectId: string | null): PermissionState {
  const [state, setState] = useState<PermissionState>({
    role: null,
    loading: true,
    error: null,
    canView: false,
    canEdit: false,
    canAdmin: false,
  });

  useEffect(() => {
    if (!projectId) {
      setState({
        role: null,
        loading: false,
        error: null,
        canView: false,
        canEdit: false,
        canAdmin: false,
      });
      return;
    }

    let cancelled = false;

    const fetchPermissions = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const response = await authenticatedFetch(
          `/api/projects/${projectId}/permissions`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch permissions');
        }

        const data = await response.json();
        const role = data.role as ProjectRole | null;

        if (cancelled) return;

        // Calculate capabilities based on role hierarchy
        // VIEW < EDIT < ADMIN
        const canView = role !== null;
        const canEdit = role === 'EDIT' || role === 'ADMIN';
        const canAdmin = role === 'ADMIN';

        setState({
          role,
          loading: false,
          error: null,
          canView,
          canEdit,
          canAdmin,
        });
      } catch (error) {
        if (cancelled) return;

        logger.error('Failed to fetch project permissions', error as Error, {
          projectId,
        });

        setState({
          role: null,
          loading: false,
          error: 'Failed to load permissions',
          canView: false,
          canEdit: false,
          canAdmin: false,
        });
      }
    };

    fetchPermissions();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return state;
}

/**
 * Simple helper to check if a role has specific permission
 * @param role - The user's role
 * @param requiredRole - The required role level
 * @returns True if user has required permission or higher
 */
export function hasPermission(
  role: ProjectRole | null,
  requiredRole: ProjectRole
): boolean {
  if (!role) return false;

  const roleHierarchy: Record<ProjectRole, number> = {
    VIEW: 1,
    EDIT: 2,
    ADMIN: 3,
  };

  return roleHierarchy[role] >= roleHierarchy[requiredRole];
}
