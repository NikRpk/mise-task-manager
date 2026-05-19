/**
 * Integration tests for Slack API routes.
 *
 * GET  /api/slack/test      — verifies Slack connectivity
 * POST /api/slack/send-note — sends a meeting note to attendees
 *
 * Both endpoints require a valid Firebase auth token via withAuth.
 * The firebase-admin mock in jest.setup.ts resolves verifyIdToken for any Bearer token.
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/slack/test/route';
import { POST } from '@/app/api/slack/send-note/route';

const AUTH_HEADER = { Authorization: 'Bearer mock-token' };

function makeGetRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/slack/test', { method: 'GET', headers });
}

function makePostRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/slack/send-note', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const VALID_NOTE_BODY = {
  noteTitle: 'Weekly Sync',
  noteContent: 'Discussed roadmap items.',
  noteUrl: 'https://docs.example.com/notes/123',
  meetingDate: '2026-05-07',
  allTasks: [],
  attendees: [{ email: 'alice@example.com', tasks: [] }],
};

describe('GET /api/slack/test', () => {
  describe('authentication', () => {
    it('returns 401 without Authorization header', async () => {
      const res = await GET(makeGetRequest());
      expect(res.status).toBe(401);
    });

    it('returns 401 when Authorization is not Bearer scheme', async () => {
      const res = await GET(makeGetRequest({ Authorization: 'Basic abc123' }));
      expect(res.status).toBe(401);
    });
  });
});

describe('POST /api/slack/send-note', () => {
  describe('authentication', () => {
    it('returns 401 without Authorization header', async () => {
      const res = await POST(makePostRequest(VALID_NOTE_BODY));
      expect(res.status).toBe(401);
    });

    it('returns 401 when Authorization is not Bearer scheme', async () => {
      const res = await POST(makePostRequest(VALID_NOTE_BODY, { Authorization: 'Basic abc' }));
      expect(res.status).toBe(401);
    });
  });

  describe('request validation', () => {
    it('returns 400 when noteTitle is missing', async () => {
      const { noteTitle: _, ...body } = VALID_NOTE_BODY;
      const res = await POST(makePostRequest(body, AUTH_HEADER));
      expect(res.status).toBe(400);
    });

    it('returns 400 when noteContent is missing', async () => {
      const { noteContent: _, ...body } = VALID_NOTE_BODY;
      const res = await POST(makePostRequest(body, AUTH_HEADER));
      expect(res.status).toBe(400);
    });

    it('returns 400 when noteUrl is missing', async () => {
      const { noteUrl: _, ...body } = VALID_NOTE_BODY;
      const res = await POST(makePostRequest(body, AUTH_HEADER));
      expect(res.status).toBe(400);
    });

    it('returns 400 when meetingDate is missing', async () => {
      const { meetingDate: _, ...body } = VALID_NOTE_BODY;
      const res = await POST(makePostRequest(body, AUTH_HEADER));
      expect(res.status).toBe(400);
    });

    it('returns 400 when allTasks is not an array', async () => {
      const res = await POST(
        makePostRequest({ ...VALID_NOTE_BODY, allTasks: 'not-an-array' }, AUTH_HEADER)
      );
      expect(res.status).toBe(400);
    });

    it('returns 400 when attendees array is empty', async () => {
      const res = await POST(
        makePostRequest({ ...VALID_NOTE_BODY, attendees: [] }, AUTH_HEADER)
      );
      expect(res.status).toBe(400);
    });

    it('returns 400 when an attendee is missing an email', async () => {
      const res = await POST(
        makePostRequest(
          { ...VALID_NOTE_BODY, attendees: [{ tasks: [] }] },
          AUTH_HEADER
        )
      );
      expect(res.status).toBe(400);
    });

    it('returns 400 when an attendee tasks field is not an array', async () => {
      const res = await POST(
        makePostRequest(
          { ...VALID_NOTE_BODY, attendees: [{ email: 'x@y.com', tasks: 'bad' }] },
          AUTH_HEADER
        )
      );
      expect(res.status).toBe(400);
    });
  });
});
