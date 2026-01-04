/**
 * Rate Limiting Utilities for Cloudflare Workers
 * Requirements: 13.5 - Rate limiting for security
 * 
 * Provides IP-based and tenant-based rate limiting for API endpoints
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Key prefix for namespacing */
  keyPrefix?: string;
}

/**
 * Rate limit entry stored in memory
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limit store
 * Note: In production with multiple Workers, use Cloudflare KV or Durable Objects
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Default configurations for different endpoint types
 */
export const RATE_LIMIT_CONFIGS = {
  /** Login attempts: 5 per minute per IP */
  login: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'login',
  },
  /** Password reset: 3 per hour per IP */
  passwordReset: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'pwd-reset',
  },
  /** API general: 100 per minute per tenant */
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'api',
  },
  /** Search: 5 per second per tenant */
  search: {
    maxRequests: 5,
    windowMs: 1000, // 1 second
    keyPrefix: 'search',
  },
} as const;

/**
 * Extract client IP from request
 * Handles Cloudflare's CF-Connecting-IP header
 */
export function getClientIP(request: Request): string {
  // Cloudflare provides the real client IP
  const cfIP = request.headers.get('CF-Connecting-IP');
  if (cfIP) return cfIP;

  // Fallback to X-Forwarded-For
  const forwardedFor = request.headers.get('X-Forwarded-For');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Last resort: use a hash of other identifying info
  const userAgent = request.headers.get('User-Agent') || 'unknown';
  return `unknown-${hashString(userAgent)}`;
}

/**
 * Simple string hash for fallback IP identification
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Check rate limit for a given key
 * Returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key;
  
  const entry = rateLimitStore.get(fullKey);
  
  // No entry or expired window - create new entry
  if (!entry || now >= entry.resetAt) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(fullKey, newEntry);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }
  
  // Increment count
  entry.count++;
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}


/**
 * Rate limit middleware result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Response to return if rate limited (null if allowed) */
  response: Response | null;
  /** Remaining requests in current window */
  remaining: number;
  /** Timestamp when the rate limit resets */
  resetAt: number;
}

/**
 * Apply rate limiting to a request
 * Returns a response if rate limited, null if allowed
 */
export function applyRateLimit(
  request: Request,
  config: RateLimitConfig,
  keyOverride?: string
): RateLimitResult {
  const key = keyOverride || getClientIP(request);
  const result = checkRateLimit(key, config);
  
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    
    const response = new Response(
      JSON.stringify({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt.toString(),
        },
      }
    );
    
    return {
      allowed: false,
      response,
      remaining: 0,
      resetAt: result.resetAt,
    };
  }
  
  return {
    allowed: true,
    response: null,
    remaining: result.remaining,
    resetAt: result.resetAt,
  };
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: Response,
  config: RateLimitConfig,
  remaining: number,
  resetAt: number
): Response {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
  newResponse.headers.set('X-RateLimit-Remaining', remaining.toString());
  newResponse.headers.set('X-RateLimit-Reset', resetAt.toString());
  return newResponse;
}

/**
 * Cleanup old rate limit entries periodically
 * Call this occasionally to prevent memory leaks
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Rate limit decorator for loader/action functions
 * Usage:
 * ```ts
 * export const action = withRateLimit(
 *   RATE_LIMIT_CONFIGS.login,
 *   async ({ request, context }) => {
 *     // Your handler code
 *   }
 * );
 * ```
 */
export function withRateLimit<T extends (...args: any[]) => Promise<Response>>(
  config: RateLimitConfig,
  handler: T,
  getKey?: (args: Parameters<T>[0]) => string
): T {
  return (async (...args: Parameters<T>) => {
    const { request } = args[0] as { request: Request };
    const key = getKey ? getKey(args[0]) : undefined;
    
    const rateLimitResult = applyRateLimit(request, config, key);
    
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!;
    }
    
    // Periodic cleanup (1% chance per request)
    if (Math.random() < 0.01) {
      cleanupRateLimits();
    }
    
    const response = await handler(...args);
    
    return addRateLimitHeaders(
      response,
      config,
      rateLimitResult.remaining,
      rateLimitResult.resetAt
    );
  }) as T;
}
