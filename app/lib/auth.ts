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
  
  // Clear local storage tokens
  localStorage.removeItem('sb-access-token');
  localStorage.removeItem('sb-refresh-token');
  
  if (error) {
    throw error;
  }
}

/**
 * Gets the current session from local storage
 */
export function getStoredSession() {
  const accessToken = localStorage.getItem('sb-access-token');
  const refreshToken = localStorage.getItem('sb-refresh-token');
  
  if (!accessToken) {
    return null;
  }
  
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
  };
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
