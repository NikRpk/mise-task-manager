import { NextRequest, NextResponse } from 'next/server';
import { withAuth, checkProjectPermission } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';
import { ProjectRole, ProjectMember } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;

      // Check if user has access to view members
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
      const members = projectData?.members || [];

      return NextResponse.json(members);
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

      // Check if user has ADMIN permission
      const hasPermission = await checkProjectPermission(user.uid, id, 'ADMIN');
      if (!hasPermission) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      const { email, role } = body;

      if (!email || !role) {
        return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
      }

      if (!['VIEW', 'EDIT', 'ADMIN'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      const projectRef = adminDb.collection('projects').doc(id);
      const projectDoc = await projectRef.get();

      if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const projectData = projectDoc.data();
      const members = projectData?.members || [];

      // Check if member already exists
      if (members.find((m: ProjectMember) => m.email === email)) {
        return NextResponse.json({ error: 'Member already exists' }, { status: 400 });
      }

      const newMember: ProjectMember = {
        userId: email, // Will be updated when user signs in
        email,
        displayName: email.split('@')[0],
        role: role as ProjectRole,
        addedAt: new Date().toISOString(),
        addedBy: user.uid,
      };

      await projectRef.update({
        members: [...members, newMember],
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json(newMember, { status: 201 });
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

      // Check if user has ADMIN permission
      const hasPermission = await checkProjectPermission(user.uid, id, 'ADMIN');
      if (!hasPermission) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      const { userId, role } = body;

      if (!userId || !role) {
        return NextResponse.json({ error: 'User ID and role are required' }, { status: 400 });
      }

      if (!['VIEW', 'EDIT', 'ADMIN'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      const projectRef = adminDb.collection('projects').doc(id);
      const projectDoc = await projectRef.get();

      if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const projectData = projectDoc.data();
      const members = projectData?.members || [];

      const updatedMembers = members.map((member: ProjectMember) =>
        member.userId === userId ? { ...member, role: role as ProjectRole } : member
      );

      await projectRef.update({
        members: updatedMembers,
        updatedAt: new Date().toISOString(),
      });

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

      const projectData = projectDoc.data();
      const members = projectData?.members || [];

      // Prevent removing the last admin
      const admins = members.filter((m: ProjectMember) => m.role === 'ADMIN');
      const memberToRemove = members.find((m: ProjectMember) => m.userId === userId);

      if (memberToRemove?.role === 'ADMIN' && admins.length === 1) {
        return NextResponse.json({ error: 'Cannot remove the last admin' }, { status: 400 });
      }

      const updatedMembers = members.filter((m: ProjectMember) => m.userId !== userId);

      await projectRef.update({
        members: updatedMembers,
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error removing member:', error);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }
  });
}
