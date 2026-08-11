import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { handleApiError, successResponse } from '@/lib/api-errors';
import { NotFoundError, AuthorizationError, ValidationError, DatabaseError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { normalizeOwner } from '@/lib/owner-normalizer';
import { rowToTask, taskToRow, TaskRow } from '@/lib/db-mappers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      if (!id) throw new ValidationError('Task ID is required');

      const db = getSupabaseAdmin();
      const { data: row, error } = await db.from('tasks').select('*').eq('id', id).maybeSingle();
      if (error) throw new DatabaseError('Task fetch', error.message);
      if (!row) throw new NotFoundError('Task', id);

      const task = rowToTask(row as TaskRow);

      const { data: member } = await db
        .from('project_members')
        .select('user_id')
        .eq('project_id', task.projectId)
        .eq('user_id', user.uid)
        .maybeSingle();

      if (!member) {
        throw new AuthorizationError('You do not have access to this task');
      }

      logger.apiResponse('GET', `/api/tasks/${id}`, 200, undefined, { userId: user.uid, taskId: id });

      return successResponse(task);
    } catch (error) {
      return handleApiError(error, { endpoint: '/api/tasks/[id]', method: 'GET', userId: user.uid });
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

      if (!id) throw new ValidationError('Task ID is required');

      const db = getSupabaseAdmin();
      const { data: existingRow, error: fetchError } = await db.from('tasks').select('*').eq('id', id).maybeSingle();
      if (fetchError) throw new DatabaseError('Task fetch', fetchError.message);
      if (!existingRow) throw new NotFoundError('Task', id);

      const existingTask = rowToTask(existingRow as TaskRow);

      const { data: member } = await db
        .from('project_members')
        .select('role')
        .eq('project_id', existingTask.projectId)
        .eq('user_id', user.uid)
        .maybeSingle();

      if (!member) {
        throw new AuthorizationError('You are not a member of this project');
      }

      const roleHierarchy = { VIEW: 1, EDIT: 2, ADMIN: 3 };
      if (roleHierarchy[member.role as keyof typeof roleHierarchy] < roleHierarchy.EDIT) {
        throw new AuthorizationError('You need EDIT permission to update tasks');
      }

      // `projectId` can't be changed via update (mirrors the old rule).
      const updates = { ...body, projectId: existingTask.projectId, id: undefined };

      if (Object.prototype.hasOwnProperty.call(body, 'owner')) {
        const { owner: normalizedOwner } = await normalizeOwner(body.owner, {
          userId: user.uid,
          taskId: id,
        });
        updates.owner = normalizedOwner;
      }

      const updateRow = taskToRow(updates);

      const { data: updatedRow, error: updateError } = await db
        .from('tasks')
        .update(updateRow)
        .eq('id', id)
        .select('*')
        .single();

      if (updateError) throw new DatabaseError('Task update', updateError.message);

      logger.apiResponse('PUT', `/api/tasks/${id}`, 200, undefined, { userId: user.uid, taskId: id });

      return successResponse(rowToTask(updatedRow as TaskRow));
    } catch (error) {
      return handleApiError(error, { endpoint: '/api/tasks/[id]', method: 'PUT', userId: user.uid });
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
      if (!id) throw new ValidationError('Task ID is required');

      const db = getSupabaseAdmin();
      const { data: row, error: fetchError } = await db.from('tasks').select('*').eq('id', id).maybeSingle();
      if (fetchError) throw new DatabaseError('Task fetch', fetchError.message);
      if (!row) throw new NotFoundError('Task', id);

      const task = rowToTask(row as TaskRow);

      const { data: member } = await db
        .from('project_members')
        .select('role')
        .eq('project_id', task.projectId)
        .eq('user_id', user.uid)
        .maybeSingle();

      if (!member) {
        throw new AuthorizationError('You are not a member of this project');
      }

      const roleHierarchy = { VIEW: 1, EDIT: 2, ADMIN: 3 };
      if (roleHierarchy[member.role as keyof typeof roleHierarchy] < roleHierarchy.EDIT) {
        throw new AuthorizationError('You need EDIT permission to delete tasks');
      }

      const { error: deleteError } = await db.from('tasks').delete().eq('id', id);
      if (deleteError) throw new DatabaseError('Task deletion', deleteError.message);

      logger.apiResponse('DELETE', `/api/tasks/${id}`, 200, undefined, { userId: user.uid, taskId: id });

      return successResponse({ success: true });
    } catch (error) {
      return handleApiError(error, { endpoint: '/api/tasks/[id]', method: 'DELETE', userId: user.uid });
    }
  });
}
