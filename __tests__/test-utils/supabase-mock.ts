/**
 * Test helpers for mocking the Supabase service-role client.
 *
 * Supabase's query builder is "thenable" — you can `await` a chain like
 * `db.from('tasks').select('*').eq('id', x)` directly, or call a terminal
 * method like `.single()` / `.maybeSingle()`. This mock supports both.
 *
 * Usage in a test:
 *
 *   import { getSupabaseAdmin } from '@/lib/supabase/admin';
 *   import { createMockSupabaseClient, QueryResult } from '../test-utils/supabase-mock';
 *
 *   (getSupabaseAdmin as jest.Mock).mockReturnValue(
 *     createMockSupabaseClient({
 *       projects: { data: { id: 'proj-1' }, error: null },
 *       project_members: { data: { role: 'EDIT' }, error: null },
 *       tasks: { data: [{ id: 'task-1', title: 'Hello' }], error: null },
 *     })
 *   );
 */

export interface QueryResult {
  data: unknown;
  error: unknown;
}

const CHAIN_METHODS = [
  'select',
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'like',
  'ilike',
  'in',
  'is',
  'contains',
  'not',
  'or',
  'filter',
  'order',
  'limit',
  'range',
] as const;

export function makeQueryBuilder(result: QueryResult = { data: null, error: null }) {
  const builder: Record<string, unknown> = {};

  CHAIN_METHODS.forEach(method => {
    builder[method] = jest.fn(() => builder);
  });

  builder.insert = jest.fn(() => builder);
  builder.update = jest.fn(() => builder);
  builder.upsert = jest.fn(() => builder);
  builder.delete = jest.fn(() => builder);

  builder.single = jest.fn(() => Promise.resolve(result));
  builder.maybeSingle = jest.fn(() => Promise.resolve(result));

  // Makes `await builder` resolve like a real PostgrestBuilder promise.
  builder.then = (
    onResolve?: (value: QueryResult) => unknown,
    onReject?: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(onResolve, onReject);

  return builder;
}

export interface MockSupabaseUser {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
}

export const DEFAULT_MOCK_USER: MockSupabaseUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  user_metadata: { full_name: 'Test User' },
};

/**
 * Creates a mock Supabase admin client.
 * `tableResults` maps table name -> the QueryResult every query against that
 * table resolves to (regardless of which filters were chained on).
 */
export function createMockSupabaseClient(
  tableResults: Record<string, QueryResult> = {},
  user: MockSupabaseUser | null = DEFAULT_MOCK_USER
) {
  const from = jest.fn((table: string) =>
    makeQueryBuilder(tableResults[table] ?? { data: null, error: null })
  );

  return {
    from,
    auth: {
      getUser: jest.fn(() =>
        Promise.resolve(
          user
            ? { data: { user }, error: null }
            : { data: { user: null }, error: new Error('Invalid token') }
        )
      ),
      admin: {
        listUsers: jest.fn(() => Promise.resolve({ data: { users: [] }, error: null })),
      },
    },
  };
}
