import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';
import { handleApiError, successResponse } from '@/lib/api-errors';
import { logger } from '@/lib/logger';

// User-specific settings (global, not project-specific)
interface UserSettings {
  colorScheme: string;
  displayName?: string;
  notifications?: {
    email: boolean;
    desktop: boolean;
  };
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      logger.apiRequest('GET', '/api/settings', { userId: user.uid });

      const userSettingsRef = adminDb.collection('userSettings').doc(user.uid);
      const userSettingsDoc = await userSettingsRef.get();

      if (!userSettingsDoc.exists) {
        // Return default settings
        const defaultSettings: UserSettings = {
          colorScheme: 'hellofresh',
          displayName: user.displayName,
          notifications: {
            email: true,
            desktop: true,
          },
        };

        logger.apiResponse('GET', '/api/settings', 200, undefined, {
          userId: user.uid,
          isDefault: true,
        });

        return successResponse(defaultSettings);
      }

      logger.apiResponse('GET', '/api/settings', 200, undefined, {
        userId: user.uid,
      });

      return successResponse(userSettingsDoc.data());
    } catch (error) {
      return handleApiError(error, {
        endpoint: '/api/settings',
        method: 'GET',
        userId: user.uid,
      });
    }
  });
}

export async function PUT(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await request.json();

      logger.apiRequest('PUT', '/api/settings', { userId: user.uid });

      const userSettingsRef = adminDb.collection('userSettings').doc(user.uid);

      const settings: UserSettings = {
        colorScheme: body.colorScheme || 'hellofresh',
        displayName: body.displayName || user.displayName,
        notifications: body.notifications || {
          email: true,
          desktop: true,
        },
      };

      await userSettingsRef.set(settings, { merge: true });

      logger.apiResponse('PUT', '/api/settings', 200, undefined, {
        userId: user.uid,
      });

      return successResponse(settings);
    } catch (error) {
      return handleApiError(error, {
        endpoint: '/api/settings',
        method: 'PUT',
        userId: user.uid,
      });
    }
  });
}
