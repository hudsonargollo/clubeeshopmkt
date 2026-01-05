# Implementation Plan: SaaS Expansion & Core Management

## Overview

This implementation plan transforms ClubeeShopMkt from a retail prototype into a Multi-Tenant SaaS platform. Tasks are organized to build incrementally: database schema first, then authentication/onboarding, followed by catalog management, and finally order/POS features.

## Tasks

- [x] 1. Database Schema Updates
  - [x] 1.1 Create migration file for categories table and inventory updates
    - Create `supabase/migrations/20240105000000_saas_expansion.sql`
    - Add categories table with tenant_id, name, slug, created_at
    - Add UNIQUE constraint on (tenant_id, slug)
    - Add RLS policy for tenant isolation
    - _Requirements: 5.1, 5.2_

  - [x] 1.2 Update inventory table schema
    - Add `type` column with CHECK constraint ('physical', 'service')
    - Add `description` TEXT column
    - Add `category_id` UUID column with FK to categories
    - Create index on category_id
    - Update FTS index to include description
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 1.3 Write property test for category slug uniqueness per tenant
    - **Property 6: Category Slug Uniqueness Per Tenant**
    - **Validates: Requirements 5.2**

  - [ ]* 1.4 Write property test for barcode uniqueness per tenant
    - **Property 9: Barcode Uniqueness Per Tenant**
    - **Validates: Requirements 6.8, 6.9**

- [x] 2. Authentication & Onboarding
  - [x] 2.1 Configure Google OAuth in Supabase Auth
    - Update Supabase project settings for Google OAuth provider
    - Create `app/routes/auth.callback.tsx` for OAuth code exchange
    - Handle session establishment and error cases
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.2 Implement post-auth routing logic
    - Query user_tenants count after authentication
    - Route to /onboarding if count === 0
    - Route to /backoffice if count === 1
    - Route to /portal if count > 1
    - _Requirements: 3.1, 4.1, 4.2_

  - [ ]* 2.3 Write property test for post-authentication routing
    - **Property 1: Post-Authentication Routing**
    - **Validates: Requirements 3.1, 4.1, 4.2**

  - [x] 2.4 Create onboarding page and form
    - Create `app/routes/onboarding.tsx`
    - Build OnboardingForm component with shop name and subdomain fields
    - Implement real-time subdomain uniqueness validation
    - Add Glassmorphism styling and Framer Motion animations
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 11.2_

  - [ ]* 2.5 Write property test for subdomain uniqueness
    - **Property 2: Subdomain Uniqueness**
    - **Validates: Requirements 3.4, 3.5**

  - [x] 2.6 Implement tenant creation on onboarding submit
    - Create tenant record with name and subdomain
    - Create user_tenant record with role 'owner'
    - Inject tenant_id into JWT app_metadata
    - Redirect to /backoffice on success
    - _Requirements: 3.6, 3.7, 3.8, 3.9, 11.3_

  - [ ]* 2.7 Write property test for onboarding creates tenant with owner
    - **Property 3: Onboarding Creates Tenant with Owner**
    - **Validates: Requirements 3.6, 3.7**

  - [x] 2.8 Create shop portal page for multi-tenant users
    - Create `app/routes/portal.tsx`
    - Display list of user's shops with selection
    - Update session with selected tenant_id
    - Redirect to /backoffice after selection
    - _Requirements: 4.3, 4.4_

  - [ ]* 2.9 Write property test for tenant selection updates session
    - **Property 5: Tenant Selection Updates Session**
    - **Validates: Requirements 4.4**

- [x] 3. Checkpoint - Auth & Onboarding
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Landing Page
  - [x] 4.1 Rebuild landing page with marketing layout
    - Replace existing `app/routes/_index.tsx`
    - Create Hero section with value proposition and CTAs
    - Add "Start for Free" and "Login" buttons linking to OAuth
    - Implement Glassmorphism styling with gradient background
    - Add Framer Motion entrance animations
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 12.1_

  - [x] 4.2 Build Features Bento Grid component
    - Create BentoGrid component with varying card sizes
    - Add feature cards for Inventory, Webshop, Multi-tenancy, POS, Services, Categories
    - Implement staggered entrance animations
    - Make responsive (single column on mobile)
    - _Requirements: 1.2, 13.1, 13.2, 13.3, 13.4_

- [x] 5. Category Management
  - [x] 5.1 Create categories API routes
    - Create `app/routes/api.categories.ts`
    - Implement CRUD operations (list, create, update, delete)
    - Auto-generate slug from name
    - Enforce tenant isolation via RLS
    - _Requirements: 5.3, 5.4, 5.5, 5.6_

  - [x] 5.2 Build CategoryManager component
    - Create `app/components/inventory/CategoryManager.tsx`
    - Implement inline list with add/edit/delete functionality
    - Use Shadcn UI Table and Input components
    - Add optimistic updates with useFetcher
    - _Requirements: 5.4, 5.5, 5.6, 15.6_

  - [x] 5.3 Create categories backoffice page
    - Create `app/routes/backoffice.categories.tsx`
    - Integrate CategoryManager component
    - Add page transitions with Framer Motion
    - _Requirements: 5.3_

  - [ ]* 5.4 Write property test for category deletion cascades to inventory
    - **Property 7: Category Deletion Cascades to Inventory**
    - **Validates: Requirements 5.7**

