# Tech Stack

## Frontend
- **Framework**: Remix (React Router v7 compatible)
- **UI Components**: Shadcn UI with Tailwind CSS
- **Animations**: Framer Motion (layout animations, route transitions)
- **Search UI**: CMDK (command palette)
- **QR Codes**: react-qr-code

## Backend / Edge
- **Compute**: Cloudflare Workers (V8 isolates)
- **Storage**: Cloudflare R2 (assets)
- **Caching**: Cloudflare Cache API

## Database & Auth
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (GoTrue)
- **Realtime**: Supabase Realtime (WebSocket)
- **Connection Pooling**: Supavisor (Transaction Mode, port 6543) + Cloudflare Hyperdrive

## Hardware Integration
- **Scanner**: Honeywell MS9520 Voyager (USB HID keyboard emulation)
- **Mobile Fallback**: BarcodeDetector API / html5-qrcode polyfill

---

## Common Commands

```bash
# Development
npm run dev          # Start Remix dev server

# Build & Deploy
npm run build        # Build for production
npm run deploy       # Deploy to Cloudflare Workers

# Database
npx supabase start   # Start local Supabase
npx supabase db push # Push schema changes
npx supabase gen types typescript --local > src/types/database.ts
```

## Key Patterns

- Use `useFetcher` for optimistic UI updates
- All stock modifications via PostgreSQL RPCs (atomic transactions)
- JWT tenant_id claim for RLS enforcement
- Debounce search queries (300ms)
- Scanner hook uses 50ms velocity threshold
