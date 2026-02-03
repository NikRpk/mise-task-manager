/**
 * Google Calendar API integration
 * Handles OAuth tokens, event fetching, and calendar operations
 */

import { google } from 'googleapis';
import { adminDb } from './firebase-admin';
import { CalendarEvent } from '@/types';
import { logger } from './logger';
import { CALENDAR_FETCH_DAYS } from './constants';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  logger.warn('Google Calendar API credentials not configured', undefined, {
    hasClientId: !!GOOGLE_CLIENT_ID,
    hasClientSecret: !!GOOGLE_CLIENT_SECRET,
    hasRedirectUri: !!GOOGLE_REDIRECT_URI,
  });
}

/**
 * Create OAuth2 client
 */
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate authorization URL for OAuth flow
 */
export function getAuthorizationUrl(): string {
  const oauth2Client = createOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/drive.file', // Access to create files in Drive
    ],
    prompt: 'consent', // Force consent screen to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
}> {
  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to get tokens from Google');
    }
    
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date || Date.now() + 3600000,
    };
  } catch (error) {
    logger.error('Failed to exchange code for tokens', error as Error, { code });
    throw new Error('OAuth token exchange failed');
  }
}

/**
 * Get access token from refresh token
 */
export async function getAccessTokenFromRefresh(refreshToken: string): Promise<string> {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }
    
    return credentials.access_token;
  } catch (error) {
    logger.error('Failed to refresh access token', error as Error);
    throw new Error('Token refresh failed. Please reconnect your Google Calendar.');
  }
}

/**
 * Get user's refresh token from database
 */
export async function getUserRefreshToken(userId: string): Promise<string | null> {
  try {
    const userSettingsRef = adminDb.collection('userSettings').doc(userId);
    const doc = await userSettingsRef.get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data();
    return data?.googleCalendarRefreshToken || null;
  } catch (error) {
    logger.error('Failed to get user refresh token', error as Error, { userId });
    return null;
  }
}

/**
 * Store user's refresh token in database
 */
export async function storeUserRefreshToken(userId: string, refreshToken: string): Promise<void> {
  try {
    const userSettingsRef = adminDb.collection('userSettings').doc(userId);
    await userSettingsRef.set(
      {
        googleCalendarRefreshToken: refreshToken,
        googleCalendarConnectedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    logger.error('Failed to store refresh token', error as Error, { userId });
    throw new Error('Failed to save Google Calendar connection');
  }
}

/**
 * Remove user's refresh token (disconnect calendar)
 */
export async function removeUserRefreshToken(userId: string): Promise<void> {
  try {
    const userSettingsRef = adminDb.collection('userSettings').doc(userId);
    await userSettingsRef.update({
      googleCalendarRefreshToken: null,
      googleCalendarConnectedAt: null,
    });
  } catch (error) {
    logger.error('Failed to remove refresh token', error as Error, { userId });
    throw new Error('Failed to disconnect Google Calendar');
  }
}

/**
 * Fetch upcoming calendar events for user
 */
export async function fetchUpcomingEvents(userId: string): Promise<CalendarEvent[]> {
  try {
    const refreshToken = await getUserRefreshToken(userId);
    
    if (!refreshToken) {
      throw new Error('Google Calendar not connected');
    }
    
    const accessToken = await getAccessTokenFromRefresh(refreshToken);
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + CALENDAR_FETCH_DAYS);
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: futureDate.toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    const events = response.data.items || [];
    
    // Filter out all-day events and map to our format
    return events
      .filter(event => {
        // Exclude all-day events (they have 'date' instead of 'dateTime')
        return event.start?.dateTime && event.end?.dateTime;
      })
      .map(event => ({
        id: event.id || '',
        summary: event.summary || 'Untitled Event',
        start: event.start?.dateTime || '',
        end: event.end?.dateTime || '',
        htmlLink: event.htmlLink || '',
        description: event.description || null,
      }));
  } catch (error) {
    logger.error('Failed to fetch calendar events', error as Error, { userId });
    throw new Error('Failed to fetch calendar events. Please try reconnecting your Google Calendar.');
  }
}

/**
 * Attach note content to calendar event as a Google Doc
 */
export async function attachNoteToCalendarEvent(
  userId: string,
  eventId: string,
  noteTitle: string,
  noteContent: string,
  userEmail: string
): Promise<void> {
  try {
    const refreshToken = await getUserRefreshToken(userId);
    
    if (!refreshToken) {
      throw new Error('Google Calendar not connected');
    }
    
    const accessToken = await getAccessTokenFromRefresh(refreshToken);
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Create Google Doc in Drive
    const timestamp = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }).replace(/[/:]/g, '-');
    const fileName = `Meeting Notes - ${noteTitle} - ${timestamp}`;
    
    const fileMetadata = {
      name: fileName,
      mimeType: 'application/vnd.google-apps.document', // Creates a Google Doc
    };
    
    const media = {
      mimeType: 'text/html',
      body: noteContent,
    };
    
    // Upload file to Drive (HTML will be converted to Google Doc)
    const driveFile = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id,webViewLink',
    });
    
    const fileId = driveFile.data.id;
    const fileLink = driveFile.data.webViewLink;
    
    if (!fileId || !fileLink) {
      throw new Error('Failed to create Google Doc');
    }
    
    // Get event attendees first
    const event = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId,
    });
    
    const attendees = event.data.attendees || [];
    
    // Add comment permissions for each attendee (restricted access - only attendees)
    for (const attendee of attendees) {
      if (attendee.email) {
        try {
          await drive.permissions.create({
            fileId: fileId,
            requestBody: {
              role: 'commenter',
              type: 'user',
              emailAddress: attendee.email,
            },
            sendNotificationEmail: false, // Don't spam attendees with notification
          });
        } catch (error) {
          // Continue if one attendee fails
          logger.warn('Failed to add permission for attendee', error as Error, {
            email: attendee.email,
          });
        }
      }
    }
    
    // Add comment permission for the note creator
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: (await calendar.events.get({ calendarId: 'primary', eventId })).data.creator?.email || '',
      },
      sendNotificationEmail: false,
    });
    
    // Add file link to event description (simple format)
    const existingDescription = event.data.description || '';
    const noteLink = `Notes: <a href="${fileLink}">${noteTitle}</a>`;
    const separator = existingDescription ? '<br><br>' : '';
    const updatedDescription = `${existingDescription}${separator}${noteLink}`;
    
    // Update event with link to notes file
    await calendar.events.patch({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: {
        description: updatedDescription,
      },
    });
    
    logger.info('Note attached to calendar event as Google Doc', {
      userId,
      eventId,
      fileId,
    });
  } catch (error) {
    logger.error('Failed to attach note to calendar', error as Error, {
      userId,
      eventId,
    });
    throw new Error('Failed to attach note to calendar event');
  }
}

/**
 * Check if user has Google Calendar connected
 */
export async function isCalendarConnected(userId: string): Promise<boolean> {
  const refreshToken = await getUserRefreshToken(userId);
  return !!refreshToken;
}
