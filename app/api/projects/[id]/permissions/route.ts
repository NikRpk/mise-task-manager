import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getUserProjectRole } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      const role = await getUserProjectRole(user.uid, id);

      if (!role) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      return NextResponse.json({ role });
    } catch (error) {
      console.error('Error fetching permissions:', error);
      return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
    }
  });
}
