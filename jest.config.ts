import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    '!lib/supabase/client.ts',
    '!lib/supabase/server.ts',
    '!lib/supabase/admin.ts',
    '!lib/theme-context.tsx',
    '!lib/auth-context.tsx',
    '!lib/cache-context.tsx',
    '!lib/people-context.tsx',
    '!lib/toast-context.tsx',
    '!lib/constants.ts',
    '!lib/api-client.ts',
    '!lib/google-calendar.ts',
    '!lib/google-directory.ts',
    '!lib/auth-middleware.ts',
    '!lib/api-errors.ts',
    '!lib/logger.ts',
    '!lib/use-permissions.ts',
    '!lib/slack-client.ts',
    '!lib/realtime-listeners.ts',
    '!lib/db-mappers.ts',
    '!lib/owner-normalizer.ts',
    '!lib/user-init.ts',
    '!lib/**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThreshold: {
    'global': {
      statements: 20,
      branches: 60,
      functions: 8,
      lines: 20,
    },
    './lib/filters.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    './lib/utils.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    './lib/sanitize.ts': {
      statements: 95,
      branches: 80,
      functions: 100,
      lines: 95,
    },
    './lib/errors.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    './lib/reminders.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/*.{spec,test}.{ts,tsx}',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '__tests__/test-utils/'],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
