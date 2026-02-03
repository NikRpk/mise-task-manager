import { NextRequest, NextResponse } from 'next/server';
import { withAuth, checkProjectPermission } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      const projectRef = adminDb.collection('projects').doc(id);
      const projectDoc = await projectRef.get();

      if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Check if user has access (throws on failure)
      await checkProjectPermission(user.uid, id, 'VIEW');

      return NextResponse.json({ id: projectDoc.id, ...projectDoc.data() });
    } catch (error) {
      console.error('Error fetching project:', error);
      return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
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

      // Check if user has ADMIN permission (throws on failure)
      await checkProjectPermission(user.uid, id, 'ADMIN');

      const projectRef = adminDb.collection('projects').doc(id);
      const projectDoc = await projectRef.get();

      if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const updatedProject = {
        ...body,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString(),
      };

      await projectRef.update(updatedProject);

      return NextResponse.json({ id, ...projectDoc.data(), ...updatedProject });
    } catch (error) {
      console.error('Error updating project:', error);
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
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

      // Check if user has ADMIN permission (throws on failure)
      await checkProjectPermission(user.uid, id, 'ADMIN');

      const projectRef = adminDb.collection('projects').doc(id);
      const projectDoc = await projectRef.get();

      if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Delete all tasks in the project
      const tasksRef = adminDb.collection('tasks');
      const tasksSnapshot = await tasksRef.where('projectId', '==', id).get();

      const batch = adminDb.batch();
      tasksSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete the project
      batch.delete(projectRef);

      await batch.commit();

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting project:', error);
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }
  });
}
