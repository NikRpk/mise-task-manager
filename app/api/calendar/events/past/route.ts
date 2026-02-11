/**
 * Fetch older calendar events (before current time window)
 * Used for "Load More" functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getUserRefreshToken, getAccessTokenFromRefresh, createOAuth2Client } from '@/lib/google-calendar';
import { google } from 'googleapis';
import { CalendarEvent } from '@/types';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const beforeDate = searchParams.get('before'); // ISO date string
      
      if (!beforeDate) {
        return NextResponse.json(
          { error: 'Missing "before" parameter' },
          { status: 400 }
        );
      }
      
      const refreshToken = await getUserRefreshToken(user.uid);
      
      if (!refreshToken) {
        return NextResponse.json(
          { error: 'Google Calendar not connected' },
          { status: 401 }
        );
      }
      
      const accessToken = await getAccessTokenFromRefresh(refreshToken);
      const oauth2Client = createOAuth2Client();
      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      
      // Fetch events from 7 days before the "before" date
      const endTime = new Date(beforeDate);
      const startTime = new Date(endTime.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days earlier
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime',
      });
      
      const events = response.data.items || [];
      
      // Filter out all-day events and map to our format
      const mappedEvents = events
        .filter(event => event.start?.dateTime && event.end?.dateTime)
        .map(event => ({
          id: event.id || '',
          summary: event.summary || 'Untitled Event',
          start: event.start?.dateTime || '',
          end: event.end?.dateTime || '',
          htmlLink: event.htmlLink || '',
          description: event.description || null,
          recurringEventId: event.recurringEventId || undefined,
          attendees: event.attendees?.map(attendee => ({
            email: attendee.email || '',
            displayName: attendee.displayName || attendee.email || undefined,
            responseStatus: attendee.responseStatus as 'accepted' | 'declined' | 'tentative' | 'needsAction' | undefined,
            organizer: attendee.organizer || false,
            self: attendee.self || false,
            resource: attendee.resource || false,
          })) || [],
          hangoutLink: event.hangoutLink || undefined,
          conferenceData: event.conferenceData ? {
            entryPoints: event.conferenceData.entryPoints?.map(ep => ({
              uri: ep.uri || '',
              entryPointType: ep.entryPointType || '',
            })),
          } : undefined,
        }));
      
      return NextResponse.json({ events: mappedEvents });
    } catch (error) {
      console.error('Error fetching past calendar events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch past calendar events' },
        { status: 500 }
      );
    }
  });
}
