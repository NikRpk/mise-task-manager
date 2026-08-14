/**
 * User Initialization Utility
 * Ensures every authenticated user has a row in mise_user_settings.
 *
 * Note: a Postgres trigger (`handle_new_mise_user_settings` in db/schema.sql)
 * already creates this row at sign-up time, so in the common case this is a
 * no-op. It exists as a safety net for older accounts and for the
 * email/password flow before the trigger existed.
 */

import { getSupabaseAdmin } from './supabase/admin';
import { logger } from './logger';

export async function ensureUserSettings(
  uid: string,
  email: string,
  displayName: string
): Promise<void> {
  try {
    const { data: existing, error: fetchError } = await getSupabaseAdmin()
      .from('mise_user_settings')
      .select('user_id, email, display_name')
      .eq('user_id', uid)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!existing) {
      const { error: insertError } = await getSupabaseAdmin().from('mise_user_settings').insert({
        user_id: uid,
        email,
        display_name: displayName,
      });
      if (insertError) throw insertError;
      logger.info('Created new user settings', { uid, email });
      return;
    }

    if (!existing.email || !existing.display_name) {
      const { error: updateError } = await getSupabaseAdmin()
        .from('mise_user_settings')
        .update({
          email: existing.email || email,
          display_name: existing.display_name || displayName,
        })
        .eq('user_id', uid);
      if (updateError) throw updateError;
      logger.info('Updated user settings with missing fields', { uid, email });
    }
  } catch (error) {
    logger.error('Failed to ensure user settings', error as Error, { uid, email });
  }
}
