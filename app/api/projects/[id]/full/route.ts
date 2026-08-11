import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, checkProjectPermission } from '@/lib/auth-middleware';
import { logger } from '@/lib/logger';
import { DEFAULT_TOPIC_OPTIONS } from '@/lib/constants';
import { rowToProject, ProjectRow } from '@/lib/db-mappers';

/**
 * GET /api/projects/[id]/full
 * Returns project details + settings in a single call
 * Reduces 2 API calls to 1 when switching projects
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id: projectId } = await params;

      // Check permission (throws on failure)
      await checkProjectPermission(user.uid, projectId, 'VIEW');

      const db = getSupabaseAdmin();

      const [{ data: projectRow, error: projectError }, { count: memberCount }] = await Promise.all([
        db.from('projects').select('*').eq('id', projectId).maybeSingle(),
        db.from('project_members').select('user_id', { count: 'exact', head: true }).eq('project_id', projectId),
      ]);

      if (projectError || !projectRow) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const project = rowToProject(projectRow as ProjectRow);

      const settings = project.settings || {
        statusOptions: [
          { id: 'todo', label: 'To Do', color: '#94a3b8' },
          { id: 'in-progress', label: 'In Progress', color: '#3b82f6' },
          { id: 'review', label: 'Review', color: '#f59e0b' },
          { id: 'done', label: 'Done', color: '#10b981' },
        ],
        priorityOptions: [
          { id: 'low', label: 'Low', color: '#94a3b8' },
          { id: 'medium', label: 'Medium', color: '#f59e0b' },
          { id: 'high', label: 'High', color: '#ef4444' },
        ],
        topicOptions: DEFAULT_TOPIC_OPTIONS,
        customFields: [],
      };

      logger.info('Fetched full project data', {
        projectId,
        userId: user.uid,
        memberCount: memberCount || 0,
      });

      return NextResponse.json({
        project,
        settings,
        memberCount: memberCount || 0,
      });
    } catch (error) {
      logger.error('Error fetching full project data', error as Error, {
        userId: user.uid,
      });
      return NextResponse.json(
        { error: 'Failed to fetch project data' },
        { status: 500 }
      );
    }
  });
}
