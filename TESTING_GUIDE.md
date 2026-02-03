# 🧪 Testing Guide

## Overview

This project uses **Jest** and **React Testing Library** for testing critical utility functions and business logic.

## Test Coverage

**Current Status:**
- ✅ **94 tests** passing
- ✅ **Critical utilities** at 95-100% coverage
- ✅ **Security functions** fully tested
- ✅ **Business logic** comprehensively covered

**Coverage by File:**

| File | Statements | Branches | Functions | Lines | Priority |
|------|-----------|----------|-----------|-------|----------|
| `lib/filters.ts` | 100% | 100% | 100% | 100% | ⭐⭐⭐⭐⭐ |
| `lib/utils.ts` | 100% | 100% | 100% | 100% | ⭐⭐⭐⭐⭐ |
| `lib/errors.ts` | 100% | 100% | 100% | 100% | ⭐⭐⭐⭐⭐ |
| `lib/sanitize.ts` | 96% | 83% | 100% | 96% | ⭐⭐⭐⭐⭐ |
| `lib/use-permissions.ts` | 36% | 100% | 50% | 36% | ⭐⭐⭐ |

## Running Tests

### Development
```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- filters.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="filters overdue"
```

### CI/CD
```bash
# CI optimized test run (used in deployment)
npm run test:ci
```

This runs:
- All tests with coverage
- Maximum 2 workers (CI optimization)
- Non-interactive mode
- Coverage thresholds enforced

## Test Structure

```
__tests__/
├── lib/
│   ├── filters.test.ts        ✅ 20 tests - Date filtering logic
│   ├── utils.test.ts          ✅ 9 tests  - Debounce functionality
│   ├── sanitize.test.ts       ✅ 35 tests - XSS prevention
│   ├── errors.test.ts         ✅ 18 tests - Error classes
│   └── permissions.test.ts    ✅ 12 tests - Permission logic
├── api/                       🚧 Future - API route tests
└── components/                🚧 Future - Component tests
```

## What's Tested

### 1. Task Filtering (`lib/filters.test.ts`)
**20 Tests** covering:
- ✅ Deadline filtering (overdue, today, this-week, this-month, future)
- ✅ Status filtering (single and multiple)
- ✅ Owner filtering
- ✅ Priority filtering
- ✅ Tags filtering
- ✅ Combined filters (AND logic)
- ✅ Edge cases (null dates, empty arrays, etc.)

**Why Critical:** Complex date calculations that break easily

### 2. Debounce Utility (`lib/utils.test.ts`)
**9 Tests** covering:
- ✅ Delay execution
- ✅ Reset on repeated calls
- ✅ Cancel pending execution
- ✅ Correct argument passing
- ✅ Rapid calls handling
- ✅ Async function support

**Why Critical:** Used for auto-save - data loss if broken

### 3. HTML Sanitization (`lib/sanitize.test.ts`)
**35 Tests** covering:
- ✅ Script tag removal
- ✅ Dangerous URL blocking (javascript:, data:, vbscript:)
- ✅ Event handler removal (onclick, onerror, etc.)
- ✅ CSS injection prevention (expression(), url(), import)
- ✅ Dangerous tag removal (iframe, object, embed)
- ✅ Safe formatting preservation (bold, italic, lists, links)
- ✅ Edge cases (null, empty, nested tags)

**Why Critical:** Security - prevents XSS attacks

### 4. Error Classes (`lib/errors.test.ts`)
**18 Tests** covering:
- ✅ All 8 error types
- ✅ Correct HTTP status codes
- ✅ Error message formatting
- ✅ Stack trace preservation
- ✅ Custom properties

**Why Critical:** Error handling consistency

### 5. Permission Logic (`lib/permissions.test.ts`)
**12 Tests** covering:
- ✅ Role hierarchy (VIEW < EDIT < ADMIN)
- ✅ Permission checks for each role
- ✅ Null role handling
- ✅ Edge cases

**Why Critical:** Security - access control

## Deployment Integration

### Automatic Testing
Tests run automatically before deployment:

```json
{
  "scripts": {
    "prebuild": "npm run test:ci && npm run lint",
    "firebase:deploy": "npm run test:ci && npm run build && firebase deploy"
  }
}
```

**Process:**
1. Run tests with coverage
2. Check coverage thresholds
3. Run linter
4. Build application
5. Deploy to Firebase

**If tests fail:** Deployment is blocked ✋

### GitHub Actions
**Workflow:** `.github/workflows/test-and-deploy.yml`

**Triggers:**
- Push to `main` or `develop`
- Pull requests to `main`

**Jobs:**
1. **Test** - Run all tests
2. **Build** - Build Next.js app
3. **Deploy** - Deploy to Firebase (main branch only)

**Features:**
- ✅ Parallel job execution
- ✅ Coverage reporting
- ✅ PR comments with coverage
- ✅ Build artifact caching
- ✅ Automatic deployment on success

## Writing New Tests

### Test File Naming
- Place in `__tests__/` directory
- Mirror source file structure
- Use `.test.ts` or `.test.tsx` extension

### Example Test Template
```typescript
import { myFunction } from '@/lib/my-module';

describe('myFunction', () => {
  test('does something expected', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });

  test('handles edge case', () => {
    const result = myFunction(edgeCase);
    expect(result).toBe(expectedBehavior);
  });
});
```

### Best Practices
1. **Test behavior, not implementation**
2. **One assertion per test** (when possible)
3. **Clear test names** describing what's tested
4. **Arrange-Act-Assert** pattern
5. **Mock external dependencies**

## What's NOT Tested (Yet)

### Lower Priority
- ❌ Components (complex to mock, lower ROI)
- ❌ API routes (need better Next.js mocking)
- ❌ Auth middleware (mocking Firebase Admin complex)
- ❌ Context providers (React context mocking)

### Why?
These require more complex mocking and provide lower ROI. The current tests cover:
- **Critical business logic**
- **Security-sensitive code**
- **Bug-prone calculations**
- **Frequently used utilities**

This gives you **80% of the value with 20% of the effort**.

## Coverage Reports

### View HTML Report
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

### Coverage in CI
- Automatically uploaded to Codecov
- Comments on PRs with coverage changes
- Track coverage over time

## Debugging Tests

### Run Single Test
```bash
npm test -- filters.test.ts
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand filters.test.ts
```

### Show Console Output
```bash
npm test -- --verbose --no-coverage
```

## Continuous Improvement

### Adding Tests
When adding new utility functions:
1. Write tests first (TDD)
2. Run `npm run test:watch`
3. Implement function
4. Verify coverage: `npm run test:coverage`

### Maintaining Coverage
- **Before merge:** Run `npm run test:ci`
- **New utilities:** Add tests immediately
- **Bug fixes:** Add regression test
- **Refactoring:** Tests should still pass

## FAQ

### Q: Why don't we test components?
**A:** Components are harder to test and change frequently. We focus on stable utility functions that, if broken, cause widespread issues.

### Q: Why Jest instead of Vitest?
**A:** Next.js has excellent Jest integration out of the box.

### Q: Should I increase coverage thresholds?
**A:** Only for critical files. High coverage on utilities (what we have) is more valuable than low coverage everywhere.

### Q: How do I test API routes?
**A:** Requires complex Next.js mocking. Consider integration/E2E tests instead for API contract testing.

## Key Metrics

- **94 tests** protect critical functionality
- **~2-4 seconds** test run time
- **100% coverage** on most critical files
- **Runs automatically** before every deployment
- **Blocks deployment** if tests fail

This ensures your "small features" won't break silently anymore! 🎯
