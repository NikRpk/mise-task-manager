/**
 * Disconnect Google Calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { removeUserRefreshToken } from '@/lib/google-calendar';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      await removeUserRefreshToken(user.uid);
      
      return NextResponse.json({ success: true, message: 'Google Calendar disconnected' });
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      return NextResponse.json(
        { error: 'Failed to disconnect Google Calendar' },
        { status: 500 }
      );
    }
  });
}
