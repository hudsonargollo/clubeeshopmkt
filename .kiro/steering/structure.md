# Project Structure

```
├── app/
│   ├── components/
│   │   ├── ui/              # Shadcn UI components
│   │   ├── scanner/         # Barcode scanner components
│   │   ├── inventory/       # Inventory management UI
│   │   ├── cart/            # Shopping cart components
│   │   └── orders/          # Order management UI
│   ├── hooks/
│   │   ├── useBarcodeScanner.ts   # Global HID scanner hook
│   │   └── useSupabase.ts         # Supabase client hook
│   ├── routes/
│   │   ├── _index.tsx       # Webshop home
│   │   ├── backoffice/      # Staff inventory manager
│   │   └── api/             # API endpoints
│   ├── lib/
│   │   ├── supabase.server.ts     # Server-side Supabase client
│   │   └── tenant.ts              # Tenant resolution utilities
│   └── styles/
│       └── tailwind.css
├── supabase/
│   ├── migrations/          # Database migrations
│   └── functions/           # Edge functions
├── public/                  # Static assets
├── wrangler.toml           # Cloudflare Workers config
└── .kiro/
    ├── specs/              # Kiro specifications
    └── steering/           # AI steering rules
```

## Architecture Boundaries

| Layer | Responsibility |
|-------|----------------|
| `app/routes/` | Request handling, SSR, data loading |
| `app/components/` | Presentational UI, animations |
| `app/hooks/` | Client-side state, scanner integration |
| `app/lib/` | Server utilities, tenant resolution |
| `supabase/` | Database schema, RLS policies, RPCs |

## Multi-Tenancy

- Tenant resolved from hostname (`tenant-a.shop.com`) or path
- All tenant-specific tables include `tenant_id` column
- RLS policies enforce isolation at database level
