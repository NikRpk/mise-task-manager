/**
 * User Initialization Utility
 * Ensures all users have complete userSettings with all required fields
 */

import { adminDb } from './firebase-admin';
import { UserSettings } from '@/types';
import { logger } from './logger';

/**
 * Initialize or update user settings with all required fields
 * Called automatically when a user makes their first API request
 */
export async function ensureUserSettings(
  uid: string,
  email: string,
  displayName: string
): Promise<void> {
  try {
    const userSettingsRef = adminDb.collection('userSettings').doc(uid);
    const userSettingsDoc = await userSettingsRef.get();

    const defaultSettings: UserSettings = {
      email,
      colorScheme: 'mise',
      displayName,
      timezone: 'Europe/Berlin',
      notifications: {
        email: true,
        desktop: true,
        dailyTaskReminder: {
          slack: false,
          email: false,
          time: '08:00',
        },
      },
    };

    if (!userSettingsDoc.exists) {
      // Create new user settings
      await userSettingsRef.set(defaultSettings);
      logger.info('Created new user settings', { uid, email });
    } else {
      // Update existing settings to ensure all fields are present
      const existingSettings = userSettingsDoc.data() as UserSettings;
      
      const needsUpdate =
        !existingSettings.email ||
        !existingSettings.notifications?.dailyTaskReminder;

      if (needsUpdate) {
        const updatedSettings: UserSettings = {
          ...defaultSettings,
          ...existingSettings,
          email, // Always update email in case it changed
          displayName: existingSettings.displayName || displayName,
          notifications: {
            email: existingSettings.notifications?.email ?? defaultSettings.notifications!.email,
            desktop: existingSettings.notifications?.desktop ?? defaultSettings.notifications!.desktop,
            dailyTaskReminder: {
              slack: existingSettings.notifications?.dailyTaskReminder?.slack ?? false,
              email: existingSettings.notifications?.dailyTaskReminder?.email ?? false,
              time: existingSettings.notifications?.dailyTaskReminder?.time ?? '08:00',
            },
          },
        };

        await userSettingsRef.set(updatedSettings, { merge: true });
        logger.info('Updated user settings with missing fields', { uid, email });
      }
    }
  } catch (error) {
    logger.error('Failed to ensure user settings', error as Error, { uid, email });
  }
}
