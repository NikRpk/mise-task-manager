/**
 * Google Calendar API integration
 * Handles OAuth tokens, event fetching, and calendar operations
 */

console.log('[MODULE] google-calendar.ts is loading...');

import { google, Auth } from 'googleapis';

console.log('[MODULE] googleapis imported');

import { adminDb } from './firebase-admin';

console.log('[MODULE] firebase-admin imported');

import { CalendarEvent } from '@/types';

console.log('[MODULE] types imported');

import { logger } from './logger';
import { CALENDAR_FETCH_DAYS } from './constants';
import { addPeopleFromAttendees } from './google-directory';

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
 * Fetch display name for an email using Admin Directory API with fallback to People API
 * Same pattern as the working Apps Script: try Directory first, then People API
 * Falls back to email if both fail
 */
async function fetchDisplayName(email: string, oauth2Client: Auth.OAuth2Client, isFirstLookup: boolean = false): Promise<string> {
  // Try Admin Directory API first (for workspace users)
  try {
    const admin = google.admin({ version: 'directory_v1', auth: oauth2Client });
    
    if (isFirstLookup) {
      console.log(`\n🔍 SAMPLE LOOKUP FOR: ${email}`);
      console.log(`   Step 1: Trying Admin Directory API (projection=basic, viewType=domain_public)`);
    }
    
    const response = await admin.users.get({
      userKey: email,
      projection: 'basic',
      viewType: 'domain_public',
    });
    
    if (response.data && response.data.name && response.data.name.fullName) {
      if (isFirstLookup) {
        console.log(`   ✅ Admin Directory SUCCESS: ${response.data.name.fullName}`);
      }
      return response.data.name.fullName;
    }
    
    if (isFirstLookup) {
      console.log(`   ⚠️ Admin Directory returned data but no name.fullName`);
    }
  } catch (adminError) {
    if (isFirstLookup) {
      console.log(`   ⚠️ Admin Directory failed: ${(adminError as Error).message}`);
      console.log(`   Step 2: Falling back to People API...`);
    }
    
    // Fall back to People API (for personal contacts)
    try {
      const people = google.people({ version: 'v1', auth: oauth2Client });
      
      const peopleResponse = await people.people.searchContacts({
        query: email,
        readMask: 'names,emailAddresses',
      });
      
      if (isFirstLookup) {
        console.log(`   📦 People API response:`, JSON.stringify(peopleResponse.data, null, 2));
      }
      
      if (peopleResponse.data.results && peopleResponse.data.results.length > 0) {
        const person = peopleResponse.data.results[0].person;
        if (person?.names && person.names.length > 0) {
          if (isFirstLookup) {
            console.log(`   ✅ People API SUCCESS: ${person.names[0].displayName}`);
          }
          return person.names[0].displayName || email;
        }
      }
      
      if (isFirstLookup) {
        console.log(`   ⚠️ People API returned no results`);
      }
    } catch (peopleError) {
      if (isFirstLookup) {
        console.log(`   ❌ People API also failed: ${(peopleError as Error).message}`);
      }
    }
  }
  
  if (isFirstLookup) {
    console.log(`   ❌ Both APIs failed - using email as fallback`);
  }
  
  return email; // Fallback to email if both APIs fail
}

/**
 * Enrich attendees with display names from Admin Directory API
 * Fetches names in parallel for performance
 */
