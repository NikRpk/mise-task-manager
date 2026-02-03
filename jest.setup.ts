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

// Mock Firebase
jest.mock('./lib/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn(() => Promise.resolve('mock-token')),
      uid: 'test-user-123',
    },
  },
  db: {},
  googleProvider: {},
}));

// Mock Firebase Admin
jest.mock('./lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: jest.fn(() => Promise.resolve({
      uid: 'test-user-123',
      email: 'test@hellofresh.com',
      name: 'Test User',
    })),
  },
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({
          exists: false,
          data: () => ({}),
        })),
        set: jest.fn(() => Promise.resolve()),
        update: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve()),
      })),
      get: jest.fn(() => Promise.resolve({ docs: [] })),
      where: jest.fn(function() { return this; }),
      orderBy: jest.fn(function() { return this; }),
      limit: jest.fn(function() { return this; }),
    })),
  },
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

