/**
 * Client-side authentication hook
 * Manages Supabase session tokens stored in localStorage
 */

import { useState, useEffect, useCallback } from 'react';

interface AuthState {
  isAuthenticated: boolean | undefined; // undefined = not yet checked
  isLoading: boolean;
  accessToken: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: undefined, // Start as undefined to indicate "not yet checked"
    isLoading: true,
    accessToken: null,
  });

  useEffect(() => {
    // Check for stored tokens on mount
    console.log('useAuth: checking localStorage for tokens');
    const accessToken = localStorage.getItem('sb-access-token');
    console.log('useAuth: accessToken found:', !!accessToken);
    setState({
      isAuthenticated: !!accessToken,
      isLoading: false,
      accessToken,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sb-access-token');
    localStorage.removeItem('sb-refresh-token');
    setState({
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
    });
    window.location.href = '/login';
  }, []);

  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem('sb-access-token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }, []);

  return {
    ...state,
    logout,
    getAuthHeaders,
  };
}

/**
 * Fetch wrapper that automatically adds auth headers
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('sb-access-token') : null;
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
