# Implementation Plan: Edge-Native Multi-Tenant Retail Operations Platform

## Overview

This implementation plan breaks down the retail platform into incremental coding tasks. Each task builds on previous work, with property-based tests validating correctness properties from the design document. The stack uses Remix on Cloudflare Workers, Supabase with RLS, Shadcn UI, and Framer Motion.

## Tasks

- [x] 1. Project Setup and Infrastructure
  - [x] 1.1 Initialize Remix project with Cloudflare Workers template
    - Configure wrangler.toml for Workers deployment
    - Set up Tailwind CSS and Shadcn UI
    - Install dependencies: framer-motion, @supabase/supabase-js, fast-check
    - _Requirements: 6.1_

  - [x] 1.2 Configure Supabase connection with Hyperdrive
    - Create supabase.server.ts with connection pooling via port 6543
    - Set up environment variables for Supabase URL and anon key
    - Configure Hyperdrive binding in wrangler.toml
    - _Requirements: 7.1, 7.2_

- [x] 2. Database Schema and Multi-Tenancy
  - [x] 2.1 Create database migrations for core tables
    - Create tenants table with id, name, subdomain, settings
    - Create inventory table with tenant_id, barcode, name, category, stock, price
    - Create orders table with tenant_id, type enum, status enum, fulfillment_data JSONB
    - Create order_items junction table
    - Create user_tenants many-to-many table
    - Add indexes on barcode, tenant_id, pickup_code
    - _Requirements: 1.5, 14.1, 14.2, 14.3, 14.4_

  - [x] 2.2 Implement Row Level Security policies
    - Create tenant_isolation policy on inventory table
    - Create tenant_isolation policy on orders table
    - Create tenant_isolation policy on order_items table
    - Ensure policies use auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    - _Requirements: 1.2, 1.4_

  - [x]* 2.3 Write property test for tenant isolation
    - **Property 1: Tenant Isolation Invariant**
    - Generate random tenant pairs and verify cross-tenant queries return empty
    - **Validates: Requirements 1.2, 1.4**

  - [x] 2.4 Create Full-Text Search index on inventory
    - Add fts tsvector generated column
    - Create GIN index on fts column
    - _Requirements: 10.1_

- [x] 3. Authentication and Tenant Resolution
  - [x] 3.1 Implement tenant resolution utilities
    - Create lib/tenant.ts with fromHostname and fromPath resolvers
    - Extract subdomain from hostname (tenant-a.shop.com)
    - Extract tenant from path (/shop/tenant-a/...)
    - _Requirements: 1.1_

  - [x] 3.2 Configure Supabase Auth with tenant injection
    - Create auth trigger to inject tenant_id into JWT app_metadata
    - Set up user_tenants lookup on authentication
    - _Requirements: 1.3, 13.1, 13.2_

  - [ ]* 3.3 Write property test for JWT tenant injection
    - **Property 14: JWT Tenant Injection**
    - Generate random user/tenant pairs and verify JWT contains correct tenant_id
    - **Validates: Requirements 1.3, 13.2**

  - [x] 3.4 Implement JWT validation middleware in Worker
    - Validate JWT signature at edge before database access
    - Reject invalid tokens with 401 response
    - _Requirements: 13.3, 13.4_

- [x] 4. Checkpoint - Database and Auth Foundation
  - Ensure all migrations apply successfully
  - Verify RLS policies block cross-tenant access
  - Ensure all tests pass, ask the user if questions arise

- [x] 5. Barcode Scanner Integration
  - [x] 5.1 Implement useBarcodeScanner hook
    - Create hooks/useBarcodeScanner.ts
    - Implement global window.onkeydown listener
    - Implement velocity threshold (50ms) buffer accumulation
    - Implement ASCII 13 terminator detection
    - Implement document.activeElement passthrough for inputs
    - Implement barcode pattern validation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x]* 5.2 Write property test for scanner velocity discrimination
    - **Property 2: Scanner Velocity Discrimination**
    - Generate keystroke sequences with controlled timing
    - Verify fast sequences (<50ms) emit onScan, slow sequences clear buffer
    - **Validates: Requirements 2.2, 2.3, 2.4**

  - [x]* 5.3 Write property test for scanner input passthrough
    - **Property 3: Scanner Input Passthrough**
    - Generate keystrokes while focus is on input elements
    - Verify buffer does not accumulate
    - **Validates: Requirements 2.5**

  - [x] 5.4 Implement CameraScanner component
    - Create components/scanner/CameraScanner.tsx
    - Feature detect BarcodeDetector API
    - Implement html5-qrcode fallback
    - Support UPC, EAN, Code128, QR formats
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 5.5 Create unified handleItemScan handler
    - Create shared scan handler function (lib/scanHandler.ts)
    - Create useUnifiedScanner hook to wire both scanner types
    - Wire both USB scanner hook and camera scanner to same handler
    - _Requirements: 3.3_

  - [ ]* 5.6 Write property test for unified scan handler
    - **Property 4: Unified Scan Handler**
    - Verify both scanner types invoke identical handler
    - **Validates: Requirements 3.3**

