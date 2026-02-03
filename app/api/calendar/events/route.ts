/**
 * Calendar events API
 * Fetches upcoming events from Google Calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { fetchUpcomingEvents, isCalendarConnected } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      // Check if calendar is connected
      const connected = await isCalendarConnected(user.uid);
      
      if (!connected) {
        return NextResponse.json(
          { error: 'Google Calendar not connected', connected: false },
          { status: 401 }
        );
      }
      
      // Fetch upcoming events
      const events = await fetchUpcomingEvents(user.uid);
      
      return NextResponse.json({ events, connected: true });
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch calendar events', connected: false },
        { status: 500 }
      );
    }
  });
}
