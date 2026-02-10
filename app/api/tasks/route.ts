import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';
import { Task } from '@/types';
import { handleApiError, successResponse } from '@/lib/api-errors';
import { ValidationError, DatabaseError, AuthorizationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { TASKS_PER_PAGE } from '@/lib/constants';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const projectId = searchParams.get('projectId');
      const limit = parseInt(searchParams.get('limit') || String(TASKS_PER_PAGE));
      const cursor = searchParams.get('cursor'); // For cursor-based pagination

      if (!projectId) {
        throw new ValidationError('Project ID is required');
      }

      // Validate limit
      if (limit < 1 || limit > 100) {
        throw new ValidationError('Limit must be between 1 and 100');
      }

      // Check if user has access to this project
      // This will throw AuthorizationError if user doesn't have access
      const projectRef = adminDb.collection('projects').doc(projectId);
      const projectDoc = await projectRef.get();

      if (!projectDoc.exists) {
        throw new ValidationError(`Project '${projectId}' not found`);
      }

      const projectData = projectDoc.data();
      
      interface ProjectMember {
        userId: string;
        role?: string;
      }
      
      const members = (projectData?.members || []) as ProjectMember[];
      const isMember = members.some((m: ProjectMember) => m.userId === user.uid);

      if (!isMember) {
        throw new AuthorizationError('You do not have access to this project');
      }

      logger.apiRequest('GET', '/api/tasks', {
        userId: user.uid,
        projectId,
        limit,
        hasCursor: !!cursor,
      });

      const tasksRef = adminDb.collection('tasks');
      let query = tasksRef
        .where('projectId', '==', projectId)
        .orderBy('createdAt', 'desc')
        .limit(limit + 1); // Fetch one extra to determine if there are more

      // Apply cursor if provided (cursor-based pagination)
      if (cursor) {
        try {
          const cursorDoc = await adminDb.collection('tasks').doc(cursor).get();
          if (cursorDoc.exists) {
            query = query.startAfter(cursorDoc);
          }
        } catch (error) {
          logger.warn('Invalid cursor provided', {
            userId: user.uid,
            projectId,
            cursor,
          });
        }
      }

      const snapshot = await query.get();
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Check if there are more results
      const hasMore = tasks.length > limit;
      if (hasMore) {
        tasks.pop(); // Remove the extra item
      }

      // Get the last task ID for next cursor
      const nextCursor = hasMore && tasks.length > 0 ? tasks[tasks.length - 1].id : null;

      logger.apiResponse('GET', '/api/tasks', 200, undefined, {
        userId: user.uid,
        projectId,
        taskCount: tasks.length,
        hasMore,
      });

      return successResponse({
        tasks,
        hasMore,
        nextCursor,
        total: tasks.length,
      });
    } catch (error) {
      return handleApiError(error, {
        endpoint: '/api/tasks',
        method: 'GET',
        userId: user.uid,
      });
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await request.json();

      if (!body.projectId) {
        throw new ValidationError('Project ID is required');
      }

      if (!body.title || body.title.trim().length === 0) {
        throw new ValidationError('Task title is required');
      }

      // Check if user has EDIT permission
      const projectRef = adminDb.collection('projects').doc(body.projectId);
      const projectDoc = await projectRef.get();

      if (!projectDoc.exists) {
        throw new ValidationError(`Project '${body.projectId}' not found`);
      }

      const projectData = projectDoc.data();
      
      interface ProjectMember {
        userId: string;
        role?: string;
      }
      
      const members = (projectData?.members || []) as ProjectMember[];
      const member = members.find((m: ProjectMember) => m.userId === user.uid);

      if (!member) {
        throw new AuthorizationError('You are not a member of this project');
      }

      // Check role hierarchy
      const roleHierarchy = { VIEW: 1, EDIT: 2, ADMIN: 3 };
      if (roleHierarchy[member.role as keyof typeof roleHierarchy] < roleHierarchy.EDIT) {
        throw new AuthorizationError('You need EDIT permission to create tasks');
      }

      logger.apiRequest('POST', '/api/tasks', {
        userId: user.uid,
        projectId: body.projectId,
      });

      const tasksRef = adminDb.collection('tasks');
      const newTaskRef = tasksRef.doc();

      // Create initial status history entry
      const initialStatusHistory = [{
        id: Date.now().toString(),
        fromStatus: null,
        toStatus: body.status || 'todo',
        changedBy: user.displayName || user.uid,
        changedAt: new Date().toISOString(),
      }];

      const newTask: Task = {
        id: newTaskRef.id,
        title: body.title || '',
        description: body.description || '',
        subTasks: body.subTasks || [],
        deadline: body.deadline || null,
        status: body.status || 'todo',
        links: body.links || [],
        owner: body.owner || user.displayName,
        projectId: body.projectId,
        priority: body.priority || 'medium',
        tags: body.tags || [],
        images: body.images || [],
        comments: body.comments || [],
        statusHistory: body.statusHistory || initialStatusHistory,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await newTaskRef.set(newTask);

      logger.apiResponse('POST', '/api/tasks', 201, undefined, {
        userId: user.uid,
        projectId: body.projectId,
        taskId: newTask.id,
      });

      return successResponse(newTask, 201);
    } catch (error) {
      return handleApiError(error, {
        endpoint: '/api/tasks',
        method: 'POST',
        userId: user.uid,
      });
    }
  });
}
