import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Environment interface for Cloudflare Workers
 * Includes Supabase credentials and optional Hyperdrive binding
 */
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  // JWT secret for edge validation (Requirements: 13.3, 13.4)
  SUPABASE_JWT_SECRET?: string;
  // Hyperdrive binding for connection pooling (configured in wrangler.toml)
  HYPERDRIVE?: {
    connectionString: string;
  };
}

/**
 * Creates a Supabase client configured for Cloudflare Workers
 * Uses Supavisor connection pooling via port 6543 (Transaction Mode)
 * 
 * @param env - Cloudflare Worker environment bindings
 * @param authHeader - Optional Authorization header for authenticated requests
 * @returns Configured Supabase client
 */
export function createSupabaseClient(
  env: Env,
  authHeader?: string | null
): SupabaseClient {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase configuration. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set."
    );
  }

  // Configure client options for serverless environment
  const options: Parameters<typeof createClient>[2] = {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    // Use global headers for authenticated requests
    global: {
      headers: authHeader
        ? { Authorization: authHeader }
        : {},
    },
  };

  return createClient(supabaseUrl, supabaseKey, options);
}

/**
 * Creates an authenticated Supabase client from a request
 * Extracts JWT from Authorization header and passes to client
 * 
 * @param request - Incoming HTTP request
 * @param env - Cloudflare Worker environment bindings
 * @returns Authenticated Supabase client
 */
export function createSupabaseClientFromRequest(
  request: Request,
  env: Env
): SupabaseClient {
  const authHeader = request.headers.get("Authorization");
  return createSupabaseClient(env, authHeader);
}

/**
 * Gets the Supabase connection URL with Supavisor pooling
 * Uses port 6543 for Transaction Mode (required for serverless)
 * 
 * Note: Direct database connections should use Hyperdrive when available
 * for additional connection pooling and latency reduction
 * 
 * @param env - Cloudflare Worker environment bindings
 * @returns Connection string for Supavisor Transaction Mode
 */
export function getPooledConnectionString(env: Env): string | null {
  // If Hyperdrive is configured, use its connection string
  if (env.HYPERDRIVE?.connectionString) {
    return env.HYPERDRIVE.connectionString;
  }

  // Otherwise, construct Supavisor connection string
  // Format: postgresql://postgres.[project-ref]:[password]@[host]:6543/postgres
  // Note: This requires the database password to be available
  // For production, use Hyperdrive binding instead
  return null;
}

/**
 * Type definitions for database tables
 * These will be generated from Supabase schema using:
 * npx supabase gen types typescript --local > src/types/database.ts
 */
export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          subdomain: string;
          settings: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subdomain: string;
          settings?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          subdomain?: string;
          settings?: Record<string, unknown>;
          created_at?: string;
        };
      };
      inventory: {
        Row: {
          id: string;
          tenant_id: string;
          barcode: string;
          name: string;
          category: string;
          stock: number;
          price: number;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          barcode: string;
          name: string;
          category: string;
          stock?: number;
          price: number;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          barcode?: string;
          name?: string;
          category?: string;
          stock?: number;
          price?: number;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          tenant_id: string;
          type: "takeout" | "delivery";
          status: "pending" | "paid" | "processing" | "ready" | "completed";
          fulfillment_data: Record<string, unknown>;
          pickup_code: string | null;
          total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          type: "takeout" | "delivery";
          status?: "pending" | "paid" | "processing" | "ready" | "completed";
          fulfillment_data?: Record<string, unknown>;
          pickup_code?: string | null;
          total: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          type?: "takeout" | "delivery";
          status?: "pending" | "paid" | "processing" | "ready" | "completed";
          fulfillment_data?: Record<string, unknown>;
          pickup_code?: string | null;
          total?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          inventory_id: string;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          inventory_id: string;
          quantity: number;
          unit_price: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          inventory_id?: string;
          quantity?: number;
          unit_price?: number;
        };
      };
      user_tenants: {
        Row: {
          user_id: string;
          tenant_id: string;
          role: string;
        };
        Insert: {
          user_id: string;
          tenant_id: string;
          role?: string;
        };
        Update: {
          user_id?: string;
          tenant_id?: string;
          role?: string;
        };
      };
    };
    Functions: {
      decrement_stock: {
        Args: {
          p_item_id: string;
          p_quantity: number;
          p_tenant_id: string;
        };
        Returns: boolean;
      };
      increment_stock: {
        Args: {
          p_item_id: string;
          p_quantity: number;
          p_tenant_id: string;
        };
        Returns: boolean;
      };
      set_stock: {
        Args: {
          p_item_id: string;
          p_quantity: number;
          p_tenant_id: string;
        };
        Returns: boolean;
      };
    };
  };
};
