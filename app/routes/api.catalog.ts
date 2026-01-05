/**
 * Product Catalog API Route with Edge Caching
 * Requirements: 6.4 - Edge caching for product catalog
 * 
 * Provides cached product catalog data for the webshop
 * Uses Cloudflare Cache API for edge caching
 */

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createSupabaseClientFromRequest, type Env } from "~/lib/supabase.server";
import { jwtMiddleware, getTenantIdFromPayload } from "~/lib/jwt.server";
import { withCache, jsonWithCache } from "~/lib/cache.server";

interface CatalogItem {
  id: string;
  type: 'physical' | 'service';
  barcode: string | null;
  name: string;
  description: string | null;
  category: string;
  category_id: string | null;
  stock: number;
  price: number;
  image_url: string | null;
}

interface CatalogResponse {
  success: boolean;
  items?: CatalogItem[];
  categories?: string[];
  total?: number;
  error?: string;
}

/**
 * GET /api/catalog
 * Returns cached product catalog for the tenant
 * 
 * Query params:
 * - category: Filter by category
 * - limit: Max items to return (default: 50, max: 200)
 * - offset: Pagination offset
 * - inStock: Only show items with stock > 0
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;

  // Validate JWT
  const { response: authError, payload } = await jwtMiddleware(request, env);
  if (authError) return authError;
  if (!payload) {
    return json<CatalogResponse>({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const tenantId = getTenantIdFromPayload(payload);
  if (!tenantId) {
    return json<CatalogResponse>({ success: false, error: "Tenant not found in token" }, { status: 403 });
  }

  // Use cache wrapper for GET requests
  return withCache(
    request,
    tenantId,
    async () => {
      const url = new URL(request.url);
      const category = url.searchParams.get("category");
      const limitParam = url.searchParams.get("limit");
      const offsetParam = url.searchParams.get("offset");
      const inStockOnly = url.searchParams.get("inStock") === "true";

      const limit = Math.min(Math.max(parseInt(limitParam || "50", 10) || 50, 1), 200);
      const offset = Math.max(parseInt(offsetParam || "0", 10) || 0, 0);

      const supabase = createSupabaseClientFromRequest(request, env);

      // Build query
      let query = supabase
        .from("inventory")
        .select("id, type, barcode, name, description, category, category_id, stock, price, image_url", { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("category", { ascending: true })
        .order("name", { ascending: true })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (category) {
        query = query.eq("category", category);
      }
      if (inStockOnly) {
        query = query.gt("stock", 0);
      }

      const { data, error, count } = await query;

      if (error) {
        return json<CatalogResponse>({ 
          success: false, 
          error: "Failed to fetch catalog" 
        }, { status: 500 });
      }

      // Get unique categories for filtering
      const { data: categoryData } = await supabase
        .from("inventory")
        .select("category")
        .eq("tenant_id", tenantId)
        .order("category");

      const categories = [...new Set(categoryData?.map(c => c.category) || [])];

      // Return with cache headers (60 second TTL, 30 second SWR)
      return jsonWithCache<CatalogResponse>(
        {
          success: true,
          items: data || [],
          categories,
          total: count || 0,
        },
        { ttl: 60, staleWhileRevalidate: 30, tags: [`tenant:${tenantId}`, 'catalog'] }
      );
    },
    { ttl: 60, staleWhileRevalidate: 30, tags: [`tenant:${tenantId}`, 'catalog'] }
  );
}