- [x] 6. Inventory Management
  - [x] 6.1 Create atomic stock management RPCs
    - Create decrement_stock PostgreSQL function
    - Create increment_stock PostgreSQL function
    - Create set_stock PostgreSQL function
    - Ensure atomic check-and-update with stock >= quantity constraint
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x]* 6.2 Write property test for stock non-negativity
    - **Property 5: Stock Non-Negativity Invariant**
    - Generate concurrent decrement operations
    - Verify stock never goes negative
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [ ]* 6.3 Write property test for atomic stock decrement
    - **Property 6: Atomic Stock Decrement**
    - Generate valid decrement operations
    - Verify exact quantity reduction and true return
    - **Validates: Requirements 5.1, 5.2**

  - [x] 6.4 Implement inventory API routes
    - Create routes/api.inventory.scan.ts for scan processing
    - Create routes/api.inventory.search.ts for FTS queries
    - Implement client-side 300ms debounce via useInventorySearch hook
    - _Requirements: 10.2_

  - [ ]* 6.5 Write property test for search debounce
    - **Property 11: Search Debounce Behavior**
    - Generate rapid keystroke sequences
    - Verify at most one query per 300ms window
    - **Validates: Requirements 10.2**

  - [ ]* 6.6 Write property test for full-text search round trip
    - **Property 12: Full-Text Search Round Trip**
    - Generate inventory items with random names/categories
    - Verify searching for any word returns the item
    - **Validates: Requirements 10.1**

- [x] 7. Checkpoint - Core Inventory Logic
  - Verify scanner hook captures barcodes correctly
  - Verify stock operations are atomic
  - Verify search returns expected results
  - Ensure all tests pass, ask the user if questions arise

- [x] 8. Real-Time Synchronization
  - [x] 8.1 Implement Realtime subscription manager
    - Create hooks/useRealtimeInventory.ts
    - Subscribe to inventory UPDATE events with tenant_id filter
    - Update local state on broadcast receipt
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x]* 8.2 Write property test for realtime tenant filtering
    - **Property 7: Realtime Tenant Filtering**
    - Create subscriptions for multiple tenants
    - Verify events only reach matching tenant subscribers
    - **Validates: Requirements 4.3**

  - [x] 8.3 Implement Presence for edit collision prevention
    - Create hooks/usePresence.ts
    - Broadcast join event on edit form open
    - Broadcast leave event on edit form close
    - Display editing indicator in UI
    - _Requirements: 15.1, 15.2, 15.4_

- [x] 9. Order Management
  - [x] 9.1 Implement order state machine
    - Create lib/orderStateMachine.ts
    - Define valid transitions: pending→paid→processing→ready→completed
    - Implement transition validation function
    - _Requirements: 14.5_

  - [x]* 9.2 Write property test for order state machine validity
    - **Property 10: Order State Machine Validity**
    - Generate random transition sequences
    - Verify only valid transitions succeed
    - **Validates: Requirements 14.5**

  - [x] 9.3 Implement takeout order workflow
    - Install react-qr-code dependency
    - Generate unique pickup_code on order creation
    - Generate QR code with order_id using react-qr-code
    - Detect Order ID format in scanner hook (already implemented in scanHandler.ts)
    - Navigate to Order Detail drawer on scan
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x]* 9.4 Write property test for QR code round trip
    - **Property 13: QR Code Round Trip**
    - Generate random order IDs
    - Verify QR encode → scan → decode returns same ID
    - **Validates: Requirements 8.2, 8.3**

  - [x] 9.5 Implement delivery order workflow
    - Create address autocomplete component with Mapbox/Google Maps
    - Add delivery orders to Processing queue
    - Create Delivery Dashboard with neighborhood grouping
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 10. Checkpoint - Order Workflows
  - Verify takeout QR code flow works end-to-end
  - Verify delivery address validation
  - Verify order state transitions
  - Ensure all tests pass, ask the user if questions arise

