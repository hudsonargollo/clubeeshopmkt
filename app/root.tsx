import {
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction, MetaFunction } from "@remix-run/cloudflare";

import "./styles/tailwind.css";
import { AnimatedOutlet } from "./components/ui/AnimatedOutlet";

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

export function Layout({ children }: { children: React.ReactNode }) {
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
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <AnimatedOutlet />;
}
