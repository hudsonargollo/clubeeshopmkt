/**
 * Edge Caching Utilities for Cloudflare Workers
 * Requirements: 6.4, 6.5 - Edge caching for product catalog with invalidation
 * 
 * Uses Cloudflare Cache API for caching GET requests at the edge
 */

import type { Env } from './supabase.server';

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Cache TTL in seconds (default: 60) */
  ttl?: number;
  /** Cache tags for invalidation */
  tags?: string[];
  /** Whether to use stale-while-revalidate */
  staleWhileRevalidate?: number;
}

/**
 * Default cache configuration
 */
const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
  ttl: 60, // 1 minute default
  tags: [],
  staleWhileRevalidate: 30, // 30 seconds SWR
};

/**
 * Generate a cache key for a request
 * Includes tenant ID to ensure tenant isolation
 */
export function generateCacheKey(
  request: Request,
  tenantId: string,
  prefix = 'catalog'
): string {
  const url = new URL(request.url);
  // Include tenant ID in cache key for isolation
  return `${prefix}:${tenantId}:${url.pathname}${url.search}`;
}

/**
 * Get cached response from Cloudflare Cache API
 */
export async function getCachedResponse(
  cacheKey: string,
  request: Request
): Promise<Response | null> {
  try {
    const cache = caches.default;
    const cacheUrl = new URL(request.url);
    cacheUrl.pathname = `/__cache/${cacheKey}`;
    
    const cachedResponse = await cache.match(new Request(cacheUrl.toString()));
    
    if (cachedResponse) {
      // Add cache hit header for debugging
      const response = new Response(cachedResponse.body, cachedResponse);
      response.headers.set('X-Cache', 'HIT');
      return response;
    }
    
    return null;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

/**
 * Store response in Cloudflare Cache API
 */
export async function setCachedResponse(
  cacheKey: string,
  request: Request,
  response: Response,
  config: CacheConfig = {}
): Promise<void> {
  const { ttl, staleWhileRevalidate, tags } = { ...DEFAULT_CACHE_CONFIG, ...config };
  
  try {
    const cache = caches.default;
    const cacheUrl = new URL(request.url);
    cacheUrl.pathname = `/__cache/${cacheKey}`;
    
    // Clone response and add cache headers
    const responseToCache = new Response(response.body, response);
    
    // Set cache control headers
    const cacheControl = [
      `public`,
      `max-age=${ttl}`,
      staleWhileRevalidate ? `stale-while-revalidate=${staleWhileRevalidate}` : '',
    ].filter(Boolean).join(', ');
    
    responseToCache.headers.set('Cache-Control', cacheControl);
    responseToCache.headers.set('X-Cache', 'MISS');
    responseToCache.headers.set('X-Cache-Key', cacheKey);
    
    // Add cache tags for invalidation
    if (tags.length > 0) {
      responseToCache.headers.set('X-Cache-Tags', tags.join(','));
    }
    
    await cache.put(
      new Request(cacheUrl.toString()),
      responseToCache
    );
  } catch (error) {
    console.error('Cache write error:', error);
  }
}


/**
 * Invalidate cached responses by key pattern
 * Used when inventory is updated
 */
export async function invalidateCache(
  cacheKeyPattern: string,
  request: Request
): Promise<boolean> {
  try {
    const cache = caches.default;
    const cacheUrl = new URL(request.url);
    cacheUrl.pathname = `/__cache/${cacheKeyPattern}`;
    
    const deleted = await cache.delete(new Request(cacheUrl.toString()));
    return deleted;
  } catch (error) {
    console.error('Cache invalidation error:', error);
    return false;
  }
}

/**
 * Invalidate all catalog cache for a tenant
 */
export async function invalidateTenantCatalog(
  tenantId: string,
  request: Request
): Promise<void> {
  // Invalidate main catalog endpoint
  await invalidateCache(`catalog:${tenantId}:/api/catalog`, request);
  
  // Note: For more comprehensive invalidation, you would need to track
  // all cached keys per tenant or use Cloudflare's Cache Tags feature
  // with Enterprise plan
}

/**
 * Wrapper for cached loader functions
 * Automatically handles cache lookup and storage
 */
export async function withCache<T>(
  request: Request,
  tenantId: string,
  loader: () => Promise<Response>,
  config: CacheConfig = {}
): Promise<Response> {
  // Only cache GET requests
  if (request.method !== 'GET') {
    return loader();
  }
  
  const cacheKey = generateCacheKey(request, tenantId);
  
  // Try to get cached response
  const cachedResponse = await getCachedResponse(cacheKey, request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Execute loader and cache result
  const response = await loader();
  
  // Only cache successful responses
  if (response.ok) {
    // Clone response before caching (response body can only be read once)
    const responseToCache = response.clone();
    await setCachedResponse(cacheKey, request, responseToCache, config);
  }
  
  // Add cache miss header
  const finalResponse = new Response(response.body, response);
  finalResponse.headers.set('X-Cache', 'MISS');
  
  return finalResponse;
}

/**
 * Create cache headers for responses
 */
export function createCacheHeaders(config: CacheConfig = {}): Headers {
  const { ttl, staleWhileRevalidate } = { ...DEFAULT_CACHE_CONFIG, ...config };
  
  const headers = new Headers();
  
  const cacheControl = [
    'public',
    `max-age=${ttl}`,
    staleWhileRevalidate ? `stale-while-revalidate=${staleWhileRevalidate}` : '',
  ].filter(Boolean).join(', ');
  
  headers.set('Cache-Control', cacheControl);
  headers.set('Vary', 'Authorization'); // Vary by auth for tenant isolation
  
  return headers;
}

/**
 * Helper to add cache headers to a JSON response
 */
export function jsonWithCache<T>(
  data: T,
  config: CacheConfig = {},
  init?: ResponseInit
): Response {
  const headers = createCacheHeaders(config);
  
  // Merge with existing headers
  if (init?.headers) {
    const existingHeaders = new Headers(init.headers);
    existingHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }
  
  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}
