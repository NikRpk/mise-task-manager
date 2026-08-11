// Server-side authentication middleware for API routes
import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from './supabase/admin';
import { ProjectRole } from '@/types';
import { AuthenticationError, AuthorizationError, NotFoundError, DatabaseError } from './errors';
import { logger } from './logger';
import { handleApiError } from './api-errors';
import { ensureUserSettings } from './user-init';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string;
    email: string;
    displayName: string;
  };
}

/**
 * Verify a Supabase access token from the request's Authorization header.
 * @throws AuthenticationError if token is invalid or missing
 */
export async function verifyAuth(request: NextRequest): Promise<{
  uid: string;
  email: string;
  displayName: string;
}> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const { data, error } = await getSupabaseAdmin().auth.getUser(token);

    if (error || !data.user) {
      throw new AuthenticationError('Invalid or expired authentication token');
    }

    const meta = data.user.user_metadata || {};

    return {
      uid: data.user.id,
      email: data.user.email || '',
      displayName: meta.full_name || meta.name || data.user.email?.split('@')[0] || 'User',
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }

    logger.error('Error verifying auth token', error as Error, {
      hasAuthHeader: !!request.headers.get('authorization'),
    });

    throw new AuthenticationError('Invalid or expired authentication token');
  }
}

/**
 * Check if user has the required permission level for a project
 * @throws NotFoundError if project doesn't exist
 * @throws AuthorizationError if user doesn't have required permissions
 */
export async function checkProjectPermission(
  userId: string,
  projectId: string,
  requiredRole: ProjectRole
): Promise<void> {
  try {
    const { data: project, error: projectError } = await getSupabaseAdmin()
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .maybeSingle();

    if (projectError) throw projectError;
    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    const { data: member, error: memberError } = await getSupabaseAdmin()
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError) throw memberError;
    if (!member) {
      throw new AuthorizationError('You are not a member of this project');
    }

    const roleHierarchy: { [key in ProjectRole]: number } = {
      VIEW: 1,
      EDIT: 2,
      ADMIN: 3,
    };

    if (roleHierarchy[member.role as ProjectRole] < roleHierarchy[requiredRole]) {
      throw new AuthorizationError(
        `This action requires ${requiredRole} permission, but you have ${member.role}`
      );
    }
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      throw error;
    }

    logger.error('Error checking project permission', error as Error, {
      userId,
      projectId,
      requiredRole,
    });

    throw new DatabaseError('Permission check', 'Failed to verify project permissions');
  }
}

/**
 * Get user's role in a project
 * @returns The user's role or null if not a member
 * @throws NotFoundError if project doesn't exist
 */
export async function getUserProjectRole(
  userId: string,
  projectId: string
): Promise<ProjectRole | null> {
  const { data: project, error: projectError } = await getSupabaseAdmin()
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) {
    logger.error('Error getting user project role', projectError, { userId, projectId });
    throw new DatabaseError('Role fetch', 'Failed to get user role');
  }
  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  const { data: member, error: memberError } = await getSupabaseAdmin()
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (memberError) {
    logger.error('Error getting user project role', memberError, { userId, projectId });
    throw new DatabaseError('Role fetch', 'Failed to get user role');
  }

  return (member?.role as ProjectRole) || null;
}

/**
 * Middleware wrapper for protected API routes
 * Automatically handles authentication errors and ensures user settings exist
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: { uid: string; email: string; displayName: string }) => Promise<Response>
): Promise<Response> {
  try {
    const user = await verifyAuth(request);

    ensureUserSettings(user.uid, user.email, user.displayName).catch(err => {
      logger.error('Background user settings initialization failed', err);
    });

    return await handler(request, user);
  } catch (error) {
    return handleApiError(error, {
      endpoint: request.nextUrl.pathname,
      method: request.method,
    });
  }
}
