import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';
import { handleApiError, successResponse } from '@/lib/api-errors';
import { NotFoundError, AuthorizationError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      
      if (!id) {
        throw new ValidationError('Task ID is required');
      }

      const taskRef = adminDb.collection('tasks').doc(id);
      const taskDoc = await taskRef.get();

      if (!taskDoc.exists) {
        throw new NotFoundError('Task', id);
      }

      const task = { id: taskDoc.id, ...taskDoc.data() };

      // Check if user has access to the project
      const projectRef = adminDb.collection('projects').doc(task.projectId);
      const projectDoc = await projectRef.get();

      if (!projectDoc.exists) {
        throw new NotFoundError('Project', task.projectId);
      }

      const projectData = projectDoc.data();
      const members = projectData?.members || [];
      const isMember = members.some((m: any) => m.userId === user.uid);

      if (!isMember) {
        throw new AuthorizationError('You do not have access to this task');
      }

      logger.apiResponse('GET', `/api/tasks/${id}`, 200, undefined, {
        userId: user.uid,
        taskId: id,
      });

      return successResponse(task);
    } catch (error) {
      return handleApiError(error, {
        endpoint: '/api/tasks/[id]',
        method: 'GET',
        userId: user.uid,
      });
    }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      const body = await request.json();

      if (!id) {
        throw new ValidationError('Task ID is required');
      }

      const taskRef = adminDb.collection('tasks').doc(id);
      const taskDoc = await taskRef.get();

      if (!taskDoc.exists) {
        throw new NotFoundError('Task', id);
      }

      const task = taskDoc.data();

      // Check if user has EDIT permission
      const projectRef = adminDb.collection('projects').doc(task?.projectId);
      const projectDoc = await projectRef.get();

      if (!projectDoc.exists) {
        throw new NotFoundError('Project', task?.projectId);
      }

      const projectData = projectDoc.data();
      const members = projectData?.members || [];
      const member = members.find((m: any) => m.userId === user.uid);

      if (!member) {
        throw new AuthorizationError('You are not a member of this project');
      }

      // Check role hierarchy
      const roleHierarchy = { VIEW: 1, EDIT: 2, ADMIN: 3 };
      if (roleHierarchy[member.role as keyof typeof roleHierarchy] < roleHierarchy.EDIT) {
        throw new AuthorizationError('You need EDIT permission to update tasks');
      }

      const updatedTask = {
        ...body,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString(),
      };

      await taskRef.update(updatedTask);

      logger.apiResponse('PUT', `/api/tasks/${id}`, 200, undefined, {
        userId: user.uid,
        taskId: id,
      });

      return successResponse({ id, ...task, ...updatedTask });
    } catch (error) {
      return handleApiError(error, {
        endpoint: '/api/tasks/[id]',
        method: 'PUT',
        userId: user.uid,
      });
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;

      if (!id) {
        throw new ValidationError('Task ID is required');
      }

      const taskRef = adminDb.collection('tasks').doc(id);
      const taskDoc = await taskRef.get();

      if (!taskDoc.exists) {
        throw new NotFoundError('Task', id);
      }

      const task = taskDoc.data();

      // Check if user has EDIT permission (can delete)
      const projectRef = adminDb.collection('projects').doc(task?.projectId);
      const projectDoc = await projectRef.get();

      if (!projectDoc.exists) {
        throw new NotFoundError('Project', task?.projectId);
      }

      const projectData = projectDoc.data();
      const members = projectData?.members || [];
      const member = members.find((m: any) => m.userId === user.uid);

      if (!member) {
        throw new AuthorizationError('You are not a member of this project');
      }

      // Check role hierarchy
      const roleHierarchy = { VIEW: 1, EDIT: 2, ADMIN: 3 };
      if (roleHierarchy[member.role as keyof typeof roleHierarchy] < roleHierarchy.EDIT) {
        throw new AuthorizationError('You need EDIT permission to delete tasks');
      }

      await taskRef.delete();

      logger.apiResponse('DELETE', `/api/tasks/${id}`, 200, undefined, {
        userId: user.uid,
        taskId: id,
      });

      return successResponse({ success: true });
    } catch (error) {
      return handleApiError(error, {
        endpoint: '/api/tasks/[id]',
        method: 'DELETE',
        userId: user.uid,
      });
    }
  });
}
