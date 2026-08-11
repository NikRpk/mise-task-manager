/**
 * Integration tests for GET /api/tasks and POST /api/tasks
 *
 * Verifies authentication enforcement, input validation, and the happy
 * path using the Supabase admin mock from jest.setup.ts / test-utils.
 * The default mock resolves auth.getUser to { id: 'test-user-123', email: 'test@example.com' }.
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/tasks/route';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createMockSupabaseClient } from '../test-utils/supabase-mock';

const ENDPOINT = 'http://localhost/api/tasks';
const AUTH_HEADER = { Authorization: 'Bearer mock-token' };

function makeGetRequest(query = '', headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`${ENDPOINT}${query}`, { method: 'GET', headers });
}

function makePostRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

/** Reset the mock Supabase client to a default "no rows found" state. */
function resetSupabaseMock(): void {
  (getSupabaseAdmin as jest.Mock).mockReturnValue(createMockSupabaseClient());
}

beforeEach(() => {
  resetSupabaseMock();
});

describe('GET /api/tasks', () => {
  describe('authentication', () => {
    it('returns 401 when no Authorization header is present', async () => {
      const res = await GET(makeGetRequest('?projectId=proj-1'));
      expect(res.status).toBe(401);
    });

    it('returns 401 when Authorization header is not Bearer scheme', async () => {
      const res = await GET(
        makeGetRequest('?projectId=proj-1', { Authorization: 'Basic abc123' })
      );
      expect(res.status).toBe(401);
    });
  });

  describe('input validation', () => {
    it('returns 400 when projectId is missing', async () => {
      const res = await GET(makeGetRequest('', AUTH_HEADER));
      expect(res.status).toBe(400);
    });

    it('returns error JSON when projectId is missing', async () => {
      const res = await GET(makeGetRequest('', AUTH_HEADER));
      const body = await res.json();
      expect(body).toHaveProperty('error');
    });
  });

  describe('happy path', () => {
    it('returns 400 when project does not exist', async () => {
      // Default mock returns { data: null } for every table — project not found
      const res = await GET(makeGetRequest('?projectId=nonexistent', AUTH_HEADER));
      expect(res.status).toBe(400);
    });

    it('returns 403 when user is not a project member', async () => {
      (getSupabaseAdmin as jest.Mock).mockReturnValue(
        createMockSupabaseClient({
          projects: { data: { id: 'proj-1' }, error: null },
          project_members: { data: null, error: null },
        })
      );

      const res = await GET(makeGetRequest('?projectId=proj-1', AUTH_HEADER));
      expect(res.status).toBe(403);
    });

    it('returns 200 with tasks when user is a project member', async () => {
      (getSupabaseAdmin as jest.Mock).mockReturnValue(
        createMockSupabaseClient({
          projects: { data: { id: 'proj-1' }, error: null },
          project_members: { data: { user_id: 'test-user-123', role: 'EDIT' }, error: null },
          tasks: {
            data: [
              {
                id: 'task-1',
                project_id: 'proj-1',
                title: 'Hello',
                status: 'todo',
                sub_tasks: [],
                comments: [],
                status_history: [],
                images: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
            error: null,
          },
        })
      );

      const res = await GET(makeGetRequest('?projectId=proj-1', AUTH_HEADER));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.tasks)).toBe(true);
    });
  });
});

describe('POST /api/tasks', () => {
  describe('authentication', () => {
    it('returns 401 when no Authorization header is present', async () => {
      const res = await POST(makePostRequest({ projectId: 'proj-1', title: 'Test' }));
      expect(res.status).toBe(401);
    });

    it('returns 401 when Authorization is not Bearer scheme', async () => {
      const res = await POST(
        makePostRequest({ projectId: 'proj-1', title: 'Test' }, { Authorization: 'Basic abc' })
      );
      expect(res.status).toBe(401);
    });
  });

  describe('input validation', () => {
    it('returns 400 when projectId is missing', async () => {
      const res = await POST(makePostRequest({ title: 'Test' }, AUTH_HEADER));
      expect(res.status).toBe(400);
    });

    it('returns 400 when both title and description are empty', async () => {
      (getSupabaseAdmin as jest.Mock).mockReturnValue(
        createMockSupabaseClient({
          project_members: { data: { role: 'EDIT' }, error: null },
        })
      );

      const res = await POST(
        makePostRequest({ projectId: 'proj-1', title: '', description: '' }, AUTH_HEADER)
      );
      expect(res.status).toBe(400);
    });

    it('returns 403 when user does not have EDIT permission', async () => {
      (getSupabaseAdmin as jest.Mock).mockReturnValue(
        createMockSupabaseClient({
          project_members: { data: { role: 'VIEW' }, error: null },
        })
      );

      const res = await POST(
        makePostRequest({ projectId: 'proj-1', title: 'Test task' }, AUTH_HEADER)
      );
      expect(res.status).toBe(403);
    });
  });
});
