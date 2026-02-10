/**
 * Simple test page to verify OAuth tokens
 */

import { useEffect, useState } from 'react';
import type { MetaFunction } from '@remix-run/cloudflare';

export const meta: MetaFunction = () => {
  return [{ title: 'Auth Test - ClubeeShopMkt' }];
};

export default function TestAuth() {
  const [tokenInfo, setTokenInfo] = useState<{
    hasToken: boolean;
    token?: string;
    error?: string;
  }>({ hasToken: false });

  useEffect(() => {
    try {
      const accessToken = localStorage.getItem('sb-access-token');
      const refreshToken = localStorage.getItem('sb-refresh-token');
      
      setTokenInfo({
        hasToken: !!accessToken,
        token: accessToken ? `${accessToken.substring(0, 20)}...` : undefined,
      });
    } catch (error) {
      setTokenInfo({
        hasToken: false,
        error: 'Error accessing localStorage',
      });
    }
  }, []);

  const clearTokens = () => {
    localStorage.removeItem('sb-access-token');
    localStorage.removeItem('sb-refresh-token');
    setTokenInfo({ hasToken: false });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Auth Test</h1>
        
        <div className="space-y-4">
          <div>
            <strong>Token Status:</strong>{' '}
            <span className={tokenInfo.hasToken ? 'text-green-600' : 'text-red-600'}>
              {tokenInfo.hasToken ? 'Found' : 'Not Found'}
            </span>
          </div>
          
          {tokenInfo.token && (
            <div>
              <strong>Token Preview:</strong>
              <div className="bg-gray-100 p-2 rounded text-sm font-mono">
                {tokenInfo.token}
              </div>
            </div>
          )}
          
          {tokenInfo.error && (
            <div className="text-red-600">
              <strong>Error:</strong> {tokenInfo.error}
            </div>
          )}
          
          <div className="space-y-2">
            <a
              href="/signup"
              className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded hover:bg-blue-700"
            >
              Go to Signup
            </a>
            
            <a
              href="/onboarding"
              className="block w-full bg-green-600 text-white text-center py-2 px-4 rounded hover:bg-green-700"
            >
              Go to Onboarding
            </a>
            
            <button
              onClick={clearTokens}
              className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
            >
              Clear Tokens
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}