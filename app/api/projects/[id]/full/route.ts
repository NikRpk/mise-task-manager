import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { withAuth, checkProjectPermission } from '@/lib/auth-middleware';
import { logger } from '@/lib/logger';

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

      // Fetch project and members in parallel
      const [projectDoc, membersSnapshot] = await Promise.all([
        adminDb.collection('projects').doc(projectId).get(),
        adminDb.collection('projects').doc(projectId).collection('members').get(),
      ]);

      if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const projectData = projectDoc.data();
      const project = {
        id: projectDoc.id,
        ...projectData,
      };

      // Settings are stored in the project document itself, not a subcollection
      const settings = projectData?.settings || {
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
        customFields: [],
      };

      const memberCount = membersSnapshot.size;

      logger.info('Fetched full project data', {
        projectId,
        userId: user.uid,
        memberCount,
      });

      return NextResponse.json({
        project,
        settings,
        memberCount,
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
