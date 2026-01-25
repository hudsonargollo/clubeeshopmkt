/**
 * Debug API Route
 * Simple endpoint to check authentication status without requiring auth
 */

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createSupabaseClient, type Env } from "~/lib/supabase.server";

interface DebugResponse {
  timestamp: string;
  environment: {
    hasSupabaseUrl: boolean;
    hasSupabaseKey: boolean;
    environment: string;
  };
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    cookies: string;
  };
  supabase?: {
    connected: boolean;
    error?: string;
  };
}

/**
 * GET /api/debug
 * Returns debug information about the current request and environment
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  
  // Get all headers
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const response: DebugResponse = {
    timestamp: new Date().toISOString(),
    environment: {
      hasSupabaseUrl: !!env?.SUPABASE_URL,
      hasSupabaseKey: !!env?.SUPABASE_ANON_KEY,
      environment: env?.ENVIRONMENT || 'unknown',
    },
    request: {
      url: request.url,
      method: request.method,
      headers,
      cookies: headers.cookie || 'none',
    },
  };

  // Test Supabase connection
  try {
    if (env?.SUPABASE_URL && env?.SUPABASE_ANON_KEY) {
      const supabase = createSupabaseClient(env);
      
      // Try a simple query to test connection
      const { data, error } = await supabase
        .from('tenants')
        .select('count')
        .limit(1);
      
      response.supabase = {
        connected: !error,
        error: error?.message,
      };
    } else {
      response.supabase = {
        connected: false,
        error: 'Missing Supabase environment variables',
      };
    }
  } catch (error) {
    response.supabase = {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  return json(response, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}