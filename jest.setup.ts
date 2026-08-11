import '@testing-library/jest-dom';

// Polyfill for Next.js server APIs
global.Request = global.Request || class Request {};
global.Response = global.Response || class Response {};
global.Headers = global.Headers || class Headers {};

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    };
  },
  useSearchParams() {
    return {
      get: jest.fn(() => null),
    };
  },
  usePathname() {
    return '';
  },
}));

import { createMockSupabaseClient } from './__tests__/test-utils/supabase-mock';

// Mock Supabase admin client (server-side, service-role)
jest.mock('./lib/supabase/admin', () => {
  const mockClient = createMockSupabaseClient();
  return {
    getSupabaseAdmin: jest.fn(() => mockClient),
    supabaseAdmin: mockClient,
  };
});

// Mock Supabase browser client
jest.mock('./lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({ data: { session: { access_token: 'mock-token' } } })
      ),
      getUser: jest.fn(() =>
        Promise.resolve({ data: { user: { id: 'test-user-123', email: 'test@example.com' } } })
      ),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signInWithPassword: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      signUp: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      signInWithOAuth: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
  })),
}));

// Suppress console output in tests unless debugging
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
};

