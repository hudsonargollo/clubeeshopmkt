/**
 * Debug Onboarding Route
 * Tests onboarding authentication without form submission
 */

import { useState, useEffect } from 'react';
import type { MetaFunction } from '@remix-run/cloudflare';
import { Button } from '~/components/ui/button';

export const meta: MetaFunction = () => {
  return [{ title: 'Debug Onboarding - ClubeeShopMkt' }];
};

export default function DebugOnboardingPage() {
  const [result, setResult] = useState<string>('');
  const [tokens, setTokens] = useState<{accessToken: string | null, refreshToken: string | null}>({
    accessToken: null,
    refreshToken: null
  });

  useEffect(() => {
    setTokens({
      accessToken: localStorage.getItem('sb-access-token'),
      refreshToken: localStorage.getItem('sb-refresh-token')
    });
  }, []);

  const testTokenValidation = async () => {
    const accessToken = localStorage.getItem('sb-access-token');
    
    if (!accessToken) {
      setResult('No access token found in localStorage');
      return;
    }

    try {
      // Test the debug-tokens endpoint first
      const debugResponse = await fetch('/api/debug-tokens', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const debugData = await debugResponse.json();
      setResult(`Debug endpoint response (${debugResponse.status}):\n${JSON.stringify(debugData, null, 2)}`);
    } catch (error) {
      setResult(`Error testing token: ${error}`);
    }
  };

  const testOnboardingAuth = async () => {
    const accessToken = localStorage.getItem('sb-access-token');
    
    if (!accessToken) {
      setResult('No access token found in localStorage');
      return;
    }

    try {
      // Test onboarding endpoint with minimal data
      const formData = new FormData();
      formData.append('shopName', 'Debug Test Shop');
      formData.append('subdomain', 'debugtest' + Date.now());

      const response = await fetch('/onboarding', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      });

      const responseText = await response.text();
      
      try {
        const jsonData = JSON.parse(responseText);
        setResult(`Onboarding response (${response.status}):\n${JSON.stringify(jsonData, null, 2)}`);
      } catch (e) {
        setResult(`Onboarding response (${response.status}):\n${responseText.substring(0, 500)}`);
      }
    } catch (error) {
      setResult(`Error testing onboarding: ${error}`);
    }
  };

  const decodeToken = () => {
    const accessToken = localStorage.getItem('sb-access-token');
    
    if (!accessToken) {
      setResult('No access token found');
      return;
    }

    try {
      const parts = accessToken.split('.');
      if (parts.length !== 3) {
        setResult('Invalid JWT format - should have 3 parts separated by dots');
        return;
      }

      const payload = JSON.parse(atob(parts[1]));
      const header = JSON.parse(atob(parts[0]));
      
      setResult(`Token Analysis:
Header: ${JSON.stringify(header, null, 2)}

Payload: ${JSON.stringify(payload, null, 2)}

Token Length: ${accessToken.length}
Expires: ${new Date(payload.exp * 1000).toISOString()}
Is Expired: ${Date.now() / 1000 > payload.exp}
User ID: ${payload.sub}
Email: ${payload.email}
Issuer: ${payload.iss}`);
    } catch (error) {
      setResult(`Error decoding token: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Onboarding Authentication</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Token Status</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>Access Token: {tokens.accessToken ? `${tokens.accessToken.substring(0, 50)}...` : 'None'}</div>
            <div>Refresh Token: {tokens.refreshToken ? `${tokens.refreshToken.substring(0, 30)}...` : 'None'}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Debug Actions</h2>
          <div className="space-x-4 space-y-2">
            <Button onClick={decodeToken}>
              Decode Token
            </Button>
            <Button onClick={testTokenValidation}>
              Test Token Validation
            </Button>
            <Button onClick={testOnboardingAuth}>
              Test Onboarding Auth
            </Button>
            <Button onClick={() => window.location.href = '/onboarding'}>
              Go to Onboarding
            </Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Results</h2>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto whitespace-pre-wrap">
            {result || 'No tests run yet'}
          </pre>
        </div>
      </div>
    </div>
  );
}