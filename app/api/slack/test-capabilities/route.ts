/**
 * Slack Capabilities Test Endpoint
 * Tests what the bot can actually do with current permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    
    const slackToken = process.env.SLACK_BOT_TOKEN;
    if (!slackToken) {
      return NextResponse.json({ error: 'Token not configured' }, { status: 500 });
    }
    
    const slack = new WebClient(slackToken);
    const results: any = {
      email,
      tests: {}
    };
    
    // Test 1: Can we look up user by email?
    try {
      const userLookup = await slack.users.lookupByEmail({ email });
      results.tests.lookupUserByEmail = {
        success: true,
        userId: userLookup.user?.id,
        userName: userLookup.user?.name
      };
    } catch (error: any) {
      results.tests.lookupUserByEmail = {
        success: false,
        error: error.data?.error || error.message,
        needsScope: 'users:read.email'
      };
    }
    
    // Test 2: Can we send a message? (only if user lookup succeeded)
    if (results.tests.lookupUserByEmail.success) {
      const userId = results.tests.lookupUserByEmail.userId;
      
      try {
        const message = await slack.chat.postMessage({
          channel: userId,
          text: '🧪 Test message from Task Manager - checking bot capabilities'
        });
        results.tests.sendMessage = {
          success: true,
          messageTs: message.ts
        };
      } catch (error: any) {
        results.tests.sendMessage = {
          success: false,
          error: error.data?.error || error.message,
          needsScope: 'chat:write'
        };
      }
      
      // Test 3: Can we upload a file?
      try {
        await slack.files.uploadV2({
          channels: userId,
          content: '# Test File\n\nThis is a test from the Task Manager.',
          filename: 'test.md',
          title: 'Capability Test'
        });
        results.tests.uploadFile = {
          success: true
        };
      } catch (error: any) {
        results.tests.uploadFile = {
          success: false,
          error: error.data?.error || error.message,
          needsScope: 'files:write'
        };
      }
    }
    
    // Summary
    const allTests = Object.values(results.tests);
    const successCount = allTests.filter((t: any) => t.success).length;
    results.summary = {
      total: allTests.length,
      successful: successCount,
      failed: allTests.length - successCount,
      canSendNotifications: successCount === allTests.length
    };
    
    logger.info('Capability test complete', results);
    
    return NextResponse.json(results);
    
  } catch (error: any) {
    logger.error('Capability test error', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 });
  }
}
