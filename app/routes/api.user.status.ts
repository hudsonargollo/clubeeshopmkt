/**
 * User Status API Route
 * Debug endpoint to check current user authentication status
 */

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createSupabaseClient, type Env } from "~/lib/supabase.server";

interface UserStatusResponse {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at?: string;
  };
  session?: {
    access_token: string;
    expires_at: number;
  };
  tenants?: Array<{
    id: string;
    name: string;
    subdomain: string;
  }>;
  isSuperadmin: boolean;
  error?: string;
}

/**
 * GET /api/user/status
 * Returns current user authentication status and tenant information
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  
  try {
    const supabase = createSupabaseClient(env);
    
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json<UserStatusResponse>({
        authenticated: false,
        isSuperadmin: false,
        error: 'No authorization header found'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Set the session
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return json<UserStatusResponse>({
        authenticated: false,
        isSuperadmin: false,
        error: userError?.message || 'User not found'
      });
    }

    // Check if user is superadmin
    const isSuperadmin = user.email === 'cavernacentral2@gmail.com';

    // Get user's tenants
    let tenants: Array<{ id: string; name: string; subdomain: string }> = [];
    
    if (!isSuperadmin) {
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name, subdomain')
        .eq('owner_id', user.id);
      
      if (!tenantsError && tenantsData) {
        tenants = tenantsData;
      }
    } else {
      // Superadmin can see all tenants
      const { data: allTenants, error: allTenantsError } = await supabase
        .from('tenants')
        .select('id, name, subdomain')
        .limit(10); // Limit for display purposes
      
      if (!allTenantsError && allTenants) {
        tenants = allTenants;
      }
    }

    return json<UserStatusResponse>({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at || undefined,
      },
      tenants,
      isSuperadmin,
    });

  } catch (error) {
    console.error('User status error:', error);
    return json<UserStatusResponse>({
      authenticated: false,
      isSuperadmin: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}