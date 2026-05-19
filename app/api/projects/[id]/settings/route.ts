import { NextRequest, NextResponse } from 'next/server';
import { withAuth, checkProjectPermission } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';
import { ProjectSettings } from '@/types';
import { DEFAULT_TASK_COLOR_FIELD, DEFAULT_TOPIC_OPTIONS } from '@/lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;

      await checkProjectPermission(user.uid, id, 'VIEW');

      const projectRef = adminDb.collection('projects').doc(id);
      const projectDoc = await projectRef.get();

      if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const projectData = projectDoc.data();
      const settings = projectData?.settings || {
        statusOptions: [],
        priorityOptions: [],
        topicOptions: DEFAULT_TOPIC_OPTIONS,
        customFields: [],
        taskColorField: DEFAULT_TASK_COLOR_FIELD,
        topicFieldLabel: 'Topic',
      };

      return NextResponse.json(settings);
    } catch (error) {
      logger.error('Error fetching project settings', error as Error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
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

      await checkProjectPermission(user.uid, id, 'ADMIN');

      const projectRef = adminDb.collection('projects').doc(id);
      const projectDoc = await projectRef.get();

      if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const settings: ProjectSettings = {
        statusOptions: body.statusOptions || [],
        priorityOptions: body.priorityOptions || [],
        topicOptions: body.topicOptions || [],
        customFields: body.customFields || [],
        taskColorField: body.taskColorField || DEFAULT_TASK_COLOR_FIELD,
        topicFieldLabel: body.topicFieldLabel || 'Topic',
      };

      await projectRef.update({
        settings,
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json(settings);
    } catch (error) {
      logger.error('Error updating project settings', error as Error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
  });
}
