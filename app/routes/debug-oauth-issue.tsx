/**
 * Debug OAuth Issue Route
 * Comprehensive debugging for OAuth authentication flow
 */

import type { MetaFunction } from '@remix-run/cloudflare';

export const meta: MetaFunction = () => {
  return [{ title: 'Debug OAuth Issue - ClubeeShopMkt' }];
};

export default function DebugOAuthIssuePage() {
  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '20px',
      background: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1>🔍 Debug OAuth Issue</h1>
        <p>This page will help us identify exactly what's happening with the OAuth tokens.</p>
        
        <div className="debug-section" style={{
          margin: '20px 0',
          padding: '15px',
          border: '1px solid #ddd',
          borderRadius: '5px',
          background: '#fafafa'
        }}>
          <h3>Step 1: Check Current State</h3>
          <button onClick={() => (window as any).checkCurrentState()} style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            margin: '5px'
          }}>
            Check Current State
          </button>
          <div id="current-state" style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            padding: '10px',
            borderRadius: '3px',
            margin: '10px 0',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            maxHeight: '400px',
            overflowY: 'auto',
            fontSize: '12px'
          }}></div>
        </div>

        <div className="debug-section" style={{
          margin: '20px 0',
          padding: '15px',
          border: '1px solid #ddd',
          borderRadius: '5px',
          background: '#fafafa'
        }}>
          <h3>Step 2: Test Token Validation</h3>
          <button onClick={() => (window as any).testTokenValidation()} style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            margin: '5px'
          }}>
            Test Server Token Validation
          </button>
          <div id="token-validation" style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            padding: '10px',
            borderRadius: '3px',
            margin: '10px 0',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            maxHeight: '400px',
            overflowY: 'auto',
            fontSize: '12px'
          }}></div>
        </div>

        <div className="debug-section" style={{
          margin: '20px 0',
          padding: '15px',
          border: '1px solid #ddd',
          borderRadius: '5px',
          background: '#fafafa'
        }}>
          <h3>Step 3: Simulate OAuth Callback</h3>
          <p>This will simulate what should happen after OAuth callback:</p>
          <button onClick={() => (window as any).simulateOAuthCallback()} style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            margin: '5px'
          }}>
            Simulate OAuth Callback
          </button>
          <div id="oauth-simulation" style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            padding: '10px',
            borderRadius: '3px',
            margin: '10px 0',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            maxHeight: '400px',
            overflowY: 'auto',
            fontSize: '12px'
          }}></div>
        </div>

        <div className="debug-section" style={{
          margin: '20px 0',
          padding: '15px',
          border: '1px solid #ddd',
          borderRadius: '5px',
          background: '#fafafa'
        }}>
          <h3>Step 4: Test Onboarding Direct</h3>
          <button onClick={() => (window as any).testOnboardingDirect()} style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            margin: '5px'
          }}>
            Test Onboarding Form
          </button>
          <div id="onboarding-test" style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            padding: '10px',
            borderRadius: '3px',
            margin: '10px 0',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            maxHeight: '400px',
            overflowY: 'auto',
            fontSize: '12px'
          }}></div>
        </div>

        <div className="debug-section" style={{
          margin: '20px 0',
          padding: '15px',
          border: '1px solid #ddd',
          borderRadius: '5px',
          background: '#fafafa'
        }}>
          <h3>Step 5: Clear Everything and Start Fresh</h3>
          <button onClick={() => (window as any).clearEverything()} style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            margin: '5px'
          }}>
            Clear All Tokens & Storage
          </button>
          <button onClick={() => (window as any).startFreshOAuth()} style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            margin: '5px'
          }}>
            Start Fresh OAuth
          </button>
          <div id="fresh-start" style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            padding: '10px',
            borderRadius: '3px',
            margin: '10px 0',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            maxHeight: '400px',
            overflowY: 'auto',
            fontSize: '12px'
          }}></div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{
        __html: `
        const BASE_URL = 'https://eshop.clubemkt.digital';
        
        function log(elementId, message, type = 'info') {
            const element = document.getElementById(elementId);
            if (!element) return;
            
            const timestamp = new Date().toLocaleTimeString();
            const logMessage = '[' + timestamp + '] ' + message + '\\n';
            
            element.textContent += logMessage;
            element.className = 'result ' + type;
            element.scrollTop = element.scrollHeight;
            
            console.log('[' + elementId + ']', message);
        }

        window.checkCurrentState = function() {
            log('current-state', '=== CHECKING CURRENT STATE ===', 'info');
            
            // Check localStorage
            const accessToken = localStorage.getItem('sb-access-token');
            const refreshToken = localStorage.getItem('sb-refresh-token');
            
            log('current-state', 'Access Token: ' + (accessToken ? 'EXISTS' : 'MISSING'), accessToken ? 'success' : 'error');
            log('current-state', 'Refresh Token: ' + (refreshToken ? 'EXISTS' : 'MISSING'), refreshToken ? 'success' : 'error');
            
            if (accessToken) {
                log('current-state', 'Access Token Length: ' + accessToken.length, 'info');
                log('current-state', 'Access Token Preview: ' + accessToken.substring(0, 50) + '...', 'info');
                
                // Try to decode
                try {
                    const parts = accessToken.split('.');
                    if (parts.length === 3) {
                        const payload = JSON.parse(atob(parts[1]));
                        log('current-state', 'Token User ID: ' + payload.sub, 'success');
                        log('current-state', 'Token Email: ' + payload.email, 'success');
                        log('current-state', 'Token Issuer: ' + payload.iss, 'info');
                        log('current-state', 'Token Audience: ' + payload.aud, 'info');
                        log('current-state', 'Token Expires: ' + new Date(payload.exp * 1000).toISOString(), 'info');
                        log('current-state', 'Token Expired: ' + (Date.now() / 1000 > payload.exp), payload.exp < Date.now() / 1000 ? 'error' : 'success');
                        log('current-state', 'Token Role: ' + payload.role, 'info');
                    } else {
                        log('current-state', 'Invalid JWT format', 'error');
                    }
                } catch (error) {
                    log('current-state', 'Error decoding token: ' + error.message, 'error');
                }
            }
            
            // Check URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            
            log('current-state', 'URL Search Params: ' + (urlParams.toString() || 'NONE'), 'info');
            log('current-state', 'URL Hash Params: ' + (hashParams.toString() || 'NONE'), 'info');
            
            // Check current page
            log('current-state', 'Current URL: ' + window.location.href, 'info');
            log('current-state', 'User Agent: ' + navigator.userAgent, 'info');
        };

        window.testTokenValidation = async function() {
            log('token-validation', '=== TESTING TOKEN VALIDATION ===', 'info');
            
            const accessToken = localStorage.getItem('sb-access-token');
            
            if (!accessToken) {
                log('token-validation', 'No access token to validate', 'error');
                return;
            }
            
            try {
                log('token-validation', 'Sending token to server for validation...', 'info');
                
                const response = await fetch(BASE_URL + '/api/debug-tokens', {
                    headers: {
                        'Authorization': 'Bearer ' + accessToken,
                        'Content-Type': 'application/json'
                    }
                });
                
                const data = await response.json();
                
                log('token-validation', 'Server Response Status: ' + response.status, response.ok ? 'success' : 'error');
                log('token-validation', 'Server Response:', 'info');
                log('token-validation', JSON.stringify(data, null, 2), response.ok ? 'success' : 'error');
                
                if (data.supabaseUser) {
                    log('token-validation', '✅ TOKEN IS VALID - User authenticated', 'success');
                    log('token-validation', 'User ID: ' + data.supabaseUser.id, 'success');
                    log('token-validation', 'User Email: ' + data.supabaseUser.email, 'success');
                } else if (data.supabaseError) {
                    log('token-validation', '❌ TOKEN IS INVALID: ' + data.supabaseError, 'error');
                } else {
                    log('token-validation', '⚠️ UNEXPECTED RESPONSE FORMAT', 'warning');
                }
            } catch (error) {
                log('token-validation', 'Network error: ' + error.message, 'error');
            }
        };

        window.simulateOAuthCallback = async function() {
            log('oauth-simulation', '=== SIMULATING OAUTH CALLBACK ===', 'info');
            
            // This simulates what should happen after OAuth
            log('oauth-simulation', 'Step 1: Checking if we have tokens from OAuth...', 'info');
            
            const accessToken = localStorage.getItem('sb-access-token');
            if (!accessToken) {
                log('oauth-simulation', 'No tokens found. OAuth callback may not have completed properly.', 'error');
                log('oauth-simulation', 'Try going through OAuth flow again:', 'info');
                log('oauth-simulation', BASE_URL + '/signup -> Click "Continuar com Google"', 'info');
                return;
            }
            
            log('oauth-simulation', 'Step 2: Tokens found, validating...', 'success');
            
            // Test validation
            try {
                const response = await fetch(BASE_URL + '/api/debug-tokens', {
                    headers: { 'Authorization': 'Bearer ' + accessToken }
                });
                const data = await response.json();
                
                if (data.supabaseUser) {
                    log('oauth-simulation', 'Step 3: Token validation SUCCESS ✅', 'success');
                    log('oauth-simulation', 'Step 4: Ready for onboarding form submission', 'success');
                    log('oauth-simulation', 'OAuth simulation complete - tokens should work!', 'success');
                } else {
                    log('oauth-simulation', 'Step 3: Token validation FAILED ❌', 'error');
                    log('oauth-simulation', 'Error: ' + data.supabaseError, 'error');
                }
            } catch (error) {
                log('oauth-simulation', 'Step 3: Validation request failed: ' + error.message, 'error');
            }
        };

        window.testOnboardingDirect = async function() {
            log('onboarding-test', '=== TESTING ONBOARDING FORM DIRECTLY ===', 'info');
            
            const accessToken = localStorage.getItem('sb-access-token');
            
            if (!accessToken) {
                log('onboarding-test', 'No access token for onboarding test', 'error');
                return;
            }
            
            try {
                const formData = new FormData();
                const timestamp = Date.now();
                formData.append('shopName', 'Debug Test Shop ' + timestamp);
                formData.append('subdomain', 'debugtest' + timestamp);
                
                log('onboarding-test', 'Submitting test onboarding form...', 'info');
                log('onboarding-test', 'Shop Name: Debug Test Shop ' + timestamp, 'info');
                log('onboarding-test', 'Subdomain: debugtest' + timestamp, 'info');
                
                const response = await fetch(BASE_URL + '/onboarding', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + accessToken
                    },
                    body: formData
                });
                
                const responseText = await response.text();
                
                log('onboarding-test', 'Response Status: ' + response.status, response.ok ? 'success' : 'error');
                log('onboarding-test', 'Response Headers:', 'info');
                for (const [key, value] of response.headers.entries()) {
                    log('onboarding-test', '  ' + key + ': ' + value, 'info');
                }
                
                try {
                    const jsonData = JSON.parse(responseText);
                    log('onboarding-test', 'Response Body (JSON):', 'info');
                    log('onboarding-test', JSON.stringify(jsonData, null, 2), response.ok ? 'success' : 'error');
                } catch (e) {
                    log('onboarding-test', 'Response Body (Text):', 'info');
                    log('onboarding-test', responseText.substring(0, 1000), response.ok ? 'success' : 'error');
                }
                
                if (response.ok) {
                    log('onboarding-test', '🎉 ONBOARDING SUCCESS!', 'success');
                } else {
                    log('onboarding-test', '❌ ONBOARDING FAILED', 'error');
                    
                    if (response.status === 401) {
                        log('onboarding-test', 'This is the UNAUTHORIZED error we need to fix!', 'error');
                    }
                }
            } catch (error) {
                log('onboarding-test', 'Network error: ' + error.message, 'error');
            }
        };

        window.clearEverything = function() {
            log('fresh-start', '=== CLEARING EVERYTHING ===', 'info');
            
            // Clear localStorage
            localStorage.removeItem('sb-access-token');
            localStorage.removeItem('sb-refresh-token');
            
            // Clear any other auth-related storage
            localStorage.clear();
            sessionStorage.clear();
            
            log('fresh-start', 'All storage cleared', 'success');
            log('fresh-start', 'Ready for fresh OAuth attempt', 'info');
        };

        window.startFreshOAuth = function() {
            log('fresh-start', '=== STARTING FRESH OAUTH ===', 'info');
            log('fresh-start', 'Redirecting to signup page...', 'info');
            
            setTimeout(function() {
                window.location.href = BASE_URL + '/signup';
            }, 1000);
        };

        // Auto-run current state check on page load
        window.addEventListener('load', function() {
            setTimeout(function() {
                if (window.checkCurrentState) {
                    window.checkCurrentState();
                }
            }, 500);
        });
        `
      }} />
    </div>
  );
}