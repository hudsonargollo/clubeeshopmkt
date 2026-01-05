/**
 * API Route: Check Subdomain Availability
 * Requirements: 3.4, 11.2 - Real-time subdomain uniqueness validation within 500ms
 */

import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { createSupabaseClient, type Env } from '~/lib/supabase.server';

interface CheckSubdomainResponse {
  available: boolean;
  subdomain: string;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const url = new URL(request.url);
  const subdomain = url.searchParams.get('subdomain')?.toLowerCase().trim();

  if (!subdomain) {
    return json<CheckSubdomainResponse>({ available: false, subdomain: '' }, { status: 400 });
  }

  // Validate subdomain format
  if (subdomain.length < 3 || subdomain.length > 30) {
    return json<CheckSubdomainResponse>({ available: false, subdomain });
  }

  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return json<CheckSubdomainResponse>({ available: false, subdomain });
  }

  if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    return json<CheckSubdomainResponse>({ available: false, subdomain });
  }

  // Reserved subdomains that cannot be used
  const reservedSubdomains = [
    'www', 'api', 'app', 'admin', 'dashboard', 'portal',
    'auth', 'login', 'signup', 'register', 'account',
    'help', 'support', 'docs', 'blog', 'status',
    'mail', 'email', 'ftp', 'cdn', 'static',
    'test', 'demo', 'staging', 'dev', 'development',
  ];

  if (reservedSubdomains.includes(subdomain)) {
    return json<CheckSubdomainResponse>({ available: false, subdomain });
  }

  const supabase = createSupabaseClient(env);

  // Check if subdomain exists
  const { data: existingTenant, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .maybeSingle();

  if (error) {
    console.error('Subdomain check error:', error);
    // Return available: false on error to be safe
    return json<CheckSubdomainResponse>({ available: false, subdomain });
  }

  return json<CheckSubdomainResponse>({
    available: !existingTenant,
    subdomain,
  });
}
