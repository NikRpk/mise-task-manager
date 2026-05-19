/**
 * Integration tests for GET /api/tasks and POST /api/tasks
 *
 * Verifies authentication enforcement, input validation, and the happy
 * path using the firebase-admin mock from jest.setup.ts.
 * The mock resolves verifyIdToken with { uid: 'test-user-123', email: 'test@hellofresh.com' }.
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/tasks/route';
import { adminDb } from '@/lib/firebase-admin';

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

/** Reset adminDb.collection to the default mock behavior from jest.setup.ts */
function resetCollectionMock(): void {
  (adminDb.collection as jest.Mock).mockImplementation(() => ({
    doc: jest.fn(() => ({
      get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
      set: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    })),
    get: jest.fn().mockResolvedValue({ docs: [] }),
    where: jest.fn(function () { return this; }),
    orderBy: jest.fn(function () { return this; }),
    limit: jest.fn(function () { return this; }),
    startAfter: jest.fn(function () { return this; }),
  }));
}

beforeEach(() => {
  resetCollectionMock();
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
      // Default mock returns { exists: false } — project is not found
      const res = await GET(makeGetRequest('?projectId=nonexistent', AUTH_HEADER));
      expect(res.status).toBe(400);
    });

    it('returns 403 when user is not a project member', async () => {
      (adminDb.collection as jest.Mock).mockImplementation((collectionName: string) => {
        if (collectionName === 'projects') {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  name: 'Test Project',
                  members: [{ userId: 'other-user', role: 'ADMIN' }],
                }),
              }),
            })),
          };
        }
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
          })),
          get: jest.fn().mockResolvedValue({ docs: [] }),
          where: jest.fn(function () { return this; }),
          orderBy: jest.fn(function () { return this; }),
          limit: jest.fn(function () { return this; }),
        };
      });

      const res = await GET(makeGetRequest('?projectId=proj-1', AUTH_HEADER));
      expect(res.status).toBe(403);
    });

    it('returns 200 with tasks when user is a project member', async () => {
      (adminDb.collection as jest.Mock).mockImplementation((collectionName: string) => {
        if (collectionName === 'projects') {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  name: 'Test Project',
                  members: [{ userId: 'test-user-123', role: 'EDIT' }],
                }),
              }),
            })),
          };
        }
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
          })),
          get: jest.fn().mockResolvedValue({
            docs: [
              {
                id: 'task-1',
                data: () => ({ title: 'Hello', projectId: 'proj-1', status: 'todo' }),
              },
            ],
          }),
          where: jest.fn(function () { return this; }),
          orderBy: jest.fn(function () { return this; }),
          limit: jest.fn(function () { return this; }),
          startAfter: jest.fn(function () { return this; }),
        };
      });

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
      (adminDb.collection as jest.Mock).mockImplementation((collectionName: string) => {
        if (collectionName === 'projects') {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  members: [{ userId: 'test-user-123', role: 'EDIT' }],
                }),
              }),
            })),
          };
        }
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
            set: jest.fn().mockResolvedValue(undefined),
          })),
          get: jest.fn().mockResolvedValue({ docs: [] }),
          where: jest.fn(function () { return this; }),
        };
      });

      const res = await POST(
        makePostRequest({ projectId: 'proj-1', title: '', description: '' }, AUTH_HEADER)
      );
      expect(res.status).toBe(400);
    });
  });
});
