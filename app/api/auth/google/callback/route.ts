/**
 * Google OAuth callback endpoint
 * Handles the redirect from Google after user grants permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, storeUserRefreshToken } from '@/lib/google-calendar';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Contains user ID
    const error = searchParams.get('error');
    
    // Check if user denied access
    if (error) {
      logger.info('User denied Google Calendar access', { error });
      return NextResponse.redirect(
        new URL('/settings?section=profile&calendar=denied', request.url)
      );
    }
    
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings?section=profile&calendar=error', request.url)
      );
    }
    
    const userId = state;
    
    // Exchange code for tokens
    const { refreshToken } = await exchangeCodeForTokens(code);
    
    // Store refresh token in database
    await storeUserRefreshToken(userId, refreshToken);
    
    logger.info('Google Calendar connected successfully', { userId });
    
    // Redirect back to settings with success message
    return NextResponse.redirect(
      new URL('/settings?section=profile&calendar=connected', request.url)
    );
  } catch (error) {
    logger.error('OAuth callback error', error as Error);
    return NextResponse.redirect(
      new URL('/settings?section=profile&calendar=error', request.url)
    );
  }
}
