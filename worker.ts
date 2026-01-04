import { createRequestHandler, type ServerBuild } from "@remix-run/cloudflare";
import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
// @ts-ignore - this is generated at build time
import * as build from "./build/server";
// @ts-ignore
import manifestJSON from "__STATIC_CONTENT_MANIFEST";

const MANIFEST = JSON.parse(manifestJSON);

const handleRequest = createRequestHandler(build as unknown as ServerBuild);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    try {
      const url = new URL(request.url);
      
      // Try to serve static assets first
      if (url.pathname.startsWith("/assets/") || 
          url.pathname.startsWith("/build/") ||
          url.pathname === "/favicon.ico" ||
          url.pathname === "/manifest.json") {
        try {
          return await getAssetFromKV(
            { request, waitUntil: ctx.waitUntil.bind(ctx) },
            {
              ASSET_NAMESPACE: env.__STATIC_CONTENT,
              ASSET_MANIFEST: MANIFEST,
            }
          );
        } catch (e) {
          // Asset not found, fall through to Remix
        }
      }

      // Handle with Remix
      const loadContext = {
        cloudflare: {
          env,
          ctx,
        },
      };
      return await handleRequest(request, loadContext);
    } catch (error) {
      console.error(error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};

interface Env {
  __STATIC_CONTENT: KVNamespace;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ENVIRONMENT: string;
}
