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
 * Determines the redirect path based on user's tenant count
 * Requirements: 3.1, 4.1, 4.2
 * - 0 tenants → /onboarding
 * - 1 tenant → /backoffice
 * - >1 tenants → /portal
 */
async function getPostAuthRedirect(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string
): Promise<string> {
  const { data: userTenants, error } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user tenants:', error);
    return '/onboarding';
  }

  const tenantCount = userTenants?.length ?? 0;

  if (tenantCount === 0) {
    return '/onboarding';
  } else if (tenantCount === 1) {
    return '/backoffice';
  } else {
    return '/portal';
  }
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const url = new URL(request.url);
  
  // Check for error from OAuth provider
  const errorParam = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');
  
  if (errorParam) {
    return {
      error: errorDescription || 'Authentication failed. Please try again.',
      redirectTo: '/',
    } satisfies LoaderData;
  }

  // Get the authorization code from the URL
  const code = url.searchParams.get('code');
  
  if (!code) {
    return {
      error: 'No authorization code received. Please try again.',
      redirectTo: '/',
    } satisfies LoaderData;
  }

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
    return {
      error: 'Authentication failed. Please try again.',
      redirectTo: '/',
    } satisfies LoaderData;
  }

  // Determine redirect based on tenant count
  const redirectTo = await getPostAuthRedirect(supabase, data.user.id);

  return {
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
    redirectTo,
  } satisfies LoaderData;
}

export default function AuthCallback() {
  const data = useLoaderData<LoaderData>();
  const navigate = useNavigate();

  useEffect(() => {
    if (data.session) {
      // Store tokens in localStorage
      localStorage.setItem('sb-access-token', data.session.access_token);
      localStorage.setItem('sb-refresh-token', data.session.refresh_token);
      
      // Navigate to the appropriate page
      window.location.href = data.redirectTo;
    } else if (data.error) {
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
