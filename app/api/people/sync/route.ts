/**
 * People Sync API - Sync organization users from Google Workspace
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { syncWorkspaceUsers } from '@/lib/google-directory';

/**
 * POST /api/people/sync - Sync users from Google Workspace Directory
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const count = await syncWorkspaceUsers(user.uid);
      
      return NextResponse.json({ 
        success: true, 
        message: `Successfully synced ${count} users from Google Workspace`,
        count 
      });
    } catch (error) {
      console.error('Failed to sync workspace users:', error);
      return NextResponse.json(
        { error: 'Failed to sync workspace users. Make sure you have Google Workspace and the Directory API is enabled.' },
        { status: 500 }
      );
    }
  });
}
