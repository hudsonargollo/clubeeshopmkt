/**
 * Authentication utilities for client-side OAuth
 * Requirements: 2.1, 2.2, 3.1, 4.1, 4.2
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client for client-side authentication
 * Uses environment variables exposed to the client
 */
export function createBrowserSupabaseClient() {
  const supabaseUrl = (window as any).ENV?.SUPABASE_URL;
  const supabaseAnonKey = (window as any).ENV?.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration not available');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Initiates Google OAuth sign-in flow
 * Redirects to Google consent screen
 */
export async function signInWithGoogle(redirectTo?: string) {
  const supabase = createBrowserSupabaseClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Signs out the current user
 */
export async function signOut() {
  const supabase = createBrowserSupabaseClient();
  
  const { error } = await supabase.auth.signOut();
  
  // Clear local storage tokens using utility function
  clearTokens();
  
  if (error) {
    throw error;
  }
}

/**
 * Token storage keys
 * Requirements: 4.1, 4.2
 */
const ACCESS_TOKEN_KEY = 'sb-access-token';
const REFRESH_TOKEN_KEY = 'sb-refresh-token';

/**
 * Stores authentication tokens in localStorage
 * Requirements: 4.1, 4.2
 * 
 * @param accessToken - JWT access token
 * @param refreshToken - JWT refresh token
 */
export function storeTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Retrieves stored authentication tokens from localStorage
 * Requirements: 4.3
 * 
 * @returns Token object or null if not found
 */
export function getStoredTokens(): { access_token: string; refresh_token: string } | null {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  
  if (!accessToken) {
    return null;
  }
  
  return {
    access_token: accessToken,
    refresh_token: refreshToken || '',
  };
}

/**
 * Clears all authentication tokens from localStorage
 * Requirements: 4.6
 */
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Gets the current session from local storage
 * @deprecated Use getStoredTokens() instead
 */
export function getStoredSession() {
  return getStoredTokens();
}

/**
 * Determines post-auth redirect based on tenant count
 * This is a client-side helper that mirrors server logic
 */
export type PostAuthRoute = '/onboarding' | '/backoffice' | '/portal';

export function getPostAuthRoute(tenantCount: number): PostAuthRoute {
  if (tenantCount === 0) {
    return '/onboarding';
  } else if (tenantCount === 1) {
    return '/backoffice';
  } else {
    return '/portal';
  }
}
