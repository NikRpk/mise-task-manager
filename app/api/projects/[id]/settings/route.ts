import { NextRequest, NextResponse } from 'next/server';
import { withAuth, checkProjectPermission } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';
import { ProjectSettings } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;

      // Check if user has access
      const hasAccess = await checkProjectPermission(user.uid, id, 'VIEW');
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const projectRef = adminDb.collection('projects').doc(id);
      const projectDoc = await projectRef.get();

      if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const projectData = projectDoc.data();
      const settings = projectData?.settings || {
        statusOptions: [],
        priorityOptions: [],
        customFields: [],
      };

      return NextResponse.json(settings);
    } catch (error) {
      console.error('Error fetching project settings:', error);
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

      // Check if user has ADMIN permission
      const hasPermission = await checkProjectPermission(user.uid, id, 'ADMIN');
      if (!hasPermission) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      const projectRef = adminDb.collection('projects').doc(id);
      const projectDoc = await projectRef.get();

      if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const settings: ProjectSettings = {
        statusOptions: body.statusOptions || [],
        priorityOptions: body.priorityOptions || [],
        customFields: body.customFields || [],
      };

      await projectRef.update({
        settings,
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json(settings);
    } catch (error) {
      console.error('Error updating project settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
  });
}
