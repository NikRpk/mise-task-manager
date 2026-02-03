// Server-side authentication middleware for API routes
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from './firebase-admin';
import { ProjectRole } from '@/types';
import { AuthenticationError, AuthorizationError, NotFoundError, DatabaseError } from './errors';
import { logger } from './logger';
import { handleApiError } from './api-errors';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string;
    email: string;
    displayName: string;
  };
}

/**
 * Verify Firebase authentication token from request headers
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
    const decodedToken = await adminAuth.verifyIdToken(token);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      displayName: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
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
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      throw new NotFoundError('Project', projectId);
    }

    const projectData = projectDoc.data();
    const members = projectData?.members || [];

    const member = members.find((m: any) => m.userId === userId);
    if (!member) {
      throw new AuthorizationError('You are not a member of this project');
    }

    // Role hierarchy: VIEW < EDIT < ADMIN
    const roleHierarchy: { [key in ProjectRole]: number } = {
      VIEW: 1,
      EDIT: 2,
      ADMIN: 3,
    };

    if (roleHierarchy[member.role] < roleHierarchy[requiredRole]) {
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
  try {
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      throw new NotFoundError('Project', projectId);
    }

    const projectData = projectDoc.data();
    const members = projectData?.members || [];

    const member = members.find((m: any) => m.userId === userId);
    return member?.role || null;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    
    logger.error('Error getting user project role', error as Error, {
      userId,
      projectId,
    });
    
    throw new DatabaseError('Role fetch', 'Failed to get user role');
  }
}

/**
 * Middleware wrapper for protected API routes
 * Automatically handles authentication errors
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: { uid: string; email: string; displayName: string }) => Promise<Response>
): Promise<Response> {
  try {
    const user = await verifyAuth(request);
    return await handler(request, user);
  } catch (error) {
    return handleApiError(error, {
      endpoint: request.nextUrl.pathname,
      method: request.method,
    });
  }
}

/**
 * Middleware wrapper for project-specific routes with permission check
 * Automatically handles authentication and authorization errors
 */
export async function withProjectPermission(
  request: NextRequest,
  projectId: string,
  requiredRole: ProjectRole,
  handler: (request: NextRequest, user: { uid: string; email: string; displayName: string }) => Promise<Response>
): Promise<Response> {
  try {
    const user = await verifyAuth(request);
    await checkProjectPermission(user.uid, projectId, requiredRole);
    return await handler(request, user);
  } catch (error) {
    return handleApiError(error, {
      endpoint: request.nextUrl.pathname,
      method: request.method,
      projectId,
      requiredRole,
    });
  }
}
