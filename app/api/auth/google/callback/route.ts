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
    
    // Get the proper base URL from environment variable or request headers
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (() => {
        const host = request.headers.get('host');
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        return host ? `${protocol}://${host}` : 'https://hf-tasks.web.app';
      })();
    
    // Check if user denied access
    if (error) {
      logger.info('User denied Google Calendar access', { error });
      return NextResponse.redirect(
        new URL('/settings?section=profile&calendar=denied', baseUrl)
      );
    }
    
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings?section=profile&calendar=error', baseUrl)
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
      new URL('/settings?section=profile&calendar=connected', baseUrl)
    );
  } catch (error) {
    logger.error('OAuth callback error', error as Error);
    
    // Use proper base URL for error redirect too
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (() => {
        const host = request.headers.get('host');
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        return host ? `${protocol}://${host}` : 'https://hf-tasks.web.app';
      })();
    
    return NextResponse.redirect(
      new URL('/settings?section=profile&calendar=error', baseUrl)
    );
  }
}