- [x] 6. Product/Service Catalog
  - [x] 6.1 Update inventory API for type and category support
    - Modify `app/routes/api.catalog.ts` or create new
    - Add type field handling ('physical' | 'service')
    - Add category_id field handling
    - Add description field handling
    - Implement barcode uniqueness validation per tenant
    - _Requirements: 6.1, 6.2, 6.3, 6.8, 6.9_

  - [x] 6.2 Build ProductForm component with type toggle
    - Create `app/components/inventory/ProductForm.tsx`
    - Implement type toggle (Physical Product vs Service)
    - Show/hide barcode and stock fields based on type
    - Add category dropdown using Shadcn Select
    - Add image upload with preview
    - Use Drawer component on mobile
    - _Requirements: 6.4, 6.5, 6.6, 10.2, 15.4, 15.5_

  - [ ]* 6.3 Write property test for physical product validation
    - **Property 8: Physical Product Validation**
    - **Validates: Requirements 6.4**

  - [x] 6.4 Implement image upload to Cloudflare R2
    - Create upload endpoint or use Supabase Storage
    - Store images with tenant_id prefix path
    - Return public URL for display
    - _Requirements: 6.7_

  - [x] 6.5 Update inventory list to show product/service distinction
    - Add type icons (Package for physical, Wrench for service)
    - Add "Service" badge for service items
    - Add purple accent for service cards
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 6.6 Create/update inventory backoffice pages
    - Update `app/routes/backoffice.inventory._index.tsx` for list view
    - Create `app/routes/backoffice.inventory.new.tsx` for new product
    - Create `app/routes/backoffice.inventory.$id.tsx` for edit product
    - Integrate ProductForm component
    - _Requirements: 6.4, 6.5_

- [x] 7. Checkpoint - Catalog Management
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Order List View
  - [x] 8.1 Build OrderList component with tabs and filters
    - Create `app/components/orders/OrderList.tsx`
    - Implement tabs: Active, Completed, Cancelled
    - Add date range filter
    - Add status filter dropdown
    - Use Shadcn Table, Tabs, and Select components
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 15.6, 15.7_

  - [ ]* 8.2 Write property test for order list filtering and sorting
    - **Property 10: Order List Filtering and Sorting**
    - **Validates: Requirements 7.4, 7.5, 7.6**

  - [x] 8.3 Create orders backoffice page
    - Create `app/routes/backoffice.orders._index.tsx`
    - Integrate OrderList component
    - Add sorting by date (newest first default)
    - _Requirements: 7.1, 7.6_

- [x] 9. POS Interface (Manual Order Creation)
  - [x] 9.1 Build POSInterface component
    - Create `app/components/orders/POSInterface.tsx`
    - Implement product search by name/barcode
    - Integrate barcode scanner hook
    - Build cart with add/remove/quantity adjustment
    - Display running total
    - Add fulfillment type selector (Takeout/Delivery)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [ ]* 9.2 Write property test for POS product search
    - **Property 11: POS Product Search**
    - **Validates: Requirements 8.2**

  - [ ]* 9.3 Write property test for POS cart state management
    - **Property 12: POS Cart State Management**
    - **Validates: Requirements 8.4, 8.5, 8.6, 8.7**

  - [x] 9.4 Implement POS checkout with stock validation
    - Create order record on checkout
    - Decrement stock atomically for physical products
    - Validate stock availability before order creation
    - Return error with unavailable items if stock insufficient
    - _Requirements: 8.9, 8.10, 8.11_

  - [ ]* 9.5 Write property test for POS order creation
    - **Property 13: POS Order Creation**
    - **Validates: Requirements 8.9**

  - [ ]* 9.6 Write property test for POS stock validation
    - **Property 14: POS Stock Validation**
    - **Validates: Requirements 8.11**

  - [x] 9.7 Create new order backoffice page
    - Create `app/routes/backoffice.orders.new.tsx`
    - Integrate POSInterface component
    - Add success/error feedback with Sonner toast
    - _Requirements: 8.1, 15.8_

- [x] 10. Order Status Management
  - [x] 10.1 Complete OrderDetailDrawer component with status management
    - Complete `app/components/orders/OrderDetailDrawer.tsx` (currently incomplete)
    - Display order items and totals
    - Add status dropdown with valid transitions only
    - Implement status change with validation
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 10.2 Write property test for valid status transitions display
    - **Property 15: Valid Status Transitions Display**
    - **Validates: Requirements 9.2**

  - [x] 10.3 Create order detail backoffice page
    - Create `app/routes/backoffice.orders.$id.tsx`
    - Integrate OrderDetailDrawer component
    - Add status badge colors per design
    - _Requirements: 9.1_

- [x] 11. Checkpoint - Orders & POS
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Mobile-First & Animation Polish
  - [x] 12.1 Implement responsive navigation
    - BottomDock component exists with 48px touch targets
    - Bottom navigation on mobile implemented
    - _Requirements: 10.1, 10.3, 10.4_

  - [x] 12.2 Add PageTransition wrapper component
    - AnimatedOutlet component exists with AnimatePresence
    - Implements fade/slide effects for route transitions
    - _Requirements: 14.1_

  - [x] 12.3 Add micro-interaction animations
    - AnimatedButton with scale effect (0.95) implemented
    - AnimatedCard with hover lift effect implemented
    - Skeleton loading components implemented
    - ScanSuccess pulse/checkmark animations implemented
    - ShakeContainer error shake animations implemented
    - Drawer slide-up on mobile (via Shadcn Drawer)
    - _Requirements: 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [x] 12.4 Ensure accessibility compliance
    - Add visible focus rings to all interactive elements
    - Add ARIA labels to all components
    - Test keyboard navigation
    - _Requirements: 15.9, 15.10_

- [x] 13. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all requirements are implemented
  - Test complete user flows: onboarding, catalog management, POS checkout

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Use fast-check for property-based testing with minimum 100 iterations
