/**
 * Google Calendar API integration
 * Handles OAuth tokens, event fetching, and calendar operations
 */

import { google, Auth } from 'googleapis';
import { adminDb } from './firebase-admin';
import { CalendarEvent } from '@/types';
import { logger } from './logger';
import { CALENDAR_FETCH_DAYS, CALENDAR_LOOKBACK_HOURS } from './constants';
import { addPeopleFromAttendees } from './google-directory';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

/**
 * Asserts that all Google OAuth credentials are present.
 * Called at request-time (not module-load time) so the Docker build can
 * succeed without runtime secrets — secrets are injected by Cloud Run.
 */
function assertCredentials(): void {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error(
      `Google Calendar credentials are not configured. ` +
      `Missing: ${[
        !GOOGLE_CLIENT_ID && 'GOOGLE_CLIENT_ID',
        !GOOGLE_CLIENT_SECRET && 'GOOGLE_CLIENT_SECRET',
        !GOOGLE_REDIRECT_URI && 'GOOGLE_REDIRECT_URI',
      ].filter(Boolean).join(', ')}`
    );
  }
}

/**
 * Create OAuth2 client
 */
export function createOAuth2Client() {
  assertCredentials();
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
  assertCredentials();
  const oauth2Client = createOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/admin.directory.user.readonly', // Read public directory info (viewType: domain_public)
      'https://www.googleapis.com/auth/contacts.readonly', // Fallback to People API for personal contacts
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
    logger.error('Failed to exchange code for tokens', error as Error);
    throw new Error('OAuth token exchange failed');
  }
}

/**
 * Get access token from refresh token.
 *
 * When Google returns `invalid_grant` the stored refresh token is permanently
 * revoked. We accept an optional userId so we can clear the dead token from
 * Firestore immediately — otherwise isCalendarConnected() keeps returning true
 * while every subsequent API call fails silently.
 */
export async function getAccessTokenFromRefresh(
  refreshToken: string,
  userId?: string
): Promise<string> {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }
    
    return credentials.access_token;
  } catch (error) {
    const googleError = error as { message?: string };
    const isRevoked =
      googleError.message?.includes('invalid_grant') ||
      googleError.message?.includes('Token has been expired or revoked');

    if (isRevoked && userId) {
      // Clear the dead token so the UI correctly shows "disconnected"
      // and prompts the user to reconnect rather than looping on errors.
      await removeUserRefreshToken(userId).catch(cleanupErr =>
        logger.warn('Failed to clear revoked refresh token', { userId, error: (cleanupErr as Error).message })
      );
      logger.warn('Google refresh token was revoked — cleared from database', { userId });
    } else {
      logger.error('Failed to refresh access token', error as Error);
    }

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
 * Fetch display name for an email using Admin Directory API with fallback to People API.
 * Falls back to the raw email address if both APIs fail.
 */
async function fetchDisplayName(email: string, oauth2Client: Auth.OAuth2Client): Promise<string> {
  try {
    const admin = google.admin({ version: 'directory_v1', auth: oauth2Client });
    const response = await admin.users.get({
      userKey: email,
      projection: 'basic',
      viewType: 'domain_public',
    });
    if (response.data?.name?.fullName) {
      return response.data.name.fullName;
    }
  } catch {
    // Directory API failed — try People API as fallback
    try {
      const people = google.people({ version: 'v1', auth: oauth2Client });
      const peopleResponse = await people.people.searchContacts({
        query: email,
        readMask: 'names,emailAddresses',
      });
      const firstName = peopleResponse.data.results?.[0]?.person?.names?.[0]?.displayName;
      if (firstName) return firstName;
    } catch (peopleError) {
      logger.warn('People API lookup failed', { email, error: (peopleError as Error).message });
    }
  }

  return email;
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
    
    const accessToken = await getAccessTokenFromRefresh(refreshToken, userId);
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Fetch events from 2 hours ago to 30 days in the future
    const now = new Date();
    const pastTime = new Date(now.getTime() - (CALENDAR_LOOKBACK_HOURS * 60 * 60 * 1000));
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + CALENDAR_FETCH_DAYS);
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: pastTime.toISOString(),
      timeMax: futureDate.toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    const events = response.data.items || [];
    
    // #region Enrich attendees with display names from Admin Directory API
    const allEmails = new Set<string>();
    events.forEach(event => {
      event.attendees?.forEach(attendee => {
        if (attendee.email && !attendee.resource) {
          allEmails.add(attendee.email);
        }
      });
    });

    const emailToNameMap = new Map<string, string>();
    const namePromises = Array.from(allEmails).map(async (email) => {
      const displayName = await fetchDisplayName(email, oauth2Client);
      emailToNameMap.set(email, displayName);
    });
    await Promise.all(namePromises);
    // #endregion
    
    // Filter out all-day events and map to our format
    const mappedEvents = events
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
        recurringEventId: event.recurringEventId || undefined, // Include recurring event series ID
        attendees: event.attendees?.map(attendee => ({
          email: attendee.email || '',
          displayName: attendee.email ? (emailToNameMap.get(attendee.email) || attendee.email) : undefined,
          responseStatus: attendee.responseStatus as 'accepted' | 'declined' | 'tentative' | 'needsAction' | undefined,
          organizer: attendee.organizer || false,
          self: attendee.self || false,
          resource: attendee.resource || false, // Meeting rooms have resource: true
        })) || [],
        hangoutLink: event.hangoutLink || undefined,
        conferenceData: event.conferenceData ? {
          entryPoints: event.conferenceData.entryPoints?.map(ep => ({
            uri: ep.uri || '',
            entryPointType: ep.entryPointType || '',
          })),
        } : undefined,
      }));
    
    // Auto-sync people from all event attendees (fire-and-forget)
    // Filter out meeting rooms (resources) - only include actual people
    const allAttendees = mappedEvents
      .flatMap(event => event.attendees || [])
      .filter(a => a.email && !a.resource);

    if (allAttendees.length > 0) {
      // Don't wait for this - run in background
      addPeopleFromAttendees(allAttendees).catch(err => 
        logger.warn('Failed to sync people from calendar events', { error: err.message })
      );
    }
    
    return mappedEvents;
  } catch (error) {
    logger.error('Failed to fetch calendar events', error as Error, { userId });
    throw new Error('Failed to fetch calendar events. Please try reconnecting your Google Calendar.');
  }
}

/**
 * Check if user has Google Calendar connected
 */
export async function isCalendarConnected(userId: string): Promise<boolean> {
  const refreshToken = await getUserRefreshToken(userId);
  return !!refreshToken;
}