async function enrichAttendeesWithNames(
  attendees: Array<{ email: string; displayName?: string }>,
  oauth2Client: Auth.OAuth2Client
): Promise<Array<{ email: string; displayName: string }>> {
  if (!attendees || attendees.length === 0) {
    return [];
  }
  
  // Fetch all names in parallel
  const enrichedAttendees = await Promise.all(
    attendees.map(async (attendee) => {
      // If displayName already exists, keep it
      if (attendee.displayName) {
        return { email: attendee.email, displayName: attendee.displayName };
      }
      
      // Otherwise, fetch from Directory API
      const displayName = await fetchDisplayName(attendee.email, oauth2Client);
      return { email: attendee.email, displayName };
    })
  );
  
  return enrichedAttendees;
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
    
    // #region Debug logging - COMPLETE RAW API RESPONSE
    console.log('\n'.repeat(3));
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 COMPLETE GOOGLE CALENDAR API RAW RESPONSE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total events fetched: ${events.length}`);
    
    // Sample first event with attendees for debugging
    const sampleEventWithAttendees = events.find(e => e.attendees && e.attendees.length > 0);
    if (sampleEventWithAttendees) {
      console.log('\n📅 SAMPLE EVENT TITLE:', sampleEventWithAttendees.summary);
      console.log('\n🔴 COMPLETE RAW EVENT OBJECT (EXACTLY AS GOOGLE RETURNS IT):');
      console.log('─────────────────────────────────────────────────────────');
      console.log(JSON.stringify(sampleEventWithAttendees, null, 2));
      console.log('─────────────────────────────────────────────────────────');
      
      // Also show just attendees for clarity
      console.log('\n👥 JUST THE ATTENDEES ARRAY:');
      console.log(JSON.stringify(sampleEventWithAttendees.attendees, null, 2));
      
      // Count attendees with/without displayName
      const attendeesWithName = sampleEventWithAttendees.attendees?.filter(a => a.displayName) || [];
      const attendeesWithoutName = sampleEventWithAttendees.attendees?.filter(a => !a.displayName) || [];
      const resources = sampleEventWithAttendees.attendees?.filter(a => a.resource) || [];
      
      console.log(`\n📊 STATISTICS:`);
      console.log(`  - Total attendees: ${sampleEventWithAttendees.attendees?.length || 0}`);
      console.log(`  - With displayName: ${attendeesWithName.length}`);
      console.log(`  - Without displayName: ${attendeesWithoutName.length}`);
      console.log(`  - Resources (meeting rooms): ${resources.length}`);
    } else {
      console.log('\n⚠️ No events with attendees found in this batch');
    }
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n'.repeat(2));
    // #endregion
    
    // #region Enrich attendees with names from Admin Directory API
    console.log('🔍 ENRICHING ATTENDEES WITH DIRECTORY API...');
    const startTime = Date.now();
    
    // Collect all unique emails from all events
    const allEmails = new Set<string>();
    events.forEach(event => {
      event.attendees?.forEach(attendee => {
        if (attendee.email && !attendee.resource) {
          allEmails.add(attendee.email);
        }
      });
    });
    
    console.log(`   Found ${allEmails.size} unique attendee emails`);
    
    // Fetch all names in parallel (log details for first one only)
    const emailToNameMap = new Map<string, string>();
    const emailArray = Array.from(allEmails);
    const namePromises = emailArray.map(async (email, index) => {
      const displayName = await fetchDisplayName(email, oauth2Client, index === 0);
      emailToNameMap.set(email, displayName);
      return { email, displayName };
    });
    
    const enrichedNames = await Promise.all(namePromises);
    
    const namesFound = enrichedNames.filter(e => e.displayName !== e.email).length;
    console.log(`   ✅ Fetched ${namesFound} names from Directory API in ${Date.now() - startTime}ms`);
    console.log(`   📧 ${allEmails.size - namesFound} emails have no Directory entry (using email as fallback)`);
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
        hangoutLink: event.hangoutLink,
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
      .filter(a => a.email && !a.resource); // Exclude meeting rooms/resources
    
    // #region Debug logging - People sync
    console.log('=== PEOPLE SYNC DEBUG ===');
    console.log(`Total attendees to sync (excluding resources): ${allAttendees.length}`);
    const syncWithNames = allAttendees.filter(a => a.displayName);
    const syncWithoutNames = allAttendees.filter(a => !a.displayName);
    console.log(`  - Attendees WITH displayName: ${syncWithNames.length}`);
    console.log(`  - Attendees WITHOUT displayName: ${syncWithoutNames.length}`);
    console.log('=== END DEBUG ===\n');
    // #endregion
    
    if (allAttendees.length > 0) {
      // Don't wait for this - run in background
      addPeopleFromAttendees(allAttendees).catch(err => 
        logger.warn('Failed to sync people from calendar events', { error: err.message })
      );
    }
    
    return mappedEvents;
  } catch (error) {
    console.error('Failed to fetch calendar events', error as Error, { userId });
    throw new Error('Failed to fetch calendar events. Please try reconnecting your Google Calendar.');
  }
}

/**
 * Attach note content to calendar event
 * Returns the created document ID and URL
 */
export async function attachNoteToCalendarEvent(
  userId: string,
  eventId: string,
  noteTitle: string,
  noteContent: string,
  userEmail: string,
  driveFolderId?: string
): Promise<{ docId: string; docUrl: string }> {
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
    const docs = google.docs({ version: 'v1', auth: oauth2Client });
    
    // Create Google Doc in Drive
    const dateString = new Date().toLocaleDateString('de-DE'); // dd.MM.yyyy
    const fileName = `Meeting Notes | ${noteTitle} (${dateString})`;
    
    const fileMetadata: {
      name: string;
      mimeType: string;
      parents?: string[];
    } = {
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
      const errorWithMessage = driveError as { message?: string };
      console.error('[ATTACH] Error details:', errorWithMessage.message);
      throw driveError;
    }
    
    console.log('[ATTACH] Google Doc created successfully');
    
    if (!fileId || !fileLink) {
      console.error('[ATTACH] Missing file ID or link');
      throw new Error('Failed to create Google Doc');
    }
    
    // Set A4 paper size with 1cm margins
    console.log('[ATTACH] Setting document page setup (A4, 1cm margins)');
    try {
      await docs.documents.batchUpdate({
        documentId: fileId,
        requestBody: {
          requests: [
            {
              updateDocumentStyle: {
                documentStyle: {
                  // 1cm = 28.35 points
                  marginTop: { magnitude: 28.35, unit: 'PT' },
                  marginBottom: { magnitude: 28.35, unit: 'PT' },
                  marginLeft: { magnitude: 28.35, unit: 'PT' },
                  marginRight: { magnitude: 28.35, unit: 'PT' },
                  // A4 size: 210mm x 297mm = 595.28 x 841.89 points
                  pageSize: {
                    width: { magnitude: 595.28, unit: 'PT' },
                    height: { magnitude: 841.89, unit: 'PT' }
                  }
                },
                fields: 'marginTop,marginBottom,marginLeft,marginRight,pageSize'
              }
            }
          ]
        }
      });
      console.log('[ATTACH] Document page setup updated successfully');
    } catch (docsError) {
      console.warn('[ATTACH] Failed to set document page setup (non-critical):', docsError);
      // Don't throw - this is a nice-to-have enhancement
    }
    
    // Get event attendees
    console.log('Fetching event attendees');
    const event = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId,
    });
    
    const attendees = event.data.attendees || [];
    console.log('Found attendees', { count: attendees.length });
    
    // Add commenter permissions for all attendees in parallel
    const attendeePermissionPromises = attendees
      .filter(attendee => attendee.email)
      .map(attendee =>
        drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'commenter',
            type: 'user',
            emailAddress: attendee.email,
          },
          sendNotificationEmail: false,
        })
        .then(() => {
          console.log('Added permission for attendee', { email: attendee.email });
          return { success: true, email: attendee.email };
        })
        .catch(error => {
          console.warn('Failed to add permission for attendee:', attendee.email, error);
          return { success: false, email: attendee.email, error };
        })
      );
    
    // Give creator edit access (add to parallel operations)
    const creatorPermissionPromise = drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: userEmail,
      },
      sendNotificationEmail: false,
    })
    .then(() => {
      console.log('Added creator permissions', { email: userEmail });
      return { success: true, email: userEmail };
    })
    .catch(error => {
      console.error('Failed to add creator permission:', userEmail, error);
      throw error; // Creator permission is critical, so throw
    });
    
    // Execute all permissions in parallel
    const allPermissionPromises = [...attendeePermissionPromises, creatorPermissionPromise];
    const permissionResults = await Promise.allSettled(allPermissionPromises);
    
    // Check if creator permission succeeded (it's the last one)
    const creatorResult = permissionResults[permissionResults.length - 1];
    if (creatorResult.status === 'rejected') {
      throw new Error(`Failed to add creator permissions: ${creatorResult.reason}`);
    }
    
    // Log summary of attendee permissions (non-critical)
    const successfulAttendees = permissionResults
      .slice(0, -1) // Exclude creator
      .filter(r => r.status === 'fulfilled')
      .length;
    console.log(`Successfully added permissions for ${successfulAttendees}/${attendees.length} attendees`);
    
    // Try to add link to calendar event description (may fail if not organizer)
    console.log('Attempting to update calendar event description');
    try {
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
      console.log('Calendar event description updated successfully');
    } catch (calendarError) {
      console.warn('Could not update calendar event (user may not be organizer):', (calendarError as Error).message);
      // Don't throw - the Google Doc was created successfully and shared with attendees
      // This just means the link won't appear in the calendar event description
    }
    
    console.log('Successfully attached note as Google Doc', {
      userId,
      eventId,
      fileId,
      folder: driveFolderId || 'root',
    });
    
    return {
      docId: fileId,
      docUrl: fileLink,
    };
  } catch (error) {
    interface ErrorWithDetails {
      message?: string;
      code?: string;
      status?: number;
      errors?: unknown;
    }
    const errorObj = error as ErrorWithDetails;
    const errorDetails = {
      message: errorObj.message,
      code: errorObj.code,
      status: errorObj.status,
      errors: errorObj.errors,
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
 * Update an existing Google Doc with new note content
 * Uses Drive API to replace the entire document with HTML content
 */
export async function updateGoogleDoc(
  userId: string,
  docId: string,
  noteTitle: string,
  noteContent: string,
  _userEmail: string
): Promise<void> {
  console.log('[UPDATE] Starting doc update', { userId, docId, noteTitle });
  
  try {
    const refreshToken = await getUserRefreshToken(userId);
    
    if (!refreshToken) {
      console.error('[UPDATE] No refresh token found');
      throw new Error('Google Calendar not connected');
    }
    
    console.log('[UPDATE] Got refresh token, getting access token');
    const accessToken = await getAccessTokenFromRefresh(refreshToken);
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    
    console.log('[UPDATE] Initializing Google Drive API');
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // Update the document content using Drive API with HTML
    console.log('[UPDATE] Updating document content with HTML');
    const media = {
      mimeType: 'text/html',
      body: noteContent,
    };
    
    await drive.files.update({
      fileId: docId,
      media: media,
    });
    
    console.log('[UPDATE] Document updated successfully');
  } catch (error) {
    interface ErrorWithDetails {
      message?: string;
      code?: string;
      status?: number;
    }
    const errorObj = error as ErrorWithDetails;
    const errorDetails = {
      message: errorObj.message,
      code: errorObj.code,
      status: errorObj.status,
    };
    console.error('[UPDATE] Failed to update Google Doc', error as Error, {
      userId,
      docId,
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

/**
 * Extract recurring event information from a calendar event
 * Used to link notes from the same recurring meeting series
 */
export function extractRecurringInfo(calendarEvent: { recurringEventId?: string; start?: { dateTime?: string; date?: string } }): {
  recurringEventId: string | null;
  instanceDate: string | null;
} {
  return {
    recurringEventId: calendarEvent.recurringEventId || null,
    instanceDate: calendarEvent.start?.dateTime || calendarEvent.start?.date || null
  };
}
