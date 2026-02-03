/**
 * Google OAuth initiation endpoint
 * Redirects user to Google consent screen
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query parameter (passed from client)
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Generate authorization URL with state parameter containing user ID
    const authUrl = getAuthorizationUrl();
    const urlWithState = `${authUrl}&state=${userId}`;
    
    // Redirect to Google consent screen
    return NextResponse.redirect(urlWithState);
  } catch (error) {
    console.error('Error initiating Google OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google Calendar connection' },
      { status: 500 }
    );
  }
}
