/**
 * Owner normalization
 *
 * The canonical identity for a task's `owner` field is the user's email. In
 * the past the Kanban board accidentally wrote `displayName` ("Niklas Röpke")
 * instead of the email, which broke the daily-reminder cron because it
 * queries `tasks where owner == userEmail`.
 *
 * `normalizeOwner` accepts whatever was posted by the client and — if the
 * value is a known `displayName` — rewrites it to the matching email. If the
 * value already looks like an email, or is an unknown free-text string, it is
 * returned unchanged so team members can still assign tasks to people who
 * haven't been onboarded into the auth system yet.
 */
import { getSupabaseAdmin } from './supabase/admin';
import { logger } from './logger';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface NormalizeResult {
  owner: string;
  wasRewritten: boolean;
  source: 'email' | 'empty' | 'userSettings' | 'people' | 'unknown';
}

let cachedMap: Map<string, string> | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

/**
 * Builds a displayName → email lookup from `user_settings` and `people`.
 * Cached for 60s to avoid re-querying both tables on every task write.
 */
async function loadDisplayNameToEmailMap(): Promise<Map<string, string>> {
  if (cachedMap && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedMap;
  }

  const map = new Map<string, string>();

  const [{ data: settingsRows }, { data: peopleRows }] = await Promise.all([
    getSupabaseAdmin().from('user_settings').select('display_name, email'),
    getSupabaseAdmin().from('people').select('display_name, email'),
  ]);

  (settingsRows || []).forEach((row) => {
    if (row.display_name && row.email) {
      map.set(row.display_name.trim(), row.email);
    }
  });

  (peopleRows || []).forEach((row) => {
    if (row.email && row.display_name) {
      map.set(row.display_name.trim(), row.email);
    }
  });

  cachedMap = map;
  cachedAt = Date.now();
  return map;
}

/**
 * Normalizes a task owner value to an email where possible.
 *
 * @param rawOwner - Whatever the client sent for `owner`
 * @param context  - Contextual fields used purely for the warning log
 * @returns The normalized owner value and provenance metadata
 */
export async function normalizeOwner(
  rawOwner: string | undefined | null,
  context: { taskId?: string; userId?: string } = {}
): Promise<NormalizeResult> {
  const trimmed = (rawOwner ?? '').trim();

  if (!trimmed) {
    return { owner: '', wasRewritten: false, source: 'empty' };
  }

  if (EMAIL_SHAPE.test(trimmed)) {
    return { owner: trimmed, wasRewritten: false, source: 'email' };
  }

  try {
    const map = await loadDisplayNameToEmailMap();
    const email = map.get(trimmed);
    if (email) {
      logger.info('Task owner rewritten from displayName to email', {
        ...context,
        rawOwner: trimmed,
        resolvedEmail: email,
      });
      return { owner: email, wasRewritten: true, source: 'userSettings' };
    }
  } catch (error) {
    logger.error(
      'Failed to load displayName→email map while normalizing owner',
      error as Error,
      { ...context, rawOwner: trimmed }
    );
  }

  logger.warn('Task owner is not an email and no mapping was found', {
    ...context,
    rawOwner: trimmed,
  });

  return { owner: trimmed, wasRewritten: false, source: 'unknown' };
}
