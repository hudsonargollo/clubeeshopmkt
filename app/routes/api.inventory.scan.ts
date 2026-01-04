/**
 * Inventory Scan API Route
 * Requirements: 5.1, 5.2, 5.3, 5.4 - Atomic stock management via RPC
 * Requirements: 6.5 - Cache invalidation on inventory update
 * 
 * Handles barcode scan events for inventory lookup and stock operations
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createSupabaseClientFromRequest, type Env } from "~/lib/supabase.server";
import { jwtMiddleware, getTenantIdFromPayload } from "~/lib/jwt.server";
import { invalidateTenantCatalog } from "~/lib/cache.server";

interface ScanRequest {
  barcode: string;
  operation?: "lookup" | "decrement" | "increment";
  quantity?: number;
}

interface ScanResponse {
  success: boolean;
  item?: {
    id: string;
    barcode: string;
    name: string;
    category: string;
    stock: number;
    price: number;
    image_url: string | null;
  };
  error?: string;
  stockUpdated?: boolean;
}

/**
 * GET /api/inventory/scan?barcode=xxx
 * Lookup inventory item by barcode
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  
  // Validate JWT
  const { response: authError, payload } = await jwtMiddleware(request, env);
  if (authError) return authError;
  if (!payload) {
    return json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const tenantId = getTenantIdFromPayload(payload);
  if (!tenantId) {
    return json({ success: false, error: "Tenant not found in token" }, { status: 403 });
  }

  const url = new URL(request.url);
  const barcode = url.searchParams.get("barcode");

  if (!barcode) {
    return json({ success: false, error: "Barcode parameter required" }, { status: 400 });
  }

  const supabase = createSupabaseClientFromRequest(request, env);

  const { data, error } = await supabase
    .from("inventory")
    .select("id, barcode, name, category, stock, price, image_url")
    .eq("barcode", barcode)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) {
    return json<ScanResponse>({ 
      success: false, 
      error: "Item not found" 
    }, { status: 404 });
  }

  return json<ScanResponse>({
    success: true,
    item: data,
  });
}

/**
 * POST /api/inventory/scan
 * Process scan with optional stock operation
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;

  // Validate JWT
  const { response: authError, payload } = await jwtMiddleware(request, env);
  if (authError) return authError;
  if (!payload) {
    return json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const tenantId = getTenantIdFromPayload(payload);
  if (!tenantId) {
    return json({ success: false, error: "Tenant not found in token" }, { status: 403 });
  }

  // Parse request body
  let body: ScanRequest;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { barcode, operation = "lookup", quantity = 1 } = body;

  if (!barcode) {
    return json({ success: false, error: "Barcode required" }, { status: 400 });
  }

  if (quantity <= 0) {
    return json({ success: false, error: "Quantity must be positive" }, { status: 400 });
  }

  const supabase = createSupabaseClientFromRequest(request, env);

  // First, lookup the item
  const { data: item, error: lookupError } = await supabase
    .from("inventory")
    .select("id, barcode, name, category, stock, price, image_url")
    .eq("barcode", barcode)
    .eq("tenant_id", tenantId)
    .single();

  if (lookupError || !item) {
    return json<ScanResponse>({ 
      success: false, 
      error: "Item not found" 
    }, { status: 404 });
  }

  // Handle stock operations
  if (operation === "decrement") {
    const { data: result, error: rpcError } = await supabase.rpc("decrement_stock", {
      p_item_id: item.id,
      p_quantity: quantity,
      p_tenant_id: tenantId,
    });

    if (rpcError) {
      return json<ScanResponse>({ 
        success: false, 
        error: "Stock operation failed" 
      }, { status: 500 });
    }

    if (!result) {
      return json<ScanResponse>({ 
        success: false, 
        error: "Insufficient stock",
        item: item,
        stockUpdated: false,
      }, { status: 409 });
    }

    // Fetch updated item
    const { data: updatedItem } = await supabase
      .from("inventory")
      .select("id, barcode, name, category, stock, price, image_url")
      .eq("id", item.id)
      .single();

    // Invalidate catalog cache after stock change (Requirement 6.5)
    await invalidateTenantCatalog(tenantId, request);

    return json<ScanResponse>({
      success: true,
      item: updatedItem || { ...item, stock: item.stock - quantity },
      stockUpdated: true,
    });
  }

  if (operation === "increment") {
    const { data: result, error: rpcError } = await supabase.rpc("increment_stock", {
      p_item_id: item.id,
      p_quantity: quantity,
      p_tenant_id: tenantId,
    });

    if (rpcError) {
      return json<ScanResponse>({ 
        success: false, 
        error: "Stock operation failed" 
      }, { status: 500 });
    }

    if (!result) {
      return json<ScanResponse>({ 
        success: false, 
        error: "Item not found for update" 
      }, { status: 404 });
    }

    // Fetch updated item
    const { data: updatedItem } = await supabase
      .from("inventory")
      .select("id, barcode, name, category, stock, price, image_url")
      .eq("id", item.id)
      .single();

    // Invalidate catalog cache after stock change (Requirement 6.5)
    await invalidateTenantCatalog(tenantId, request);

    return json<ScanResponse>({
      success: true,
      item: updatedItem || { ...item, stock: item.stock + quantity },
      stockUpdated: true,
    });
  }

  // Default: lookup only
  return json<ScanResponse>({
    success: true,
    item: item,
  });
}
