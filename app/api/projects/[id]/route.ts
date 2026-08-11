import { NextRequest, NextResponse } from 'next/server';
import { withAuth, checkProjectPermission } from '@/lib/auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-errors';
import { rowToProject, ProjectRow } from '@/lib/db-mappers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      const db = getSupabaseAdmin();

      const { data: row, error } = await db.from('projects').select('*').eq('id', id).maybeSingle();
      if (error || !row) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Check if user has access (throws on failure)
      await checkProjectPermission(user.uid, id, 'VIEW');

      return NextResponse.json(rowToProject(row as ProjectRow));
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

      // Check if user has ADMIN permission (throws if not)
      await checkProjectPermission(user.uid, id, 'ADMIN');

      const db = getSupabaseAdmin();

      const updates: Record<string, unknown> = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.description !== undefined) updates.description = body.description;
      if (body.icon !== undefined) updates.icon = body.icon;
      if (body.settings !== undefined) updates.settings = body.settings;

      const { data: row, error } = await db
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select('*')
        .maybeSingle();

      if (error || !row) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      return NextResponse.json(rowToProject(row as ProjectRow));
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

      const db = getSupabaseAdmin();

      const { data: project, error: fetchError } = await db.from('projects').select('id').eq('id', id).maybeSingle();
      if (fetchError || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Tasks cascade-delete automatically (ON DELETE CASCADE), but we
      // report the count for parity with the old response shape.
      const { count } = await db.from('tasks').select('id', { count: 'exact', head: true }).eq('project_id', id);

      const { error: deleteError } = await db.from('projects').delete().eq('id', id);
      if (deleteError) throw deleteError;

      return NextResponse.json({ success: true, deletedTasks: count || 0 });
    } catch (error) {
      return handleApiError(error, {
        endpoint: '/api/projects/[id]',
        method: 'DELETE',
        userId: user.uid,
      });
    }
  });
}
