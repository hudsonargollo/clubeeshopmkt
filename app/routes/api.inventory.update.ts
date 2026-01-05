/**
 * Inventory Update API Route
 * Requirements: 5.4 - Stock modifications via PostgreSQL RPCs
 */

import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createSupabaseClientFromRequest, type Env } from "~/lib/supabase.server";
import { jwtMiddleware, getTenantIdFromPayload } from "~/lib/jwt.server";

interface UpdateRequest {
  id: string;
  name?: string;
  category?: string;
  price?: number;
  stock?: number;
}

interface UpdateResponse {
  success: boolean;
  error?: string;
}

/**
 * POST /api/inventory/update
 * Updates an inventory item (requires authentication)
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;

  // Validate JWT
  const { response: authError, payload } = await jwtMiddleware(request, env);
  if (authError) return authError;
  if (!payload) {
    return json<UpdateResponse>({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const tenantId = getTenantIdFromPayload(payload);
  if (!tenantId) {
    return json<UpdateResponse>({ success: false, error: "Tenant not found" }, { status: 403 });
  }

  try {
    const body: UpdateRequest = await request.json();
    
    if (!body.id) {
      return json<UpdateResponse>({ success: false, error: "Item ID required" }, { status: 400 });
    }

    const supabase = createSupabaseClientFromRequest(request, env);

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.category !== undefined) updates.category = body.category;
    if (body.price !== undefined) updates.price = body.price;

    // Handle stock update via RPC for atomicity
    if (body.stock !== undefined) {
      const { data: stockResult, error: stockError } = await supabase
        .rpc('set_stock', {
          p_item_id: body.id,
          p_quantity: body.stock,
          p_tenant_id: tenantId,
        });

      if (stockError) {
        console.error('Stock update failed:', stockError);
        return json<UpdateResponse>({ success: false, error: "Failed to update stock" }, { status: 500 });
      }

      if (!stockResult) {
        return json<UpdateResponse>({ success: false, error: "Stock update rejected" }, { status: 409 });
      }
    }

    // Update other fields if any
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('inventory')
        .update(updates)
        .eq('id', body.id)
        .eq('tenant_id', tenantId);

      if (updateError) {
        console.error('Update failed:', updateError);
        return json<UpdateResponse>({ success: false, error: "Failed to update item" }, { status: 500 });
      }
    }

    return json<UpdateResponse>({ success: true });
  } catch (err) {
    console.error('Update error:', err);
    return json<UpdateResponse>({ success: false, error: "Invalid request" }, { status: 400 });
  }
}
