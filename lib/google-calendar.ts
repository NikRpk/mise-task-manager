/**
 * Google Calendar API integration
 * Handles OAuth tokens, event fetching, and calendar operations
 */

console.log('[MODULE] google-calendar.ts is loading...');

import { google } from 'googleapis';

console.log('[MODULE] googleapis imported');

import { adminDb } from './firebase-admin';

console.log('[MODULE] firebase-admin imported');

import { CalendarEvent } from '@/types';

console.log('[MODULE] types imported');

import { logger } from './logger';
import { CALENDAR_FETCH_DAYS } from './constants';

console.log('[MODULE] google-calendar.ts fully loaded');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  console.warn('Google Calendar API credentials not configured', {
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
      'https://www.googleapis.com/auth/drive.file', // Create and access own files in Drive
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
    console.error('Failed to exchange code for tokens', error as Error, { code });
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
    console.error('Failed to refresh access token', error as Error);
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
    console.error('Failed to get user refresh token', error as Error, { userId });
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
    console.error('Failed to store refresh token', error as Error, { userId });
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
    console.error('Failed to remove refresh token', error as Error, { userId });
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
    console.error('Failed to fetch calendar events', error as Error, { userId });
    throw new Error('Failed to fetch calendar events. Please try reconnecting your Google Calendar.');
  }
}

/**
 * Attach note content to calendar event
 */
export async function attachNoteToCalendarEvent(
  userId: string,
  eventId: string,
  noteTitle: string,
  noteContent: string,
  userEmail: string,
  driveFolderId?: string
): Promise<void> {
  console.log('[ATTACH] Starting note attachment', { userId, eventId, noteTitle, hasFolderId: !!driveFolderId });
  
  try {
    const refreshToken = await getUserRefreshToken(userId);
    
    if (!refreshToken) {
      console.error('[ATTACH] No refresh token found');
      throw new Error('Google Calendar not connected');
    }
    
    console.log('[ATTACH] Got refresh token, getting access token');
    const accessToken = await getAccessTokenFromRefresh(refreshToken);
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    
    console.log('[ATTACH] Initializing Google APIs');
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Create Google Doc in Drive
    const timestamp = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }).replace(/[/:]/g, '-');
    const fileName = `Meeting Notes - ${noteTitle} - ${timestamp}`;
    
    const fileMetadata: any = {
      name: fileName,
      mimeType: 'application/vnd.google-apps.document',
    };
    
    if (driveFolderId) {
      fileMetadata.parents = [driveFolderId];
      console.log('Using custom folder', { folderId: driveFolderId });
    }
    
    console.log('[ATTACH] Creating Google Doc with metadata:', JSON.stringify(fileMetadata));
    
    const media = {
      mimeType: 'text/html',
      body: noteContent,
    };
    
    console.log('[ATTACH] Media prepared:', { mimeType: media.mimeType, bodyLength: media.body.length });
    console.log('[ATTACH] Calling drive.files.create NOW...');
    
    // Create Google Doc
    let fileId: string;
    let fileLink: string;
    
    try {
      const driveFile = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id,webViewLink',
      });
      
      console.log('[ATTACH] Drive API returned!');
      console.log('[ATTACH] Response:', JSON.stringify(driveFile.data));
      
      fileId = driveFile.data.id!;
      fileLink = driveFile.data.webViewLink!;
      
      console.log('[ATTACH] File ID:', fileId, 'Link:', fileLink);
    } catch (driveError) {
      console.error('[ATTACH] Drive API error:', driveError);
      console.error('[ATTACH] Error details:', (driveError as any).message);
      throw driveError;
    }
    
    console.log('[ATTACH] Google Doc created successfully');
    
    if (!fileId || !fileLink) {
      console.error('[ATTACH] Missing file ID or link');
      throw new Error('Failed to create Google Doc');
    }
    
    // Get event attendees
    console.log('Fetching event attendees');
    const event = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId,
    });
    
    const attendees = event.data.attendees || [];
    console.log('Found attendees', { count: attendees.length });
    
    // Add commenter permissions for each attendee
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
            sendNotificationEmail: false,
          });
          console.log('Added permission for attendee', { email: attendee.email });
        } catch (error) {
          console.warn('Failed to add permission for attendee:', attendee.email, error);
        }
      }
    }
    
    // Give creator edit access
    console.log('Adding creator permissions', { email: userEmail });
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: userEmail,
      },
      sendNotificationEmail: false,
    });
    
    // Add link to calendar event description
    console.log('Updating calendar event description');
    const existingDescription = event.data.description || '';
    const noteLink = `Notes: <a href="${fileLink}">${noteTitle}</a>`;
    const separator = existingDescription ? '<br><br>' : '';
    const updatedDescription = `${existingDescription}${separator}${noteLink}`;
    
    await calendar.events.patch({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: {
        description: updatedDescription,
      },
    });
    
    console.log('Successfully attached note as Google Doc', {
      userId,
      eventId,
      fileId,
      folder: driveFolderId || 'root',
    });
  } catch (error) {
    const errorDetails = {
      message: (error as any).message,
      code: (error as any).code,
      status: (error as any).status,
      errors: (error as any).errors,
    };
    console.error('Failed to attach note to calendar', error as Error, {
      userId,
      eventId,
      errorDetails,
    });
    throw error;
  }
}

/**
 * Check if user has Google Calendar connected
 */
export async function isCalendarConnected(userId: string): Promise<boolean> {
  const refreshToken = await getUserRefreshToken(userId);
  return !!refreshToken;
}
