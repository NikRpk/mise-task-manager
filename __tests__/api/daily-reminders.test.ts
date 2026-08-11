/**
 * Integration tests for GET/POST /api/cron/daily-reminders
 *
 * These tests invoke the route handler directly (no HTTP server needed)
 * and rely on the Supabase admin mock from jest.setup.ts / test-utils.
 * Vercel Cron sends GET with `Authorization: Bearer $CRON_SECRET`; the
 * route also accepts POST for manual/test triggering.
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/cron/daily-reminders/route';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createMockSupabaseClient } from '../test-utils/supabase-mock';

const ENDPOINT = 'http://localhost/api/cron/daily-reminders';
const CRON_SECRET = 'test-cron-secret';
const VALID_AUTH_HEADER = { Authorization: `Bearer ${CRON_SECRET}` };

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(ENDPOINT, { method: 'GET', headers });
}

function makePostRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(ENDPOINT, { method: 'POST', headers });
}

beforeEach(() => {
  process.env.CRON_SECRET = CRON_SECRET;
  (getSupabaseAdmin as jest.Mock).mockReturnValue(
    createMockSupabaseClient({
      user_settings: { data: [], error: null },
    })
  );
});

describe('GET /api/cron/daily-reminders', () => {
  describe('authentication guard', () => {
    it('returns 401 when Authorization header is absent', async () => {
      const res = await GET(makeRequest());
      expect(res.status).toBe(401);
    });

    it('returns 401 when the bearer token is wrong', async () => {
      const res = await GET(makeRequest({ Authorization: 'Bearer wrong-secret' }));
      expect(res.status).toBe(401);
    });

    it('returns 401 response body with error field', async () => {
      const res = await GET(makeRequest());
      const body = await res.json();
      expect(body).toHaveProperty('error');
    });
  });

  describe('successful execution', () => {
    it('returns 200 when the correct bearer token is present', async () => {
      const res = await GET(makeRequest(VALID_AUTH_HEADER));
      expect(res.status).toBe(200);
    });

    it('returns zero processed users when there are no user settings', async () => {
      const res = await GET(makeRequest(VALID_AUTH_HEADER));
      const body = await res.json();
      expect(body.processedUsers).toBe(0);
      expect(body.results).toEqual([]);
    });

    it('skips a user that has no Slack reminder configured', async () => {
      (getSupabaseAdmin as jest.Mock).mockReturnValue(
        createMockSupabaseClient({
          user_settings: {
            data: [
              {
                user_id: 'user-no-slack',
                email: 'noslack@example.com',
                display_name: 'No Slack',
                notifications: { dailyTaskReminder: { enabled: true, slack: false } },
              },
            ],
            error: null,
          },
        })
      );

      const res = await GET(makeRequest(VALID_AUTH_HEADER));
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.processedUsers).toBe(0);
    });

    it('skips a user that has no email in their settings', async () => {
      (getSupabaseAdmin as jest.Mock).mockReturnValue(
        createMockSupabaseClient({
          user_settings: {
            data: [
              {
                user_id: 'user-no-email',
                display_name: 'No Email',
                notifications: { dailyTaskReminder: { enabled: true, slack: true } },
              },
            ],
            error: null,
          },
        })
      );

      const res = await GET(makeRequest(VALID_AUTH_HEADER));
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.processedUsers).toBe(0);
    });
  });
});

describe('POST /api/cron/daily-reminders', () => {
  it('also accepts a valid bearer token (manual/test triggering)', async () => {
    const res = await POST(makePostRequest(VALID_AUTH_HEADER));
    expect(res.status).toBe(200);
  });

  it('returns 401 without the bearer token', async () => {
    const res = await POST(makePostRequest());
    expect(res.status).toBe(401);
  });
});
