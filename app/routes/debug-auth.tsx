/**
 * Debug Authentication State
 * Shows current authentication status and tokens
 */

import { useEffect, useState } from 'react';
import type { MetaFunction } from '@remix-run/cloudflare';

export const meta: MetaFunction = () => {
  return [{ title: 'Debug Auth - ClubeeShopMkt' }];
};

export default function DebugAuthPage() {
  const [authState, setAuthState] = useState<any>(null);
  const [serverDebug, setServerDebug] = useState<any>(null);

  useEffect(() => {
    console.log('DebugAuthPage useEffect running');
    
    const accessToken = localStorage.getItem('sb-access-token');
    const refreshToken = localStorage.getItem('sb-refresh-token');
    
    console.log('Tokens from localStorage:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
    });
    
    // Try to decode the JWT to see if it's valid
    let decodedToken = null;
    if (accessToken) {
      try {
        const payload = accessToken.split('.')[1];
        decodedToken = JSON.parse(atob(payload));
        console.log('Decoded token:', decodedToken);
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }

    const state = {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0,
      decodedToken,
      isExpired: decodedToken ? Date.now() / 1000 > decodedToken.exp : null,
      expiresAt: decodedToken ? new Date(decodedToken.exp * 1000).toISOString() : null,
    };
    
    console.log('Setting auth state:', state);
    setAuthState(state);

    // Test server-side token validation
    if (accessToken) {
      fetch('/api/debug-tokens', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })
        .then(response => response.json())
        .then(data => {
          console.log('Server debug response:', data);
          setServerDebug(data);
        })
        .catch(error => {
          console.error('Server debug error:', error);
          setServerDebug({ error: error.message });
        });
    }
  }, []);

  const testOnboardingCall = async () => {
    const accessToken = localStorage.getItem('sb-access-token');
    
    try {
      const response = await fetch('/onboarding', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'shopName=Debug Test&subdomain=debugtest123'
      });
      
      const result = await response.text();
      console.log('Onboarding test response:', response.status, result);
      alert(`Response: ${response.status}\n${result.substring(0, 200)}...`);
    } catch (error) {
      console.error('Onboarding test error:', error);
      alert(`Error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Debug</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Token Status</h2>
          {authState ? (
            <div className="space-y-2 font-mono text-sm">
              <div>Has Access Token: <span className={authState.hasAccessToken ? 'text-green-600' : 'text-red-600'}>{authState.hasAccessToken ? 'Yes' : 'No'}</span></div>
              <div>Has Refresh Token: <span className={authState.hasRefreshToken ? 'text-green-600' : 'text-red-600'}>{authState.hasRefreshToken ? 'Yes' : 'No'}</span></div>
              <div>Access Token Length: {authState.accessTokenLength}</div>
              <div>Refresh Token Length: {authState.refreshTokenLength}</div>
              {authState.decodedToken && (
                <>
                  <div>Token Expired: <span className={authState.isExpired ? 'text-red-600' : 'text-green-600'}>{authState.isExpired ? 'Yes' : 'No'}</span></div>
                  <div>Expires At: {authState.expiresAt}</div>
                  <div>User ID: {authState.decodedToken.sub}</div>
                  <div>Email: {authState.decodedToken.email}</div>
                  <div>Tenant ID: {authState.decodedToken.app_metadata?.tenant_id || 'None'}</div>
                </>
              )}
            </div>
          ) : (
            <div>Loading...</div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Server-Side Validation</h2>
          {serverDebug ? (
            <div className="space-y-2 font-mono text-sm">
              <div>Server Received Token: <span className={serverDebug.hasAuthHeader ? 'text-green-600' : 'text-red-600'}>{serverDebug.hasAuthHeader ? 'Yes' : 'No'}</span></div>
              {serverDebug.hasAuthHeader && (
                <>
                  <div>Token Length: {serverDebug.authHeaderLength}</div>
                  <div>Token Prefix: {serverDebug.authHeaderPrefix}</div>
                </>
              )}
              {serverDebug.supabaseUser && (
                <>
                  <div>Valid User: <span className="text-green-600">Yes</span></div>
                  <div>User ID: {serverDebug.supabaseUser.id}</div>
                  <div>Email: {serverDebug.supabaseUser.email}</div>
                </>
              )}
              {serverDebug.supabaseError && (
                <div>Supabase Error: <span className="text-red-600">{serverDebug.supabaseError}</span></div>
              )}
              {serverDebug.error && (
                <div>Server Error: <span className="text-red-600">{serverDebug.error}</span></div>
              )}
            </div>
          ) : authState?.hasAccessToken ? (
            <div>Loading server validation...</div>
          ) : (
            <div>No access token to validate</div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            <button 
              onClick={testOnboardingCall}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Test Onboarding Call
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem('sb-access-token');
                localStorage.removeItem('sb-refresh-token');
                window.location.reload();
              }}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Clear Tokens
            </button>
            <a 
              href="/onboarding"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 inline-block"
            >
              Go to Onboarding
            </a>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Raw Token Data</h2>
          {authState?.decodedToken && (
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
              {JSON.stringify(authState.decodedToken, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}