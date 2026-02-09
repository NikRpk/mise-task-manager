/**
 * Slack Connection Test Endpoint
 * Tests if Slack bot token is valid and configured correctly
 */

import { NextRequest, NextResponse } from 'next/server';
import { testSlackConnection } from '@/lib/slack-client';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('Testing Slack connection');
    
    const result = await testSlackConnection();
    
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error('Slack connection test failed', error);
    
    return NextResponse.json(
      { 
        success: false,
        message: error.message || 'Connection test failed',
        error: error.toString()
      },
      { status: 500 }
    );
  }
}
