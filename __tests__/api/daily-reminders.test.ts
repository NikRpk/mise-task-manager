/**
 * Integration tests for POST /api/cron/daily-reminders
 *
 * These tests invoke the route handler directly (no HTTP server needed)
 * and rely on the firebase-admin mock from jest.setup.ts.
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/cron/daily-reminders/route';
import { adminDb } from '@/lib/firebase-admin';

const ENDPOINT = 'http://localhost/api/cron/daily-reminders';
const VALID_JOB_HEADER = 'daily-task-reminders';

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(ENDPOINT, { method: 'POST', headers });
}

describe('POST /api/cron/daily-reminders', () => {
  describe('authentication guard', () => {
    it('returns 401 when Cloud Scheduler header is absent', async () => {
      const res = await POST(makeRequest());
      expect(res.status).toBe(401);
    });

    it('returns 401 when Cloud Scheduler header has the wrong value', async () => {
      const res = await POST(makeRequest({ 'X-CloudScheduler-JobName': 'wrong-job' }));
      expect(res.status).toBe(401);
    });

    it('returns 401 when Cloud Scheduler header is an empty string', async () => {
      const res = await POST(makeRequest({ 'X-CloudScheduler-JobName': '' }));
      expect(res.status).toBe(401);
    });

    it('returns 401 response body with error field', async () => {
      const res = await POST(makeRequest());
      const body = await res.json();
      expect(body).toHaveProperty('error');
    });
  });

  describe('successful execution', () => {
    it('returns 200 when the correct header is present', async () => {
      const res = await POST(
        makeRequest({ 'X-CloudScheduler-JobName': VALID_JOB_HEADER })
      );
      expect(res.status).toBe(200);
    });

    it('returns zero processed users when Firestore has no user settings', async () => {
      // Default mock from jest.setup.ts returns { docs: [] }
      const res = await POST(
        makeRequest({ 'X-CloudScheduler-JobName': VALID_JOB_HEADER })
      );
      const body = await res.json();
      expect(body.processedUsers).toBe(0);
      expect(body.results).toEqual([]);
    });

    it('skips a user that has no Slack reminder configured', async () => {
      const mockCollection = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: 'user-no-slack',
              data: () => ({
                email: 'noslack@example.com',
                displayName: 'No Slack',
                notifications: {
                  dailyTaskReminder: { enabled: true, slack: false },
                },
              }),
            },
          ],
        }),
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
        })),
        where: jest.fn(function () { return this; }),
        orderBy: jest.fn(function () { return this; }),
        limit: jest.fn(function () { return this; }),
      });

      (adminDb.collection as jest.Mock).mockImplementationOnce(mockCollection);

      const res = await POST(
        makeRequest({ 'X-CloudScheduler-JobName': VALID_JOB_HEADER })
      );
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.processedUsers).toBe(0);
    });

    it('skips a user that has no email in their settings', async () => {
      const mockCollection = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: 'user-no-email',
              data: () => ({
                displayName: 'No Email',
                notifications: {
                  dailyTaskReminder: { enabled: true, slack: true },
                },
              }),
            },
          ],
        }),
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
        })),
        where: jest.fn(function () { return this; }),
        orderBy: jest.fn(function () { return this; }),
        limit: jest.fn(function () { return this; }),
      });

      (adminDb.collection as jest.Mock).mockImplementationOnce(mockCollection);

      const res = await POST(
        makeRequest({ 'X-CloudScheduler-JobName': VALID_JOB_HEADER })
      );
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.processedUsers).toBe(0);
    });
  });
});
