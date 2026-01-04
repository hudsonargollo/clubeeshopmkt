/**
 * Authentication Login API Route
 * Requirements: 13.5 - Rate limiting for login attempts
 * 
 * Handles user authentication with IP-based rate limiting
 */

import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createSupabaseClient, type Env } from "~/lib/supabase.server";
import { applyRateLimit, RATE_LIMIT_CONFIGS, addRateLimitHeaders } from "~/lib/rateLimit.server";

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
  };
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  error?: string;
}

/**
 * POST /api/auth/login
 * Authenticate user with email/password
 * Rate limited: 5 attempts per minute per IP
 */
export async function action({ request, context }: ActionFunctionArgs) {
  // Only allow POST
  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  const env = context.cloudflare.env as Env;

  // Apply rate limiting (5 attempts per minute per IP)
  const rateLimitResult = applyRateLimit(request, RATE_LIMIT_CONFIGS.login);
  
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  // Parse request body
  let body: LoginRequest;
  try {
    body = await request.json();
  } catch {
    return json<LoginResponse>({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password } = body;

  // Validate input
  if (!email || !password) {
    return json<LoginResponse>({ 
      success: false, 
      error: "Email and password are required" 
    }, { status: 400 });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return json<LoginResponse>({ 
      success: false, 
      error: "Invalid email format" 
    }, { status: 400 });
  }

  const supabase = createSupabaseClient(env);

  // Attempt authentication
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Don't reveal whether email exists or password is wrong
    const response = json<LoginResponse>({ 
      success: false, 
      error: "Invalid credentials" 
    }, { status: 401 });

    return addRateLimitHeaders(
      response,
      RATE_LIMIT_CONFIGS.login,
      rateLimitResult.remaining,
      rateLimitResult.resetAt
    );
  }

  if (!data.user || !data.session) {
    return json<LoginResponse>({ 
      success: false, 
      error: "Authentication failed" 
    }, { status: 401 });
  }

  // Return success with user and session info
  const response = json<LoginResponse>({
    success: true,
    user: {
      id: data.user.id,
      email: data.user.email || email,
    },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at || 0,
    },
  });

  return addRateLimitHeaders(
    response,
    RATE_LIMIT_CONFIGS.login,
    rateLimitResult.remaining,
    rateLimitResult.resetAt
  );
}