- [x] 11. Mobile-First UI Components
  - [x] 11.1 Set up additional Shadcn UI components
    - Install and configure Card, Input, Drawer, Command, Toast (Sonner)
    - Button component already exists
    - Configure Tailwind theme with design tokens
    - Set up dark/light mode support
    - _Requirements: 11.1, 11.2_

  - [x] 11.2 Implement Bottom Dock navigation
    - Create components/ui/BottomDock.tsx
    - Add Scan, Search, Cart, Orders icons using lucide-react
    - Ensure 48px minimum touch targets
    - Position in thumb zone
    - _Requirements: 11.1_

  - [x] 11.3 Implement Command palette search
    - Install cmdk package
    - Create components/ui/SearchPalette.tsx using CMDK
    - Integrate with useInventorySearch hook
    - Implement keyboard navigation (arrows, Enter)
    - Highlight matching text in results
    - Handle barcode scan while search is open
    - _Requirements: 10.3, 10.4, 10.5_

  - [x] 11.4 Implement Drawer components for mobile editing
    - Create inventory edit drawer
    - Create order detail drawer
    - Create cart drawer
    - _Requirements: 11.2_

- [x] 12. Framer Motion Animations
  - [x] 12.1 Implement layout animations for cart
    - Add layoutId to product cards
    - Animate item "flying" to cart on add
    - Configure spring physics (stiffness: 300, damping: 30)
    - _Requirements: 11.3_

  - [x] 12.2 Implement route transitions (DONE)
    - Created AnimatedOutlet component wrapping Remix Outlet with AnimatePresence
    - Configured enter/exit animations (opacity, x translation)
    - Uses location.pathname as key
    - Updated root.tsx to use AnimatedOutlet
    - _Requirements: 11.4_

  - [x] 12.3 Implement micro-interactions
    - Button press scale animation
    - Card hover lift effect
    - Scan success pulse animation
    - Error shake animation
    - Loading skeleton shimmer

- [x] 13. Optimistic UI
  - [x] 13.1 Implement optimistic update pattern
    - Create useOptimisticState hook
    - Update local state immediately on scan
    - Display sync indicator while pending
    - Remove indicator on server confirmation
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ]* 13.2 Write property test for optimistic UI consistency
    - **Property 8: Optimistic UI Consistency**
    - Generate update sequences with server confirmations
    - Verify final state matches server state
    - **Validates: Requirements 12.1, 12.3**

  - [x] 13.3 Implement error rollback
    - Revert optimistic update on server error
    - Display error toast via Sonner
    - _Requirements: 12.4_

  - [ ]* 13.4 Write property test for optimistic UI rollback
    - **Property 9: Optimistic UI Rollback**
    - Generate updates followed by server errors
    - Verify state reverts to pre-update
    - **Validates: Requirements 12.4**

- [x] 14. Edge Caching and Performance
  - [x] 14.1 Implement edge caching for product catalog
    - Use Cloudflare Cache API for GET requests
    - Set appropriate cache headers
    - _Requirements: 6.4_

  - [x] 14.2 Implement cache invalidation on inventory update
    - Trigger cache purge when stock changes
    - Use Supabase webhook or Edge Function
    - _Requirements: 6.5_

  - [x] 14.3 Implement SSR and streaming
    - Configure Remix for streaming responses
    - Ensure proper meta tags for SEO
    - _Requirements: 6.2, 6.3_

- [x] 15. Security Hardening
  - [x] 15.1 Implement rate limiting
    - Rate limiting already implemented in api.inventory.search.ts
    - Limit search queries per tenant (5 per second)
    - _Requirements: 13.5_

  - [x] 15.2 Extend rate limiting to login endpoints
    - Add rate limiting middleware to Worker for login attempts
    - Limit login attempts per IP
    - _Requirements: 13.5_

  - [x] 15.3 Configure Cloudflare WAF rules
    - Block common attack patterns (SQLi, XSS)
    - Document WAF configuration

- [x] 16. Final Checkpoint - Complete System
  - All core implementation tasks completed
  - Optional property-based tests available for additional validation
  - Run `npm run build` to verify build succeeds
  - Run `npm run dev` to test locally
  - Deploy with `npm run deploy` to Cloudflare Workers

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each property test references specific properties from the design document
- Use fast-check for property-based testing with minimum 100 iterations
- Checkpoints ensure incremental validation before proceeding
- All stock modifications must use PostgreSQL RPCs, never client-side read-modify-write
- framer-motion, lucide-react, and html5-qrcode are already installed
