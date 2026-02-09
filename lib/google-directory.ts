/**
 * Google Workspace Directory API integration
 * Syncs organization users and manages people database
 */

import { google } from 'googleapis';
import { adminDb } from './firebase-admin';
import { createOAuth2Client, getAccessTokenFromRefresh, getUserRefreshToken } from './google-calendar';
import { logger } from './logger';

/**
 * Sync organization users from Google Workspace Directory
 * Requires domain-wide delegation and Directory API access
 */
export async function syncWorkspaceUsers(userId: string): Promise<number> {
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
    
    const admin = google.admin({ version: 'directory_v1', auth: oauth2Client });
    
    logger.info('Fetching users from Google Workspace Directory');
    
    // Fetch all users in the domain
    const response = await admin.users.list({
      customer: 'my_customer', // Refers to the authenticated user's domain
      maxResults: 500,
      orderBy: 'email',
    });
    
    const users = response.data.users || [];
    logger.info('Found users from Directory', { count: users.length });
    
    const batch = adminDb.batch();
    let syncedCount = 0;
    
    users.forEach(user => {
      if (user.primaryEmail) {
        const personRef = adminDb.collection('people').doc(user.primaryEmail);
        batch.set(personRef, {
          id: user.primaryEmail,
          email: user.primaryEmail,
          displayName: user.name?.fullName || user.primaryEmail,
          firstName: user.name?.givenName,
          lastName: user.name?.familyName,
          photoUrl: user.thumbnailPhotoUrl,
          source: 'workspace',
          lastSeen: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        syncedCount++;
      }
    });
    
    await batch.commit();
    logger.info('Workspace users synced successfully', { userId, count: syncedCount });
    
    return syncedCount;
  } catch (error) {
    logger.error('Failed to sync workspace users', error as Error, { userId });
    throw error;
  }
}

/**
 * Add people from calendar event attendees
 */
export async function addPeopleFromAttendees(
  attendees: Array<{ email: string; displayName?: string }>
): Promise<void> {
  if (!attendees || attendees.length === 0) {
    return;
  }
  
  try {
    const batch = adminDb.batch();
    const now = new Date().toISOString();
    
    // #region Debug logging - Save to database
    const withNames: string[] = [];
    const withoutNames: string[] = [];
    // #endregion
    
    attendees.forEach(attendee => {
      if (attendee.email) {
        const personRef = adminDb.collection('people').doc(attendee.email);
        
        // #region Debug logging - Track what we're saving
        if (attendee.displayName) {
          withNames.push(`${attendee.displayName} <${attendee.email}>`);
        } else {
          withoutNames.push(attendee.email);
        }
        // #endregion
        
        batch.set(personRef, {
          id: attendee.email,
          email: attendee.email,
          displayName: attendee.displayName || attendee.email, // TODO: This fallback causes emails to show as names
          source: 'calendar',
          lastSeen: now,
          createdAt: now,
          updatedAt: now,
        }, { merge: true });
      }
    });
    
    // #region Debug logging - Database save summary
    console.log('=== DATABASE SAVE DEBUG ===');
    console.log(`Saving ${attendees.length} people to database`);
    console.log(`\n✅ Saving WITH actual names (${withNames.length}):`);
    withNames.slice(0, 5).forEach(name => console.log(`  - ${name}`));
    if (withNames.length > 5) console.log(`  ... and ${withNames.length - 5} more`);
    
    console.log(`\n❌ Saving WITHOUT names - using email as fallback (${withoutNames.length}):`);
    withoutNames.slice(0, 5).forEach(email => console.log(`  - ${email}`));
    if (withoutNames.length > 5) console.log(`  ... and ${withoutNames.length - 5} more`);
    console.log('=== END DEBUG ===\n');
    // #endregion
    
    await batch.commit();
    logger.info('Added people from calendar attendees', { count: attendees.length });
  } catch (error) {
    logger.error('Failed to add people from attendees', error as Error);
    // Don't throw - this is non-critical
  }
}
