/**
 * Client-side API helper with authentication and comprehensive error logging
 */
import { auth } from './firebase';

export interface ApiError {
  message: string;
  status: number;
  url: string;
  method: string;
  response?: unknown;
  isCalendarAuthError?: boolean;
}

/**
 * Enhanced authenticated fetch with automatic error logging to browser console
 * Logs full request/response details for easy debugging
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  
  if (!user) {
    const error = new Error('User not authenticated');
    console.error('🔴 API Auth Error: User not authenticated');
    throw error;
  }

  const token = await user.getIdToken();
  const method = options.method || 'GET';

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Log outgoing request (collapsed by default)
  console.groupCollapsed(`🔵 API ${method}: ${url}`);
  console.log('Method:', method);
  console.log('URL:', url);
  if (options.body) {
    try {
      console.log('Body:', JSON.parse(options.body as string));
    } catch {
      console.log('Body:', options.body);
    }
  }
  console.groupEnd();

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Log response (success or error)
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorData: unknown = null;
      
      try {
        if (contentType?.includes('application/json')) {
          errorData = await response.clone().json();
        } else {
          errorData = await response.clone().text();
        }
      } catch {
        errorData = 'Failed to parse error response';
      }

      // Enhanced error logging with full context
      console.groupCollapsed(`🔴 API Error: ${method} ${url} - ${response.status}`);
      console.log('Status:', response.status, response.statusText);
      console.log('URL:', url);
      console.log('Method:', method);
      console.log('Response:', errorData);
      
      // Check if it's a calendar auth error
      const isCalendarAuthError = 
        url.includes('/api/calendar') && 
        (response.status === 401 || response.status === 500) &&
        (
          typeof errorData === 'object' && 
          errorData !== null && 
          'error' in errorData && 
          (
            String((errorData as Record<string, unknown>).error).includes('Calendar') ||
            String((errorData as Record<string, unknown>).error).includes('token') ||
            String((errorData as Record<string, unknown>).error).includes('auth')
          )
        );

      if (isCalendarAuthError) {
        console.warn('⚠️ Calendar Authentication Error Detected');
        console.warn('💡 Action Required: Reconnect Google Calendar in Settings');
      }

      console.trace('Stack trace:');
      console.groupEnd();

      // Enhance the response object with parsed error data
      const enhancedResponse = response.clone();
      (enhancedResponse as Response & { parsedError?: unknown }).parsedError = errorData;
      
      return enhancedResponse;
    }

    // Log successful response (collapsed by default)
    console.groupCollapsed(`✅ API Success: ${method} ${url}`);
    console.log('Status:', response.status);
    console.groupEnd();

    return response;
  } catch (networkError) {
    // Network-level errors (no response received)
    console.groupCollapsed(`🔴 API Network Error: ${method} ${url}`);
    console.error('Error:', networkError);
    console.log('URL:', url);
    console.log('Method:', method);
    console.trace('Stack trace:');
    console.groupEnd();
    
    throw networkError;
  }
}

/**
 * Extract user-friendly error message from API response
 */
export async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data && typeof data === 'object' && 'error' in data) {
      return String(data.error);
    }
    return `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

/**
 * Check if error is a calendar authentication error
 */
export function isCalendarAuthError(response: Response, errorMessage: string): boolean {
  return (
    response.url.includes('/api/calendar') && 
    (response.status === 401 || response.status === 500) &&
    (
      errorMessage.toLowerCase().includes('calendar') ||
      errorMessage.toLowerCase().includes('token') ||
      errorMessage.toLowerCase().includes('connect')
    )
  );
}
