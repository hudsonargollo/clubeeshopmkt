/**
 * Products API Route - Full CRUD for Products and Services
 * Requirements: 6.1, 6.2, 6.3, 6.8, 6.9 - Product/Service catalog management
 * 
 * Provides CRUD operations for inventory items with type (physical/service) support,
 * category assignment, and barcode uniqueness validation per tenant.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createSupabaseClientFromRequest, type Env } from "~/lib/supabase.server";
import { jwtMiddleware, getTenantIdFromPayload } from "~/lib/jwt.server";

// Type definitions
export type InventoryType = 'physical' | 'service';

export interface ProductItem {
  id: string;
  tenant_id: string;
  type: InventoryType;
  barcode: string | null;
  name: string;
  description: string | null;
  category: string;
  category_id: string | null;
  stock: number;
  price: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductFormData {
  type: InventoryType;
  name: string;
  description?: string | null;
  category?: string;
  category_id?: string | null;
  barcode?: string | null;
  stock?: number;
  price: number;
  image_url?: string | null;
}

interface ProductsResponse {
  success: boolean;
  products?: ProductItem[];
  product?: ProductItem;
  total?: number;
  error?: string;
  field?: string; // For field-specific errors
}

/**
 * Validates product form data based on type
 * Physical products require barcode and stock >= 0
 * Services don't require barcode or stock
 */
function validateProductData(data: ProductFormData): { valid: boolean; error?: string; field?: string } {
  // Common validations
  if (!data.name || data.name.trim().length === 0) {
    return { valid: false, error: "Product name is required", field: "name" };
  }
  
  if (data.name.trim().length > 200) {
    return { valid: false, error: "Product name must be 200 characters or less", field: "name" };
  }

  if (data.description && data.description.length > 2000) {
    return { valid: false, error: "Description must be 2000 characters or less", field: "description" };
  }

  if (typeof data.price !== 'number' || data.price < 0) {
    return { valid: false, error: "Price must be a non-negative number", field: "price" };
  }

  // Type-specific validations
  if (data.type === 'physical') {
    if (!data.barcode || data.barcode.trim().length === 0) {
      return { valid: false, error: "Barcode is required for physical products", field: "barcode" };
    }
    
    if (data.barcode.trim().length > 100) {
      return { valid: false, error: "Barcode must be 100 characters or less", field: "barcode" };
    }

    if (typeof data.stock !== 'number' || data.stock < 0) {
      return { valid: false, error: "Stock must be a non-negative number for physical products", field: "stock" };
    }
  }

  return { valid: true };
}

