/**
 * Test Slack Connection
 * GET /api/slack/test
 */

import { NextRequest } from 'next/server';
import { testSlackConnection } from '@/lib/slack-client';
import { withAuth } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    const result = await testSlackConnection();
    return Response.json(result);
  });
}
