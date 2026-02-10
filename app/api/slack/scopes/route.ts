/**
 * Slack Scopes Check Endpoint
 * Shows what scopes the current bot token has
 */

import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const slackToken = process.env.SLACK_BOT_TOKEN;
    
    if (!slackToken) {
      return NextResponse.json({
        success: false,
        message: 'SLACK_BOT_TOKEN not configured'
      }, { status: 500 });
    }
    
    const slack = new WebClient(slackToken);
    
    // Call auth.test to get bot info and scopes
    const authTest = await slack.auth.test();
    
    logger.info('Slack auth test result', { 
      team: authTest.team,
      botId: authTest.bot_id,
      userId: authTest.user_id 
    });
    
    return NextResponse.json({
      success: true,
      workspace: authTest.team,
      botId: authTest.bot_id,
      userId: authTest.user_id,
      message: 'Bot authentication successful. Scopes are managed in Slack app settings.'
    });
    
  } catch (error) {
    const err = error as Error & { message: string; data?: unknown };
    logger.error('Failed to check Slack scopes', err);
    
    return NextResponse.json({
      success: false,
      message: err.message,
      error: err.data || err.toString()
    }, { status: 500 });
  }
}
