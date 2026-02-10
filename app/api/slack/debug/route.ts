/**
 * Slack Debug Endpoint
 * Test sending to a specific email
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendNoteToSlackUser } from '@/lib/slack-client';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    
    logger.info('Debug: Testing Slack send to email', { email });
    
    const result = await sendNoteToSlackUser(
      email,
      'Test Meeting Note',
      '<p>This is a test message from the Task Manager</p>',
      'http://localhost:3000/notes/test',
      new Date().toISOString(),
      [{ id: '1', title: 'Test task for you', owner: email, deadline: null }],
      [{ id: '1', title: 'Test task for you', owner: email, deadline: null }]
    );
    
    return NextResponse.json(result);
  } catch (error) {
    const err = error as Error & { message: string; stack?: string };
    logger.error('Debug endpoint error', err);
    return NextResponse.json({ 
      success: false, 
      message: err.message,
      stack: err.stack 
    }, { status: 500 });
  }
}
