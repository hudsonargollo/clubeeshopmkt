/**
 * Client-side authentication hook
 * Manages Supabase session tokens stored in localStorage
 */

import { useState, useEffect, useCallback } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    accessToken: null,
  });

  useEffect(() => {
    // Check for stored tokens on mount
    const accessToken = localStorage.getItem('sb-access-token');
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
