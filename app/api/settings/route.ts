import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { handleApiError, successResponse } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { UserSettings } from '@/types';
import { rowToUserSettings, userSettingsToRow, UserSettingsRow } from '@/lib/db-mappers';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      logger.apiRequest('GET', '/api/settings', { userId: user.uid });

      const db = getSupabaseAdmin();
      const { data: row, error } = await db
        .from('mise_user_settings')
        .select('*')
        .eq('user_id', user.uid)
        .maybeSingle();

      if (error) throw error;

      if (!row) {
        const defaultSettings: UserSettings = {
          email: user.email,
          colorScheme: 'mise',
          timezone: 'Europe/Berlin',
          notifications: {
            email: true,
            desktop: true,
            dailyTaskReminder: {
              slack: false,
              email: false,
            },
          },
        };

        logger.apiResponse('GET', '/api/settings', 200, undefined, {
          userId: user.uid,
          isDefault: true,
        });

        return successResponse(defaultSettings);
      }

      logger.apiResponse('GET', '/api/settings', 200, undefined, { userId: user.uid });

      return successResponse(rowToUserSettings(row as UserSettingsRow));
    } catch (error) {
      return handleApiError(error, { endpoint: '/api/settings', method: 'GET', userId: user.uid });
    }
  });
}

export async function PUT(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await request.json();

      logger.apiRequest('PUT', '/api/settings', { userId: user.uid });

      const db = getSupabaseAdmin();

      const settings: UserSettings = {
        email: user.email || body.email,
        colorScheme: body.colorScheme || 'mise',
        displayName: body.displayName || user.displayName,
        timezone: body.timezone || 'Europe/Berlin',
        noteTemplate: body.noteTemplate,
        defaultProjectId: body.defaultProjectId,
        feedbackWebhookUrl: body.feedbackWebhookUrl,
        notifications: body.notifications || {
          email: true,
          desktop: true,
          dailyTaskReminder: {
            slack: false,
            email: false,
          },
        },
        googleCalendarRefreshToken: body.googleCalendarRefreshToken,
        googleCalendarConnectedAt: body.googleCalendarConnectedAt,
      };

      const row = { user_id: user.uid, ...userSettingsToRow(settings) };

      const { error } = await db.from('mise_user_settings').upsert(row, { onConflict: 'user_id' });
      if (error) throw error;

      logger.apiResponse('PUT', '/api/settings', 200, undefined, { userId: user.uid });

      return successResponse(settings);
    } catch (error) {
      return handleApiError(error, { endpoint: '/api/settings', method: 'PUT', userId: user.uid });
    }
  });
}
