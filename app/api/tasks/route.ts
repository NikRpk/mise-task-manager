import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { handleApiError, successResponse } from '@/lib/api-errors';
import { ValidationError, DatabaseError, AuthorizationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { TASKS_PER_PAGE } from '@/lib/constants';
import { normalizeOwner } from '@/lib/owner-normalizer';
import { rowToTask, TaskRow } from '@/lib/db-mappers';
import { StatusHistoryEntry } from '@/types';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const projectId = searchParams.get('projectId');
      const limit = parseInt(searchParams.get('limit') || String(TASKS_PER_PAGE));
      const cursor = searchParams.get('cursor'); // task id to start after

      if (!projectId) {
        throw new ValidationError('Project ID is required');
      }

      if (limit < 1 || limit > 500) {
        throw new ValidationError('Limit must be between 1 and 500');
      }

      const db = getSupabaseAdmin();

      const { data: project, error: projectError } = await db
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .maybeSingle();

      if (projectError) throw new DatabaseError('Project fetch', projectError.message);
      if (!project) {
        throw new ValidationError(`Project '${projectId}' not found`);
      }

      const { data: member, error: memberError } = await db
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)
        .eq('user_id', user.uid)
        .maybeSingle();

      if (memberError) throw new DatabaseError('Membership check', memberError.message);
      if (!member) {
        throw new AuthorizationError('You do not have access to this project');
      }

      logger.apiRequest('GET', '/api/tasks', {
        userId: user.uid,
        projectId,
        limit,
        hasCursor: !!cursor,
      });

      let query = db
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit + 1); // fetch one extra to determine if there are more

      if (cursor) {
        const { data: cursorTask } = await db.from('tasks').select('created_at').eq('id', cursor).maybeSingle();
        if (cursorTask) {
          query = query.lt('created_at', cursorTask.created_at);
        }
      }

      const { data: rows, error: tasksError } = await query;
      if (tasksError) throw new DatabaseError('Tasks fetch', tasksError.message);

      const tasks = ((rows as TaskRow[]) || []).map(rowToTask);

      const hasMore = tasks.length > limit;
      if (hasMore) {
        tasks.pop();
      }

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

      logger.debug('API POST /api/tasks: Received request', {
        projectId: body.projectId,
        title: body.title,
        description: body.description?.substring(0, 50),
        hasRecurringFields: !!body.isRecurring,
      });

      if (!body.projectId) {
        throw new ValidationError('Project ID is required');
      }

      if ((!body.title || body.title.trim().length === 0) && (!body.description || body.description.trim().length === 0)) {
        throw new ValidationError('Task title or description is required');
      }

      const db = getSupabaseAdmin();

      const { data: member, error: memberError } = await db
        .from('project_members')
        .select('role')
        .eq('project_id', body.projectId)
        .eq('user_id', user.uid)
        .maybeSingle();

      if (memberError) throw new DatabaseError('Membership check', memberError.message);
      if (!member) {
        throw new AuthorizationError('You are not a member of this project');
      }

      const roleHierarchy = { VIEW: 1, EDIT: 2, ADMIN: 3 };
      if (roleHierarchy[member.role as keyof typeof roleHierarchy] < roleHierarchy.EDIT) {
        throw new AuthorizationError('You need EDIT permission to create tasks');
      }

      logger.apiRequest('POST', '/api/tasks', {
        userId: user.uid,
        projectId: body.projectId,
      });

      const initialStatusHistory: StatusHistoryEntry[] = [{
        id: Date.now().toString(),
        fromStatus: null,
        toStatus: body.status || 'todo',
        changedBy: user.displayName || user.uid,
        changedAt: new Date().toISOString(),
      }];

      const { owner: normalizedOwner } = await normalizeOwner(
        body.owner || user.email,
        { userId: user.uid }
      );

      const insertRow = {
        project_id: body.projectId,
        title: body.title || '',
        description: body.description || '',
        sub_tasks: body.subTasks || [],
        deadline: body.deadline || null,
        status: body.status || 'todo',
        owner: normalizedOwner,
        priority: body.priority || 'medium',
        images: body.images || [],
        comments: body.comments || [],
        status_history: body.statusHistory || initialStatusHistory,
        topic_id: body.topicId ?? null,
        is_recurring: body.isRecurring ?? false,
        recurrence_interval: body.recurrenceInterval ?? null,
        recurrence_unit: body.recurrenceUnit ?? null,
        parent_recurring_task_id: body.parentRecurringTaskId ?? null,
      };

      const { data: row, error: insertError } = await db
        .from('tasks')
        .insert(insertRow)
        .select('*')
        .single();

      if (insertError) throw new DatabaseError('Task creation', insertError.message);

      const newTask = rowToTask(row as TaskRow);

      logger.info('API POST /api/tasks: Task created successfully', {
        id: newTask.id,
        title: newTask.title,
        projectId: newTask.projectId,
      });

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
