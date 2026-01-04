/**
 * JWT Validation Middleware for Cloudflare Workers
 * Requirements: 13.3, 13.4 - Validate JWT at edge before database access
 */

import type { Env } from "./supabase.server";

export interface JWTPayload {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  email?: string;
  role?: string;
  app_metadata?: {
    tenant_id?: string;
    [key: string]: unknown;
  };
  user_metadata?: Record<string, unknown>;
}

export interface JWTValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

/**
 * Base64URL decode (handles URL-safe base64)
 */
function base64UrlDecode(str: string): Uint8Array {
  // Convert base64url to base64
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if needed
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  // Decode
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Import the JWT secret as a CryptoKey for HMAC verification
 */
async function importJWTSecret(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

/**
 * Verify JWT signature using Web Crypto API (available in Workers)
 */
async function verifyJWTSignature(
  token: string,
  secret: string
): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [header, payload, signature] = parts;
  const signatureInput = `${header}.${payload}`;
  
  try {
    const key = await importJWTSecret(secret);
    const signatureBytes = base64UrlDecode(signature);
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureInput);

    return crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes.buffer as ArrayBuffer,
      data
    );
  } catch {
    return false;
  }
}

/**
 * Decode JWT payload without verification
 */
function decodeJWTPayload(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payloadBytes = base64UrlDecode(parts[1]);
    const decoder = new TextDecoder();
    const payloadJson = decoder.decode(payloadBytes);
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

/**
 * Validate JWT expiration
 */
function isJWTExpired(payload: JWTPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

/**
 * Validate JWT issuer matches Supabase project
 */
function isValidIssuer(payload: JWTPayload, supabaseUrl: string): boolean {
  // Supabase JWT issuer format: https://<project-ref>.supabase.co/auth/v1
  const expectedIssuer = `${supabaseUrl}/auth/v1`;
  return payload.iss === expectedIssuer;
}

/**
 * Full JWT validation with signature verification
 * Uses Supabase JWT secret for HMAC-SHA256 verification
 */
export async function validateJWT(
  token: string,
  jwtSecret: string,
  supabaseUrl: string
): Promise<JWTValidationResult> {
  // Decode payload first (for error messages)
  const payload = decodeJWTPayload(token);
  if (!payload) {
    return { valid: false, error: "Invalid JWT format" };
  }

  // Check expiration
  if (isJWTExpired(payload)) {
    return { valid: false, error: "JWT expired" };
  }

  // Check issuer
  if (!isValidIssuer(payload, supabaseUrl)) {
    return { valid: false, error: "Invalid JWT issuer" };
  }

  // Verify signature
  const signatureValid = await verifyJWTSignature(token, jwtSecret);
  if (!signatureValid) {
    return { valid: false, error: "Invalid JWT signature" };
  }

  return { valid: true, payload };
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * JWT validation middleware for Cloudflare Workers
 * Returns 401 response if JWT is invalid, otherwise returns validated payload
 */
export async function jwtMiddleware(
  request: Request,
  env: Env & { SUPABASE_JWT_SECRET?: string }
): Promise<{ response?: Response; payload?: JWTPayload }> {
  const authHeader = request.headers.get("Authorization");
  const token = extractBearerToken(authHeader);

  // No token provided - allow anonymous access for public routes
  if (!token) {
    return {};
  }

  // JWT secret required for validation
  const jwtSecret = env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) {
    console.error("SUPABASE_JWT_SECRET not configured");
    return {
      response: new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      ),
    };
  }

  // Validate the JWT
  const result = await validateJWT(token, jwtSecret, env.SUPABASE_URL);

  if (!result.valid) {
    return {
      response: new Response(
        JSON.stringify({ error: result.error || "Invalid token" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      ),
    };
  }

  return { payload: result.payload };
}

/**
 * Check if request requires authentication
 * Public routes don't require JWT validation
 */
export function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/auth/callback",
    "/health",
    "/api/health",
  ];

  // Check exact matches
  if (publicRoutes.includes(pathname)) {
    return true;
  }

  // Check public prefixes (e.g., static assets)
  const publicPrefixes = ["/assets/", "/public/", "/_static/"];
  return publicPrefixes.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Create a protected route handler that validates JWT
 */
export function withAuth<T extends Env & { SUPABASE_JWT_SECRET?: string }>(
  handler: (
    request: Request,
    env: T,
    payload: JWTPayload
  ) => Promise<Response>
): (request: Request, env: T) => Promise<Response> {
  return async (request: Request, env: T): Promise<Response> => {
    const { response, payload } = await jwtMiddleware(request, env);

    if (response) {
      return response;
    }

    if (!payload) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return handler(request, env, payload);
  };
}

/**
 * Extract tenant_id from validated JWT payload
 */
export function getTenantIdFromPayload(payload: JWTPayload): string | null {
  return payload.app_metadata?.tenant_id ?? null;
}