/**
 * GET /api/products
 * Returns all products/services for the authenticated tenant
 * 
 * Query params:
 * - type: Filter by type ('physical' | 'service')
 * - category_id: Filter by category UUID
 * - search: Search by name/barcode/description
 * - limit: Max items to return (default: 50, max: 200)
 * - offset: Pagination offset
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;

  // Validate JWT
  const { response: authError, payload } = await jwtMiddleware(request, env);
  if (authError) return authError;
  if (!payload) {
    return json<ProductsResponse>({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const tenantId = getTenantIdFromPayload(payload);
  if (!tenantId) {
    return json<ProductsResponse>({ success: false, error: "Tenant not found in token" }, { status: 403 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") as InventoryType | null;
  const categoryId = url.searchParams.get("category_id");
  const search = url.searchParams.get("search");
  const limitParam = url.searchParams.get("limit");
  const offsetParam = url.searchParams.get("offset");

  const limit = Math.min(Math.max(parseInt(limitParam || "50", 10) || 50, 1), 200);
  const offset = Math.max(parseInt(offsetParam || "0", 10) || 0, 0);

  const supabase = createSupabaseClientFromRequest(request, env);

  // Build query
  let query = supabase
    .from("inventory")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (type) {
    query = query.eq("type", type);
  }
  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }
  if (search) {
    // Use FTS for search
    query = query.textSearch("fts", search, { type: "websearch" });
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to fetch products:", error);
    return json<ProductsResponse>({ success: false, error: "Failed to fetch products" }, { status: 500 });
  }

  return json<ProductsResponse>({
    success: true,
    products: data || [],
    total: count || 0,
  });
}

/**
 * POST/PUT/DELETE /api/products
 * Handles create, update, and delete operations for products/services
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;

  // Validate JWT
  const { response: authError, payload } = await jwtMiddleware(request, env);
  if (authError) return authError;
  if (!payload) {
    return json<ProductsResponse>({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const tenantId = getTenantIdFromPayload(payload);
  if (!tenantId) {
    return json<ProductsResponse>({ success: false, error: "Tenant not found in token" }, { status: 403 });
  }

  const supabase = createSupabaseClientFromRequest(request, env);
  const method = request.method.toUpperCase();

  // Parse request body
  let body: ProductFormData & { id?: string };
  try {
    body = await request.json();
  } catch {
    return json<ProductsResponse>({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  switch (method) {
    case "POST": {
      // Create new product/service
      const validation = validateProductData(body);
      if (!validation.valid) {
        return json<ProductsResponse>({ 
          success: false, 
          error: validation.error, 
          field: validation.field 
        }, { status: 400 });
      }

      // Check barcode uniqueness for physical products
      if (body.type === 'physical' && body.barcode) {
        const { data: existingBarcode } = await supabase
          .from("inventory")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("barcode", body.barcode.trim())
          .single();

        if (existingBarcode) {
          return json<ProductsResponse>({ 
            success: false, 
            error: "This barcode already exists in your inventory",
            field: "barcode"
          }, { status: 409 });
        }
      }

      // Prepare insert data
      const insertData: Record<string, unknown> = {
        tenant_id: tenantId,
        type: body.type,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        category: body.category?.trim() || '',
        category_id: body.category_id || null,
        price: body.price,
        image_url: body.image_url || null,
        // For services, barcode is null and stock is 0
        barcode: body.type === 'physical' ? body.barcode?.trim() : null,
        stock: body.type === 'physical' ? (body.stock ?? 0) : 0,
      };

      const { data, error } = await supabase
        .from("inventory")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Failed to create product:", error);
        // Check for unique constraint violation on barcode
        if (error.code === "23505" && error.message?.includes("barcode")) {
          return json<ProductsResponse>({ 
            success: false, 
            error: "This barcode already exists in your inventory",
            field: "barcode"
          }, { status: 409 });
        }
        return json<ProductsResponse>({ success: false, error: "Failed to create product" }, { status: 500 });
      }

      return json<ProductsResponse>({ success: true, product: data }, { status: 201 });
    }

    case "PUT": {
      // Update existing product/service
      const { id, ...updateData } = body;

      if (!id || typeof id !== "string") {
        return json<ProductsResponse>({ success: false, error: "Product ID is required" }, { status: 400 });
      }

      const validation = validateProductData(updateData as ProductFormData);
      if (!validation.valid) {
        return json<ProductsResponse>({ 
          success: false, 
          error: validation.error, 
          field: validation.field 
        }, { status: 400 });
      }

      // Check barcode uniqueness for physical products (excluding current item)
      if (updateData.type === 'physical' && updateData.barcode) {
        const { data: existingBarcode } = await supabase
          .from("inventory")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("barcode", updateData.barcode.trim())
          .neq("id", id)
          .single();

        if (existingBarcode) {
          return json<ProductsResponse>({ 
            success: false, 
            error: "This barcode already exists in your inventory",
            field: "barcode"
          }, { status: 409 });
        }
      }

      // Prepare update data
      const updates: Record<string, unknown> = {
        type: updateData.type,
        name: updateData.name.trim(),
        description: updateData.description?.trim() || null,
        category: updateData.category?.trim() || '',
        category_id: updateData.category_id || null,
        price: updateData.price,
        image_url: updateData.image_url || null,
        // For services, barcode is null and stock is 0
        barcode: updateData.type === 'physical' ? updateData.barcode?.trim() : null,
        stock: updateData.type === 'physical' ? (updateData.stock ?? 0) : 0,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("inventory")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error) {
        console.error("Failed to update product:", error);
        // Check for unique constraint violation on barcode
        if (error.code === "23505" && error.message?.includes("barcode")) {
          return json<ProductsResponse>({ 
            success: false, 
            error: "This barcode already exists in your inventory",
            field: "barcode"
          }, { status: 409 });
        }
        return json<ProductsResponse>({ success: false, error: "Failed to update product" }, { status: 500 });
      }

      if (!data) {
        return json<ProductsResponse>({ success: false, error: "Product not found" }, { status: 404 });
      }

      return json<ProductsResponse>({ success: true, product: data });
    }

    case "DELETE": {
      // Delete product/service
      const { id } = body;

      if (!id || typeof id !== "string") {
        return json<ProductsResponse>({ success: false, error: "Product ID is required" }, { status: 400 });
      }

      const { error } = await supabase
        .from("inventory")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) {
        console.error("Failed to delete product:", error);
        return json<ProductsResponse>({ success: false, error: "Failed to delete product" }, { status: 500 });
      }

      return json<ProductsResponse>({ success: true });
    }

    default:
      return json<ProductsResponse>({ success: false, error: "Method not allowed" }, { status: 405 });
  }
}
