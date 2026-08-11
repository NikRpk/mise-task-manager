import { NextRequest, NextResponse } from 'next/server';
import { withAuth, checkProjectPermission } from '@/lib/auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ProjectRole } from '@/types';
import { rowToProjectMember, ProjectMemberRow } from '@/lib/db-mappers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;

      await checkProjectPermission(user.uid, id, 'VIEW');

      const db = getSupabaseAdmin();
      const { data: rows, error } = await db.from('project_members').select('*').eq('project_id', id);
      if (error) throw error;

      return NextResponse.json(((rows as ProjectMemberRow[]) || []).map(rowToProjectMember));
    } catch (error) {
      console.error('Error fetching members:', error);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      const body = await request.json();

      await checkProjectPermission(user.uid, id, 'ADMIN');

      const { email, role } = body;

      if (!email || !role) {
        return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
      }

      if (!['VIEW', 'EDIT', 'ADMIN'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      const db = getSupabaseAdmin();

      const { data: existing } = await db
        .from('project_members')
        .select('user_id')
        .eq('project_id', id)
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: 'Member already exists' }, { status: 400 });
      }

      // The invited person may not have signed up yet. We look up any existing
      // auth user by email (via Supabase's admin user list) so the membership
      // row can attach to their real user id immediately if they already have
      // an account; otherwise we key on a deterministic placeholder that gets
      // reconciled the first time they actually sign in (see /api/settings).
      const { data: userList } = await db.auth.admin.listUsers();
      const existingUser = userList?.users?.find(u => u.email === email);
      const memberUserId = existingUser?.id || crypto.randomUUID();

      const newMemberRow: ProjectMemberRow = {
        project_id: id,
        user_id: memberUserId,
        email,
        display_name: email.split('@')[0],
        role: role as ProjectRole,
        added_at: new Date().toISOString(),
        added_by: user.uid,
      };

      const { error: insertError } = await db.from('project_members').insert({
        project_id: id,
        user_id: memberUserId,
        email,
        display_name: email.split('@')[0],
        role,
        added_by: user.uid,
      });

      if (insertError) throw insertError;

      return NextResponse.json(rowToProjectMember(newMemberRow), { status: 201 });
    } catch (error) {
      console.error('Error adding member:', error);
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
    }
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      const body = await request.json();

      await checkProjectPermission(user.uid, id, 'ADMIN');

      const { userId, role } = body;

      if (!userId || !role) {
        return NextResponse.json({ error: 'User ID and role are required' }, { status: 400 });
      }

      if (!['VIEW', 'EDIT', 'ADMIN'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      const db = getSupabaseAdmin();
      const { error } = await db
        .from('project_members')
        .update({ role })
        .eq('project_id', id)
        .eq('user_id', userId);

      if (error) throw error;

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error updating member role:', error);
      return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 });
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
      const searchParams = request.nextUrl.searchParams;
      const userId = searchParams.get('userId');

      if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      }

      await checkProjectPermission(user.uid, id, 'ADMIN');

      const db = getSupabaseAdmin();
      const { data: rows, error } = await db.from('project_members').select('*').eq('project_id', id);
      if (error) throw error;

      const members = (rows as ProjectMemberRow[]) || [];
      const admins = members.filter(m => m.role === 'ADMIN');
      const memberToRemove = members.find(m => m.user_id === userId);

      if (memberToRemove?.role === 'ADMIN' && admins.length === 1) {
        return NextResponse.json({ error: 'Cannot remove the last admin' }, { status: 400 });
      }

      const { error: deleteError } = await db
        .from('project_members')
        .delete()
        .eq('project_id', id)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error removing member:', error);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }
  });
}
