import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { DEFAULT_PROJECT_ICON, DEFAULT_STATUS_OPTIONS, DEFAULT_PRIORITY_OPTIONS, DEFAULT_TOPIC_OPTIONS } from '@/lib/constants';
import { handleApiError, successResponse } from '@/lib/api-errors';
import { ValidationError, DatabaseError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { rowToProject, ProjectRow } from '@/lib/db-mappers';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      logger.apiRequest('GET', '/api/projects', { userId: user.uid });

      const db = getSupabaseAdmin();

      // Projects the user is a member of, newest activity first.
      const { data: memberships, error: membershipError } = await db
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.uid);

      if (membershipError) throw new DatabaseError('Membership fetch', membershipError.message);

      const projectIds = (memberships || []).map(m => m.project_id);
      if (projectIds.length === 0) {
        return successResponse([]);
      }

      const { data: rows, error: projectsError } = await db
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .order('updated_at', { ascending: false });

      if (projectsError) throw new DatabaseError('Projects fetch', projectsError.message);

      const projects = ((rows as ProjectRow[]) || []).map(row => rowToProject(row));

      logger.apiResponse('GET', '/api/projects', 200, undefined, {
        userId: user.uid,
        projectCount: projects.length,
      });

      return successResponse(projects);
    } catch (error) {
      return handleApiError(error, { endpoint: '/api/projects', method: 'GET', userId: user.uid });
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await request.json();

      if (!body.name || body.name.trim().length === 0) {
        throw new ValidationError('Project name is required');
      }

      logger.apiRequest('POST', '/api/projects', { userId: user.uid, projectName: body.name });

      const db = getSupabaseAdmin();

      const { data: projectRow, error: insertError } = await db
        .from('projects')
        .insert({
          name: body.name || 'New Project',
          description: body.description || '',
          icon: body.icon || DEFAULT_PROJECT_ICON,
          created_by: user.uid,
          settings: {
            statusOptions: DEFAULT_STATUS_OPTIONS,
            priorityOptions: DEFAULT_PRIORITY_OPTIONS,
            topicOptions: DEFAULT_TOPIC_OPTIONS,
            customFields: [],
          },
        })
        .select('*')
        .single();

      if (insertError) throw new DatabaseError('Project creation', insertError.message);

      const { error: memberError } = await db.from('project_members').insert({
        project_id: projectRow.id,
        user_id: user.uid,
        email: user.email,
        display_name: user.displayName,
        role: 'ADMIN',
        added_by: user.uid,
      });

      if (memberError) throw new DatabaseError('Project membership creation', memberError.message);

      const newProject = rowToProject(projectRow as ProjectRow, [{
        project_id: projectRow.id,
        user_id: user.uid,
        email: user.email,
        display_name: user.displayName,
        role: 'ADMIN',
        added_at: new Date().toISOString(),
        added_by: user.uid,
      }]);

      logger.apiResponse('POST', '/api/projects', 201, undefined, {
        userId: user.uid,
        projectId: newProject.id,
      });

      return successResponse(newProject, 201);
    } catch (error) {
      return handleApiError(error, { endpoint: '/api/projects', method: 'POST', userId: user.uid });
    }
  });
}
