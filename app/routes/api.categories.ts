/**
 * Categories API Route
 * Requirements: 5.3, 5.4, 5.5, 5.6 - CRUD operations for category management
 * 
 * Provides category management with tenant isolation via RLS
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createSupabaseClientFromRequest, type Env } from "~/lib/supabase.server";
import { jwtMiddleware, getTenantIdFromPayload } from "~/lib/jwt.server";

interface Category {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface CategoriesResponse {
  success: boolean;
  categories?: Category[];
  category?: Category;
  error?: string;
}

/**
 * Generates a URL-safe slug from a category name
 * Converts to lowercase, replaces spaces with hyphens, removes special characters
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '')     // Remove non-alphanumeric characters except hyphens
    .replace(/-+/g, '-')            // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '');         // Remove leading/trailing hyphens
}

/**
 * GET /api/categories
 * Returns all categories for the authenticated tenant
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;

  // Validate JWT
  const { response: authError, payload } = await jwtMiddleware(request, env);
  if (authError) return authError;
  if (!payload) {
    return json<CategoriesResponse>({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const tenantId = getTenantIdFromPayload(payload);
  if (!tenantId) {
    return json<CategoriesResponse>({ success: false, error: "Tenant not found in token" }, { status: 403 });
  }

  const supabase = createSupabaseClientFromRequest(request, env);

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch categories:", error);
    return json<CategoriesResponse>({ success: false, error: "Failed to fetch categories" }, { status: 500 });
  }

  return json<CategoriesResponse>({ success: true, categories: data || [] });
}

/**
 * POST/PUT/DELETE /api/categories
 * Handles create, update, and delete operations
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;

  // Validate JWT
  const { response: authError, payload } = await jwtMiddleware(request, env);
  if (authError) return authError;
  if (!payload) {
    return json<CategoriesResponse>({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const tenantId = getTenantIdFromPayload(payload);
  if (!tenantId) {
    return json<CategoriesResponse>({ success: false, error: "Tenant not found in token" }, { status: 403 });
  }

  const supabase = createSupabaseClientFromRequest(request, env);
  const method = request.method.toUpperCase();

  // Parse request body
  let body: { id?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return json<CategoriesResponse>({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  switch (method) {
    case "POST": {
      // Create new category
      const { name } = body;
      
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return json<CategoriesResponse>({ success: false, error: "Category name is required" }, { status: 400 });
      }

      const trimmedName = name.trim();
      if (trimmedName.length > 100) {
        return json<CategoriesResponse>({ success: false, error: "Category name must be 100 characters or less" }, { status: 400 });
      }

      const slug = generateSlug(trimmedName);
      if (!slug) {
        return json<CategoriesResponse>({ success: false, error: "Invalid category name - cannot generate slug" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("categories")
        .insert({
          tenant_id: tenantId,
          name: trimmedName,
          slug,
        })
        .select()
        .single();

      if (error) {
        // Check for unique constraint violation
        if (error.code === "23505") {
          return json<CategoriesResponse>({ success: false, error: "A category with this name already exists" }, { status: 409 });
        }
        console.error("Failed to create category:", error);
        return json<CategoriesResponse>({ success: false, error: "Failed to create category" }, { status: 500 });
      }

      return json<CategoriesResponse>({ success: true, category: data }, { status: 201 });
    }

    case "PUT": {
      // Update existing category
      const { id, name } = body;

      if (!id || typeof id !== "string") {
        return json<CategoriesResponse>({ success: false, error: "Category ID is required" }, { status: 400 });
      }

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return json<CategoriesResponse>({ success: false, error: "Category name is required" }, { status: 400 });
      }

      const trimmedName = name.trim();
      if (trimmedName.length > 100) {
        return json<CategoriesResponse>({ success: false, error: "Category name must be 100 characters or less" }, { status: 400 });
      }

      const slug = generateSlug(trimmedName);
      if (!slug) {
        return json<CategoriesResponse>({ success: false, error: "Invalid category name - cannot generate slug" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("categories")
        .update({ name: trimmedName, slug })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error) {
        // Check for unique constraint violation
        if (error.code === "23505") {
          return json<CategoriesResponse>({ success: false, error: "A category with this name already exists" }, { status: 409 });
        }
        console.error("Failed to update category:", error);
        return json<CategoriesResponse>({ success: false, error: "Failed to update category" }, { status: 500 });
      }

      if (!data) {
        return json<CategoriesResponse>({ success: false, error: "Category not found" }, { status: 404 });
      }

      return json<CategoriesResponse>({ success: true, category: data });
    }

    case "DELETE": {
      // Delete category
      const { id } = body;

      if (!id || typeof id !== "string") {
        return json<CategoriesResponse>({ success: false, error: "Category ID is required" }, { status: 400 });
      }

      // Delete the category - inventory items will have category_id set to NULL via ON DELETE SET NULL
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) {
        console.error("Failed to delete category:", error);
        return json<CategoriesResponse>({ success: false, error: "Failed to delete category" }, { status: 500 });
      }

      return json<CategoriesResponse>({ success: true });
    }

    default:
      return json<CategoriesResponse>({ success: false, error: "Method not allowed" }, { status: 405 });
  }
}
