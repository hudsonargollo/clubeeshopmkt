/**
 * OAuth Callback Route
 * Handles Google OAuth code exchange and post-authentication routing
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 4.1, 4.2
 */

import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { useEffect } from 'react';
import { createSupabaseClient, type Env } from '~/lib/supabase.server';
import { getPostAuthRedirect } from '~/lib/auth.server';
import { Loader2, AlertCircle } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Authenticating... - ClubeeShopMkt' },
    { name: 'robots', content: 'noindex' },
  ];
};

interface LoaderData {
  error?: string;
  session?: {
    access_token: string;
    refresh_token: string;
  };
  redirectTo: string;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    const env = context.cloudflare.env as Env;
    const url = new URL(request.url);
    
    console.log('Auth callback - URL:', url.toString());
    console.log('Auth callback - Search params:', Object.fromEntries(url.searchParams.entries()));
    console.log('Auth callback - Hash:', url.hash);
    
    // Check for error from OAuth provider
    const errorParam = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');
    
    if (errorParam) {
      console.error('OAuth provider error:', errorParam, errorDescription);
      return {
        error: errorDescription || 'Authentication failed. Please try again.',
        redirectTo: '/',
      } satisfies LoaderData;
    }

    // Try authorization code flow first (preferred)
    const code = url.searchParams.get('code');
    
    if (code) {
      console.log('Auth callback - Got authorization code, exchanging for session');
      const supabase = createSupabaseClient(env);

      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('OAuth code exchange error:', error);
        return {
          error: 'Failed to complete authentication. Please try again.',
          redirectTo: '/',
        } satisfies LoaderData;
      }

      if (!data.session || !data.user) {
        console.error('No session or user after code exchange');
        return {
          error: 'Authentication failed. Please try again.',
          redirectTo: '/',
        } satisfies LoaderData;
      }

      console.log('Auth callback - Session created for user:', data.user.id, data.user.email);

      // Determine redirect based on user role and tenant count
      const redirectTo = await getPostAuthRedirect(supabase, data.user.id, data.user.email || '');
      
      console.log('Auth callback - Redirecting to:', redirectTo);

      return {
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        },
        redirectTo,
      } satisfies LoaderData;
    }

    // If no authorization code, this might be implicit flow with tokens in URL fragment
    // The tokens will be handled by the client-side component
    console.log('Auth callback - No authorization code found, checking for implicit flow tokens');
    
    // Return success without session - the client will handle token extraction from URL fragment
    return {
      redirectTo: '/auth/callback', // Stay on this page to let client handle tokens
    } satisfies LoaderData;

  } catch (error) {
    console.error('Auth callback - Unexpected error:', error);
    return {
      error: 'An unexpected error occurred during authentication. Please try again.',
      redirectTo: '/',
    } satisfies LoaderData;
  }
}

