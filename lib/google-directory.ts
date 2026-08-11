/**
 * Google Workspace Directory API integration
 * Syncs organization users and manages people database
 */

import { google } from 'googleapis';
import { getSupabaseAdmin } from './supabase/admin';
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

    const rows = users
      .filter(user => !!user.primaryEmail)
      .map(user => ({
        email: user.primaryEmail!,
        display_name: user.name?.fullName || user.primaryEmail!,
        first_name: user.name?.givenName || null,
        last_name: user.name?.familyName || null,
        photo_url: user.thumbnailPhotoUrl || null,
        source: 'workspace' as const,
        last_seen: new Date().toISOString(),
      }));

    if (rows.length > 0) {
      const { error } = await getSupabaseAdmin().from('people').upsert(rows, { onConflict: 'email' });
      if (error) throw error;
    }

    logger.info('Workspace users synced successfully', { userId, count: rows.length });

    return rows.length;
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
    const now = new Date().toISOString();

    const rows = attendees
      .filter(a => !!a.email)
      .map(attendee => ({
        email: attendee.email,
        display_name: attendee.displayName || attendee.email,
        source: 'calendar' as const,
        last_seen: now,
      }));

    if (rows.length === 0) return;

    const { error } = await getSupabaseAdmin().from('people').upsert(rows, { onConflict: 'email' });
    if (error) throw error;

    logger.info('Added people from calendar attendees', { count: rows.length });
  } catch (error) {
    logger.error('Failed to add people from attendees', error as Error);
    // Don't throw - this is non-critical
  }
}
