/**
 * Image Upload API Route
 * Requirements: 6.7 - Store images in Cloudflare R2 or Supabase Storage
 * 
 * Handles image uploads for product/service catalog with:
 * - Tenant-prefixed storage paths
 * - File type and size validation
 * - Returns public URL for display
 */

import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createSupabaseClientFromRequest, type Env } from "~/lib/supabase.server";
import { jwtMiddleware, getTenantIdFromPayload } from "~/lib/jwt.server";

// Extended Env interface with R2 binding
interface UploadEnv extends Env {
  PRODUCT_IMAGES?: R2Bucket;
  R2_PUBLIC_URL?: string;
}

interface UploadResponse {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Generate a unique filename for the upload
 */
function generateFilename(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
}

/**
 * POST /api/upload
 * Uploads an image file and returns the public URL
 * 
 * Request: multipart/form-data with 'file' field
 * Response: { success: true, url: string, key: string }
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as UploadEnv;

  // Validate JWT
  const { response: authError, payload } = await jwtMiddleware(request, env);
  if (authError) return authError;
  if (!payload) {
    return json<UploadResponse>({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const tenantId = getTenantIdFromPayload(payload);
  if (!tenantId) {
    return json<UploadResponse>({ success: false, error: "Tenant not found in token" }, { status: 403 });
  }

  // Only accept POST
  if (request.method !== "POST") {
    return json<UploadResponse>({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return json<UploadResponse>({ success: false, error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return json<UploadResponse>({ 
        success: false, 
        error: "Invalid file type. Allowed: JPEG, PNG, WebP" 
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return json<UploadResponse>({ 
        success: false, 
        error: "File too large. Maximum size: 5MB" 
      }, { status: 400 });
    }

    // Generate storage key with tenant prefix
    const filename = generateFilename(file.name);
    const key = `${tenantId}/products/${filename}`;

    // Try R2 first if configured
    if (env.PRODUCT_IMAGES) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        
        await env.PRODUCT_IMAGES.put(key, arrayBuffer, {
          httpMetadata: {
            contentType: file.type,
          },
        });

        // Construct public URL
        const publicUrl = env.R2_PUBLIC_URL 
          ? `${env.R2_PUBLIC_URL}/${key}`
          : `https://r2.clubeeshop.com/${key}`; // Default R2 public URL

        return json<UploadResponse>({
          success: true,
          url: publicUrl,
          key,
        });
      } catch (r2Error) {
        console.error("R2 upload failed, falling back to Supabase:", r2Error);
        // Fall through to Supabase Storage
      }
    }

    // Fallback to Supabase Storage
    const supabase = createSupabaseClientFromRequest(request, env);
    const arrayBuffer = await file.arrayBuffer();
    
    const { data, error } = await supabase.storage
      .from("product-images")
      .upload(key, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Supabase Storage upload failed:", error);
      return json<UploadResponse>({ 
        success: false, 
        error: "Failed to upload image" 
      }, { status: 500 });
    }

    // Get public URL from Supabase
    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(data.path);

    return json<UploadResponse>({
      success: true,
      url: urlData.publicUrl,
      key: data.path,
    });

  } catch (err) {
    console.error("Upload error:", err);
    return json<UploadResponse>({ 
      success: false, 
      error: "Failed to process upload" 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/upload
 * Deletes an uploaded image
 * 
 * Request body: { key: string }
 */
export async function loader({ request, context }: ActionFunctionArgs) {
  // DELETE requests come through loader when using fetch with DELETE method
  if (request.method !== "DELETE") {
    return json<UploadResponse>({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  const env = context.cloudflare.env as UploadEnv;

  // Validate JWT
  const { response: authError, payload } = await jwtMiddleware(request, env);
  if (authError) return authError;
  if (!payload) {
    return json<UploadResponse>({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const tenantId = getTenantIdFromPayload(payload);
  if (!tenantId) {
    return json<UploadResponse>({ success: false, error: "Tenant not found in token" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (!key) {
      return json<UploadResponse>({ success: false, error: "No key provided" }, { status: 400 });
    }

    // Verify the key belongs to this tenant
    if (!key.startsWith(`${tenantId}/`)) {
      return json<UploadResponse>({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    // Try R2 first if configured
    if (env.PRODUCT_IMAGES) {
      try {
        await env.PRODUCT_IMAGES.delete(key);
        return json<UploadResponse>({ success: true });
      } catch (r2Error) {
        console.error("R2 delete failed, trying Supabase:", r2Error);
      }
    }

    // Fallback to Supabase Storage
    const supabase = createSupabaseClientFromRequest(request, env);
    
    const { error } = await supabase.storage
      .from("product-images")
      .remove([key]);

    if (error) {
      console.error("Supabase Storage delete failed:", error);
      return json<UploadResponse>({ 
        success: false, 
        error: "Failed to delete image" 
      }, { status: 500 });
    }

    return json<UploadResponse>({ success: true });

  } catch (err) {
    console.error("Delete error:", err);
    return json<UploadResponse>({ 
      success: false, 
      error: "Failed to process delete" 
    }, { status: 500 });
  }
}
