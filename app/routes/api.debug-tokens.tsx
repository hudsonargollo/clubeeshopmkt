/**
 * Server-side token debug endpoint
 */

import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { createSupabaseClient, type Env } from '~/lib/supabase.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare?.env as Env | undefined;
  
  if (!env?.SUPABASE_URL || !env?.SUPABASE_ANON_KEY) {
    return json({ 
      error: 'Missing Supabase environment variables',
      hasSupabaseUrl: !!env?.SUPABASE_URL,
      hasAnonKey: !!env?.SUPABASE_ANON_KEY,
      hasServiceKey: !!env?.SUPABASE_SERVICE_ROLE_KEY,
    });
  }

  const authHeader = request.headers.get('Authorization');
  
  const debugInfo = {
    hasAuthHeader: !!authHeader,
    authHeaderLength: authHeader?.length || 0,
    authHeaderPrefix: authHeader?.substring(0, 20) + '...' || 'None',
    userAgent: request.headers.get('User-Agent'),
    url: request.url,
    method: request.method,
  };

  if (authHeader) {
    try {
      const supabase = createSupabaseClient(env, authHeader);
      const { data: { user }, error } = await supabase.auth.getUser();
      
      debugInfo.supabaseUser = user ? {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      } : null;
      debugInfo.supabaseError = error?.message || null;
    } catch (error) {
      debugInfo.supabaseException = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  return json(debugInfo);
}