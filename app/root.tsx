import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import type { Env } from "~/lib/supabase.server";

import "./styles/tailwind.css";

/**
 * Global meta tags for SEO
 * Requirements: 6.3 - Proper meta tags for SEO
 */
export const meta: MetaFunction = () => {
  return [
    { title: "ClubeeShopMkt - Retail Operations Platform" },
    { name: "description", content: "Edge-native multi-tenant retail platform with real-time inventory management and mobile-first webshop." },
    { name: "theme-color", content: "#000000" },
    { name: "mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    // Open Graph
    { property: "og:type", content: "website" },
    { property: "og:title", content: "ClubeeShopMkt" },
    { property: "og:description", content: "Edge-native multi-tenant retail platform" },
    // Twitter Card
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: "ClubeeShopMkt" },
    { name: "twitter:description", content: "Edge-native multi-tenant retail platform" },
  ];
};

export const links: LinksFunction = () => [
  // Preconnect to Supabase for faster API calls
  { rel: "preconnect", href: "https://supabase.co" },
  // PWA manifest (if exists)
  { rel: "manifest", href: "/manifest.json" },
  // Favicon
  { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
];

/**
 * Loader to expose public environment variables to the client
 * Required for client-side Supabase authentication
 */
export async function loader({ context }: LoaderFunctionArgs) {
  const env = context.cloudflare?.env as Env | undefined;
  
  // Handle missing env gracefully - page will still render
  const supabaseUrl = env?.SUPABASE_URL || '';
  const supabaseAnonKey = env?.SUPABASE_ANON_KEY || '';
  
  return json({
    ENV: {
      SUPABASE_URL: supabaseUrl,
      SUPABASE_ANON_KEY: supabaseAnonKey,
    },
  });
}

export function Layout({ children }: { children: React.ReactNode }) {
  // Get loader data if available (won't be available during error boundaries)
  let data: { ENV?: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string } } | undefined;
  try {
    data = useLoaderData<typeof loader>();
  } catch {
    // Loader data not available (e.g., during error boundary)
  }

  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <Meta />
        <Links />
      </head>
      <body className="h-full bg-background text-foreground antialiased">
        {children}
        <ScrollRestoration />
        {data?.ENV && (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.ENV = ${JSON.stringify(data.ENV)}`,
            }}
          />
        )}
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
