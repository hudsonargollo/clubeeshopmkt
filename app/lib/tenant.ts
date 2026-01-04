/**
 * Tenant Resolution Utilities
 * Requirements: 1.1 - Determine tenant from hostname subdomain or URL path
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase.server";

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface TenantResolver {
  fromHostname(hostname: string): Promise<Tenant | null>;
  fromPath(path: string): Promise<Tenant | null>;
  fromJWT(token: string): TenantClaim | null;
}

export interface TenantClaim {
  tenant_id: string;
}

/**
 * Extracts subdomain from a hostname
 * Examples:
 *   - "tenant-a.shop.com" -> "tenant-a"
 *   - "tenant-a.localhost" -> "tenant-a"
 *   - "shop.com" -> null (no subdomain)
 *   - "localhost" -> null (no subdomain)
 */
export function extractSubdomain(hostname: string): string | null {
  // Remove port if present
  const hostWithoutPort = hostname.split(":")[0];
  const parts = hostWithoutPort.split(".");

  // Need at least 2 parts for a subdomain (subdomain.domain)
  // For localhost, we treat "tenant.localhost" as having subdomain "tenant"
  if (parts.length < 2) {
    return null;
  }

  // Check if it's a localhost scenario
  if (parts[parts.length - 1] === "localhost") {
    // "tenant.localhost" -> "tenant"
    if (parts.length === 2) {
      return parts[0];
    }
    return null;
  }

  // Standard domain: need at least 3 parts (subdomain.domain.tld)
  if (parts.length < 3) {
    return null;
  }

  // Return the first part as subdomain
  return parts[0];
}

/**
 * Extracts tenant identifier from URL path
 * Expected format: /shop/{tenant-subdomain}/...
 * Examples:
 *   - "/shop/tenant-a/products" -> "tenant-a"
 *   - "/shop/tenant-a" -> "tenant-a"
 *   - "/products" -> null (no tenant in path)
 */
export function extractTenantFromPath(path: string): string | null {
  // Match /shop/{tenant}/... pattern
  const match = path.match(/^\/shop\/([^/]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

/**
 * Decodes JWT payload without verification (for extracting claims)
 * Note: This does NOT verify the signature - use validateJWT for that
 */
export function decodeJWTPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // Decode base64url payload
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Extracts tenant_id from JWT app_metadata claim
 */
export function extractTenantFromJWT(token: string): TenantClaim | null {
  const payload = decodeJWTPayload(token);
  if (!payload) {
    return null;
  }

  const appMetadata = payload.app_metadata as Record<string, unknown> | undefined;
  if (!appMetadata || typeof appMetadata.tenant_id !== "string") {
    return null;
  }

  return {
    tenant_id: appMetadata.tenant_id,
  };
}

/**
 * Creates a tenant resolver with database lookup capabilities
 */
export function createTenantResolver(
  supabase: SupabaseClient<Database>
): TenantResolver {
  return {
    /**
     * Resolves tenant from hostname subdomain
     * Priority 1 in resolution chain
     */
    async fromHostname(hostname: string): Promise<Tenant | null> {
      const subdomain = extractSubdomain(hostname);
      if (!subdomain) {
        return null;
      }

      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("subdomain", subdomain)
        .single();

      if (error || !data) {
        return null;
      }

      return data as Tenant;
    },

    /**
     * Resolves tenant from URL path
     * Priority 2 in resolution chain
     */
    async fromPath(path: string): Promise<Tenant | null> {
      const subdomain = extractTenantFromPath(path);
      if (!subdomain) {
        return null;
      }

      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("subdomain", subdomain)
        .single();

      if (error || !data) {
        return null;
      }

      return data as Tenant;
    },

    /**
     * Extracts tenant claim from JWT
     * Priority 3 in resolution chain (for authenticated requests)
     */
    fromJWT(token: string): TenantClaim | null {
      return extractTenantFromJWT(token);
    },
  };
}

/**
 * Resolves tenant from request using priority chain:
 * 1. Subdomain from hostname
 * 2. Path segment
 * 3. JWT claim (if authenticated)
 */
export async function resolveTenantFromRequest(
  request: Request,
  supabase: SupabaseClient<Database>
): Promise<Tenant | null> {
  const url = new URL(request.url);
  const resolver = createTenantResolver(supabase);

  // Priority 1: Try hostname subdomain
  const tenantFromHost = await resolver.fromHostname(url.hostname);
  if (tenantFromHost) {
    return tenantFromHost;
  }

  // Priority 2: Try URL path
  const tenantFromPath = await resolver.fromPath(url.pathname);
  if (tenantFromPath) {
    return tenantFromPath;
  }

  // Priority 3: Try JWT claim (requires database lookup by tenant_id)
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const claim = resolver.fromJWT(token);
    if (claim) {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", claim.tenant_id)
        .single();

      if (!error && data) {
        return data as Tenant;
      }
    }
  }

  return null;
}
