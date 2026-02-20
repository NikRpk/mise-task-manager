/**
 * Test Slack Connection
 * GET /api/slack/test
 */

import { NextResponse } from 'next/server';
import { testSlackConnection } from '@/lib/slack-client';

export async function GET() {
  const result = await testSlackConnection();
  return NextResponse.json(result);
}
