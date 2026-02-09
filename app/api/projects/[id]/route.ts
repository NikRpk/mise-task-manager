import { NextRequest, NextResponse } from 'next/server';
import { withAuth, checkProjectPermission } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';
import { handleApiError } from '@/lib/api-errors';

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

      // Check if user has ADMIN permission (throws if not)
      await checkProjectPermission(user.uid, id, 'ADMIN');

      const projectRef = adminDb.collection('projects').doc(id);
      const projectDoc = await projectRef.get();

      if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Delete all tasks in the project
      const tasksRef = adminDb.collection('tasks');
      const tasksSnapshot = await tasksRef.where('projectId', '==', id).get();

      // Firestore batch limit is 500 operations - need to chunk for large projects
      const taskDocs = tasksSnapshot.docs;
      const BATCH_SIZE = 499; // Leave room for project deletion
      
      // Delete tasks in chunks of 499
      for (let i = 0; i < taskDocs.length; i += BATCH_SIZE) {
        const chunk = taskDocs.slice(i, i + BATCH_SIZE);
        const batch = adminDb.batch();
        
        chunk.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
      }

      // Delete the project in a final batch
      const finalBatch = adminDb.batch();
      finalBatch.delete(projectRef);
      await finalBatch.commit();

      return NextResponse.json({ success: true, deletedTasks: taskDocs.length });
    } catch (error) {
      // Let the error handling middleware deal with it
      return handleApiError(error, {
        endpoint: '/api/projects/[id]',
        method: 'DELETE',
        projectId: await params.then(p => p.id),
        userId: user.uid,
      });
    }
  });
}
