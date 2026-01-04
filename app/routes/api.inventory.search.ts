/**
 * Inventory Search API Route
 * Requirements: 10.1, 10.2 - Full-text search with debounce
 * 
 * Provides FTS queries on inventory (name, category, barcode)
 * Note: 300ms debounce is implemented client-side; this endpoint
 * processes individual search requests efficiently
 */

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createSupabaseClientFromRequest, type Env } from "~/lib/supabase.server";
import { jwtMiddleware, getTenantIdFromPayload } from "~/lib/jwt.server";

interface SearchResult {
  id: string;
  barcode: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  image_url: string | null;
}

interface SearchResponse {
  success: boolean;
  results?: SearchResult[];
  query?: string;
  count?: number;
  error?: string;
}

// Simple in-memory rate limiting for search queries
// Key: tenant_id, Value: { lastQuery: timestamp, count: number }
const searchRateLimit = new Map<string, { lastQuery: number; count: number }>();

const RATE_LIMIT_WINDOW_MS = 1000; // 1 second window
const MAX_QUERIES_PER_WINDOW = 5; // Max 5 queries per second per tenant

/**
 * Check rate limit for search queries
 * Returns true if request should be allowed
 */
function checkRateLimit(tenantId: string): boolean {
  const now = Date.now();
  const limit = searchRateLimit.get(tenantId);

  if (!limit || now - limit.lastQuery > RATE_LIMIT_WINDOW_MS) {
    // New window or first request
    searchRateLimit.set(tenantId, { lastQuery: now, count: 1 });
    return true;
  }

  if (limit.count >= MAX_QUERIES_PER_WINDOW) {
    return false;
  }

  limit.count++;
  return true;
}

/**
 * Clean up old rate limit entries periodically
 */
function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, value] of searchRateLimit.entries()) {
    if (now - value.lastQuery > RATE_LIMIT_WINDOW_MS * 10) {
      searchRateLimit.delete(key);
    }
  }
}

/**
 * GET /api/inventory/search?q=xxx&limit=20
 * Full-text search on inventory
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;

  // Validate JWT
  const { response: authError, payload } = await jwtMiddleware(request, env);
  if (authError) return authError;
  if (!payload) {
    return json<SearchResponse>({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const tenantId = getTenantIdFromPayload(payload);
  if (!tenantId) {
    return json<SearchResponse>({ success: false, error: "Tenant not found in token" }, { status: 403 });
  }

  // Check rate limit
  if (!checkRateLimit(tenantId)) {
    return json<SearchResponse>({ 
      success: false, 
      error: "Too many requests. Please wait before searching again." 
    }, { status: 429 });
  }

  // Periodic cleanup
  if (Math.random() < 0.1) {
    cleanupRateLimits();
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const limitParam = url.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam || "20", 10) || 20, 1), 100);

  // Empty query returns empty results
  if (!query) {
    return json<SearchResponse>({
      success: true,
      results: [],
      query: "",
      count: 0,
    });
  }

  const supabase = createSupabaseClientFromRequest(request, env);

  // Use PostgreSQL full-text search
  // The fts column is a generated tsvector from name, category, barcode
  const searchQuery = query
    .split(/\s+/)
    .filter(Boolean)
    .map(term => `${term}:*`) // Prefix matching for partial words
    .join(" & ");

  const { data, error, count } = await supabase
    .from("inventory")
    .select("id, barcode, name, category, stock, price, image_url", { count: "exact" })
    .eq("tenant_id", tenantId)
    .textSearch("fts", searchQuery, { type: "websearch" })
    .limit(limit);

  if (error) {
    // Fallback to ILIKE search if FTS fails (e.g., invalid query syntax)
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("inventory")
      .select("id, barcode, name, category, stock, price, image_url")
      .eq("tenant_id", tenantId)
      .or(`name.ilike.%${query}%,category.ilike.%${query}%,barcode.ilike.%${query}%`)
      .limit(limit);

    if (fallbackError) {
      return json<SearchResponse>({ 
        success: false, 
        error: "Search failed" 
      }, { status: 500 });
    }

    return json<SearchResponse>({
      success: true,
      results: fallbackData || [],
      query,
      count: fallbackData?.length || 0,
    });
  }

  return json<SearchResponse>({
    success: true,
    results: data || [],
    query,
    count: count || data?.length || 0,
  });
}