export default function AuthCallback() {
  const data = useLoaderData<LoaderData>();

  // Handle server-side session or errors
  useEffect(() => {
    console.log('AuthCallback useEffect - data:', data);
    
    if (data.session) {
      console.log('AuthCallback - Server provided session, storing tokens');
      localStorage.setItem('sb-access-token', data.session.access_token);
      localStorage.setItem('sb-refresh-token', data.session.refresh_token);
      console.log('AuthCallback - Tokens stored, redirecting to:', data.redirectTo);
      
      // Small delay to ensure tokens are stored before redirect
      setTimeout(() => {
        window.location.href = data.redirectTo;
      }, 100);
      return;
    }
    
    if (data.error) {
      console.log('AuthCallback - Error from server:', data.error);
      setTimeout(() => {
        window.location.href = data.redirectTo;
      }, 3000);
      return;
    }

    // If no server-side session, check URL hash for tokens (implicit flow)
    console.log('AuthCallback - No server session, checking URL hash');
    const hash = window.location.hash;
    console.log('AuthCallback - URL hash:', hash);
    
    if (hash && hash.includes('access_token=')) {
      console.log('AuthCallback - Found access_token in hash');
      
      try {
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        console.log('AuthCallback - Parsed tokens:', {
          accessToken: accessToken ? 'present' : 'missing',
          refreshToken: refreshToken ? 'present' : 'missing'
        });
        
        if (accessToken) {
          localStorage.setItem('sb-access-token', accessToken);
          if (refreshToken) {
            localStorage.setItem('sb-refresh-token', refreshToken);
          }
          
          console.log('AuthCallback - Tokens stored from hash');
          
          // Clear hash from URL
          window.history.replaceState(null, '', window.location.pathname);
          console.log('AuthCallback - Hash cleared from URL');
          
          // Redirect to onboarding
          console.log('AuthCallback - Redirecting to /onboarding');
          setTimeout(() => {
            window.location.href = '/onboarding';
          }, 100);
        }
      } catch (error) {
        console.error('AuthCallback - Error processing tokens:', error);
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    } else {
      console.log('AuthCallback - No access_token found in hash, redirecting to home in 5 seconds');
      setTimeout(() => {
        window.location.href = '/';
      }, 5000);
    }
  }, [data]);

  if (data.error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Authentication Failed</h1>
          <p className="text-muted-foreground mb-4">{data.error}</p>
          <p className="text-sm text-muted-foreground">
            Redirecting to home page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Inline script to handle tokens immediately, even if React hydration fails */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            console.log('=== Auth Callback Inline Script Started ===');
            console.log('Current URL:', window.location.href);
            console.log('URL hash:', window.location.hash);
            
            // Handle server-provided session data
            const serverData = ${JSON.stringify(data)};
            console.log('Server data:', serverData);
            
            if (serverData.session) {
              console.log('Server provided session, storing tokens');
              localStorage.setItem('sb-access-token', serverData.session.access_token);
              localStorage.setItem('sb-refresh-token', serverData.session.refresh_token);
              console.log('Tokens stored, redirecting to:', serverData.redirectTo);
              setTimeout(() => {
                window.location.href = serverData.redirectTo;
              }, 100);
            } else if (serverData.error) {
              console.log('Server error:', serverData.error);
              setTimeout(() => {
                window.location.href = serverData.redirectTo || '/';
              }, 3000);
            } else {
              // Check for tokens in URL hash (implicit flow)
              const hash = window.location.hash;
              if (hash && hash.includes('access_token=')) {
                console.log('Found access_token in hash');
                
                try {
                  const hashParams = new URLSearchParams(hash.substring(1));
                  const accessToken = hashParams.get('access_token');
                  const refreshToken = hashParams.get('refresh_token');
                  
                  console.log('Parsed tokens:', {
                    accessToken: accessToken ? 'present (' + accessToken.length + ' chars)' : 'missing',
                    refreshToken: refreshToken ? 'present' : 'missing'
                  });
                  
                  if (accessToken) {
                    localStorage.setItem('sb-access-token', accessToken);
                    if (refreshToken) {
                      localStorage.setItem('sb-refresh-token', refreshToken);
                    }
                    
                    console.log('Tokens stored successfully from hash');
                    
                    // Clear hash from URL
                    window.history.replaceState(null, '', window.location.pathname);
                    console.log('Hash cleared from URL');
                    
                    // Redirect to onboarding
                    console.log('Redirecting to /onboarding');
                    setTimeout(() => {
                      window.location.href = '/onboarding';
                    }, 100);
                  } else {
                    console.error('Access token not found in hash params');
                    setTimeout(() => {
                      window.location.href = '/';
                    }, 3000);
                  }
                } catch (error) {
                  console.error('Error processing tokens from hash:', error);
                  setTimeout(() => {
                    window.location.href = '/';
                  }, 3000);
                }
              } else {
                console.log('No access_token found in hash, redirecting to home in 5 seconds');
                setTimeout(() => {
                  window.location.href = '/';
                }, 5000);
              }
            }
          `,
        }}
      />
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Completing Sign In</h1>
        <p className="text-muted-foreground">
          Please wait while we set up your session...
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          Check console for debug info
        </p>
      </div>
    </div>
  );
}
