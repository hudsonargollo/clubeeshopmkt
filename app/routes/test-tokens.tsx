/**
 * Test Tokens Page
 * Simple page to test token storage and onboarding flow
 */

import { useState, useEffect } from 'react';
import type { MetaFunction } from '@remix-run/cloudflare';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';

export const meta: MetaFunction = () => {
  return [{ title: 'Test Tokens - ClubeeShopMkt' }];
};

export default function TestTokensPage() {
  const [tokens, setTokens] = useState<{accessToken: string | null, refreshToken: string | null}>({
    accessToken: null,
    refreshToken: null
  });
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    setTokens({
      accessToken: localStorage.getItem('sb-access-token'),
      refreshToken: localStorage.getItem('sb-refresh-token')
    });
  }, []);

  const simulateValidTokens = () => {
    // Create a mock JWT token for testing (this won't work with real Supabase but helps test the flow)
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzM5MDY0MDAwLCJpYXQiOjE3MzkwNjA0MDAsImlzcyI6Imh0dHBzOi8vemFsZXJpc3Vzb2JqY2thb2RrZmIuc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6IjEyMzQ1Njc4LTEyMzQtMTIzNC0xMjM0LTEyMzQ1Njc4OTAxMiIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6e30sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib2F1dGgiLCJ0aW1lc3RhbXAiOjE3MzkwNjA0MDB9XSwic2Vzc2lvbl9pZCI6IjEyMzQ1Njc4LTEyMzQtMTIzNC0xMjM0LTEyMzQ1Njc4OTAxMiJ9.test-signature';
    
    localStorage.setItem('sb-access-token', mockToken);
    localStorage.setItem('sb-refresh-token', 'mock-refresh-token');
    
    setTokens({
      accessToken: mockToken,
      refreshToken: 'mock-refresh-token'
    });
    
    setTestResult('Mock tokens stored successfully!');
  };

  const clearTokens = () => {
    localStorage.removeItem('sb-access-token');
    localStorage.removeItem('sb-refresh-token');
    setTokens({ accessToken: null, refreshToken: null });
    setTestResult('Tokens cleared!');
  };

  const testOnboardingCall = async () => {
    const accessToken = localStorage.getItem('sb-access-token');
    
    if (!accessToken) {
      setTestResult('No access token found!');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('shopName', 'Test Shop');
      formData.append('subdomain', 'testshop' + Date.now());

      const response = await fetch('/onboarding', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      });

      const result = await response.text();
      setTestResult(`Onboarding response (${response.status}): ${result.substring(0, 200)}...`);
    } catch (error) {
      setTestResult(`Error: ${error}`);
    }
  };

  const testServerDebug = async () => {
    const accessToken = localStorage.getItem('sb-access-token');
    
    if (!accessToken) {
      setTestResult('No access token found!');
      return;
    }

    try {
      const response = await fetch('/api/debug-tokens', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const data = await response.json();
      setTestResult(`Server debug: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setTestResult(`Error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Authentication Tokens</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Token Status</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>Access Token: {tokens.accessToken ? `${tokens.accessToken.substring(0, 50)}...` : 'None'}</div>
            <div>Refresh Token: {tokens.refreshToken ? `${tokens.refreshToken.substring(0, 30)}...` : 'None'}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-x-4 space-y-2">
            <Button onClick={simulateValidTokens}>
              Simulate Valid Tokens
            </Button>
            <Button onClick={clearTokens} variant="destructive">
              Clear Tokens
            </Button>
            <Button onClick={testOnboardingCall}>
              Test Onboarding Call
            </Button>
            <Button onClick={testServerDebug}>
              Test Server Debug
            </Button>
            <Button onClick={() => window.location.href = '/onboarding'}>
              Go to Onboarding
            </Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto whitespace-pre-wrap">
            {testResult || 'No tests run yet'}
          </pre>
        </div>
      </div>
    </div>
  );
}