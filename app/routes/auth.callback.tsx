/**
 * OAuth Callback Route
 * Handles Google OAuth code exchange and post-authentication routing
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 4.1, 4.2
 */

import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { redirect } from '@remix-run/cloudflare';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { useEffect } from 'react';
import { createSupabaseClient, type Env } from '~/lib/supabase.server';
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

/**
 * Determines the redirect path based on user's tenant count and role
 * Requirements: 3.1, 4.1, 4.2
 * - Superadmin → /portal (can manage multiple tenants)
 * - 0 tenants → /onboarding (new user needs to create tenant)
 * - 1 tenant → /backoffice (regular user with their own tenant)
 */
async function getPostAuthRedirect(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  userEmail: string
): Promise<string> {
  try {
    console.log('Getting post-auth redirect for user:', userId, userEmail);
    
    // Check if user is superadmin (you can define this by email or role)
    const isSuperAdmin = userEmail === 'cavernacentral2@gmail.com';
    
    if (isSuperAdmin) {
      console.log('User is superadmin, redirecting to portal');
      return '/portal';
    }

    // For regular users, check their tenant assignments
    const { data: userTenants, error } = await supabase
      .from('user_tenants')
      .select('tenant_id, role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user tenants:', error);
      // If there's an error, send new users to onboarding
      console.log('Database error, defaulting to onboarding');
      return '/onboarding';
    }

    const tenantCount = userTenants?.length ?? 0;
    console.log('User has', tenantCount, 'tenant assignments:', userTenants);

    if (tenantCount === 0) {
      // New user needs to create their tenant
      console.log('No tenants found, redirecting to onboarding');
      return '/onboarding';
    } else {
      // Regular user with their tenant goes to backoffice
      console.log('User has tenants, redirecting to backoffice');
      return '/backoffice';
    }
  } catch (error) {
    console.error('Unexpected error in getPostAuthRedirect:', error);
    return '/onboarding';
  }
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    const env = context.cloudflare.env as Env;
    const url = new URL(request.url);
    
    console.log('Auth callback - URL:', url.toString());
    
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

    // Get the authorization code from the URL
    const code = url.searchParams.get('code');
    
    if (!code) {
      console.error('No authorization code in callback URL');
      return {
        error: 'No authorization code received. Please try again.',
        redirectTo: '/',
      } satisfies LoaderData;
    }

    console.log('Auth callback - Got code, exchanging for session');
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
  const navigate = useNavigate();

  useEffect(() => {
    if (data.session) {
      console.log('Auth callback - storing tokens and redirecting to:', data.redirectTo);
      
      // Store tokens in localStorage
      localStorage.setItem('sb-access-token', data.session.access_token);
      localStorage.setItem('sb-refresh-token', data.session.refresh_token);
      
      // Use navigate instead of window.location.href for better SPA behavior
      // Small delay to ensure localStorage is written
      setTimeout(() => {
        console.log('Auth callback - executing redirect to:', data.redirectTo);
        navigate(data.redirectTo, { replace: true });
      }, 100);
    } else if (data.error) {
      console.log('Auth callback - error occurred:', data.error);
      // Redirect to landing page after showing error briefly
      const timer = setTimeout(() => {
        navigate(data.redirectTo);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [data, navigate]);

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
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Completing Sign In</h1>
        <p className="text-muted-foreground">
          Please wait while we set up your session...
        </p>
      </div>
    </div>
  );
}
