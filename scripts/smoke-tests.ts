#!/usr/bin/env node
/**
 * Post-deploy smoke tests
 *
 * Run locally:
 *   npm run test:smoke
 *
 * Run against a live deployment:
 *   BASE_URL=https://your-app.web.app npm run test:smoke
 *
 * Run with Slack connectivity check:
 *   BASE_URL=https://... SMOKE_AUTH_TOKEN=<firebase-id-token> npm run test:smoke
 *
 * Exit code 0 = all checks passed.
 * Exit code 1 = one or more checks failed.
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const AUTH_TOKEN = process.env.SMOKE_AUTH_TOKEN ?? '';

interface CheckResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

const results: CheckResult[] = [];

async function check(
  name: string,
  fn: () => Promise<{ status: number }>,
  expectedStatus: number | number[]
): Promise<void> {
  const expectedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
  try {
    const res = await fn();
    const passed = expectedStatuses.includes(res.status);
    results.push({
      name,
      passed,
      expected: expectedStatuses.join(' or '),
      actual: String(res.status),
    });
  } catch (err) {
    results.push({
      name,
      passed: false,
      expected: expectedStatuses.join(' or '),
      actual: `Error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}

async function run(): Promise<void> {
  console.log(`\nSmoke tests → ${BASE_URL}\n${'─'.repeat(60)}`);

  // 1. App responds at all
  await check(
    'GET / → app is up',
    () => fetch(`${BASE_URL}/`),
    [200, 302, 307, 308]
  );

  // 2. Auth enforcement — settings endpoint requires a valid token
  await check(
    'GET /api/settings (no auth) → 401',
    () => fetch(`${BASE_URL}/api/settings`),
    401
  );

  // 3. Cron endpoint is protected — missing Cloud Scheduler header
  await check(
    'POST /api/cron/daily-reminders (no header) → 401',
    () =>
      fetch(`${BASE_URL}/api/cron/daily-reminders`, { method: 'POST' }),
    401
  );

  // 4. Cron endpoint rejects wrong header value
  await check(
    'POST /api/cron/daily-reminders (wrong header) → 401',
    () =>
      fetch(`${BASE_URL}/api/cron/daily-reminders`, {
        method: 'POST',
        headers: { 'X-CloudScheduler-JobName': 'not-the-right-job' },
      }),
    401
  );

  // 5. Tasks endpoint requires auth
  await check(
    'GET /api/tasks (no auth) → 401',
    () => fetch(`${BASE_URL}/api/tasks?projectId=any`),
    401
  );

  // 6. Slack send-note requires auth
  await check(
    'POST /api/slack/send-note (no auth) → 401',
    () =>
      fetch(`${BASE_URL}/api/slack/send-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    401
  );

  // 7. Optional: Slack connectivity — only runs when a token is supplied
  if (AUTH_TOKEN) {
    await check(
      'GET /api/slack/test (with auth) → 200 (Slack connected)',
      () =>
        fetch(`${BASE_URL}/api/slack/test`, {
          headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        }),
      200
    );
  } else {
    console.log('  ⚠  Skipping Slack connectivity check (set SMOKE_AUTH_TOKEN to enable)');
  }

  // ── Results ──────────────────────────────────────────────────────────────
  console.log('');
  let failures = 0;
  for (const r of results) {
    const icon = r.passed ? '✓' : '✗';
    const line = `  ${icon} ${r.name}`;
    if (r.passed) {
      console.log(line);
    } else {
      console.error(`${line}\n      expected ${r.expected}, got ${r.actual}`);
      failures++;
    }
  }

  const total = results.length;
  const passed = total - failures;
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${passed}/${total} checks passed`);

  if (failures > 0) {
    console.error(`\n${failures} smoke test(s) failed.\n`);
    process.exit(1);
  }

  console.log('\nAll smoke tests passed.\n');
}

run().catch(err => {
  console.error('Unexpected error running smoke tests:', err);
  process.exit(1);
});
