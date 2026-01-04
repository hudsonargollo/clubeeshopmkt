import type { MetaFunction } from "@remix-run/cloudflare";

export const meta: MetaFunction = () => {
  return [
    { title: "ClubeeShopMkt - Retail Operations Platform" },
    {
      name: "description",
      content: "Edge-native multi-tenant retail operations platform",
    },
  ];
};

export default function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          ClubeeShopMkt
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Edge-Native Multi-Tenant Retail Operations Platform
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <a
            href="/backoffice"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Backoffice
          </a>
          <a
            href="/shop"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Webshop
          </a>
        </div>
      </div>
    </div>
  );
}
