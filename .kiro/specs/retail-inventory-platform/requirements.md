# Requirements Document

## Introduction

This document specifies the requirements for an Edge-Native Multi-Tenant Retail Operations Platform consisting of a Product Inventory Manager (backoffice) and a Frontend Webshop. The platform leverages Cloudflare Workers for edge computation, Supabase for persistence and real-time synchronization, and a mobile-first frontend powered by Remix, Framer Motion, and Shadcn UI.

The system integrates the Honeywell MS9520 Voyager barcode scanner via USB HID keyboard emulation, with mobile camera fallback using the BarcodeDetector API.

## Glossary

- **Tenant**: A distinct shop/business operating on the shared platform, identified by subdomain or path
- **Inventory_Manager**: The backoffice system for staff to manage inventory via barcode scanning
- **Webshop**: The customer-facing mobile-first storefront for browsing and ordering
- **Scanner_Hook**: The React hook that intercepts HID keyboard events from the barcode scanner
- **RLS**: Row Level Security - PostgreSQL feature enforcing tenant data isolation
- **Realtime_Engine**: Supabase's WebSocket-based system for broadcasting database changes
- **Hyperdrive**: Cloudflare's connection pooling mechanism for database connections
- **Supavisor**: Supabase's connection pooler operating in Transaction Mode
- **Pickup_Code**: Short alphanumeric code for takeout order identification
- **FTS**: Full Text Search using PostgreSQL tsvector/tsquery

## Requirements

### Requirement 1: Multi-Tenant Architecture

**User Story:** As a platform operator, I want multiple shops to operate on a single platform instance, so that I can efficiently manage infrastructure while maintaining strict data isolation.

#### Acceptance Criteria

1. WHEN a request arrives, THE Tenant_Resolver SHALL determine the tenant from the hostname subdomain or URL path
2. THE Database SHALL enforce tenant isolation via Row Level Security policies on all tenant-specific tables
3. WHEN a user authenticates, THE Auth_System SHALL inject the tenant_id into the JWT app_metadata claim
4. FOR ALL database queries on tenant-specific tables, THE RLS_Policy SHALL automatically filter rows by the authenticated user's tenant_id
5. THE Schema SHALL include a tenant_id UUID column on all tenant-specific tables (inventory, orders, products)

### Requirement 2: Barcode Scanner Integration

**User Story:** As a shop staff member, I want to scan barcodes without clicking on input fields first, so that I can efficiently process inventory and orders hands-free.

#### Acceptance Criteria

1. THE Scanner_Hook SHALL listen to global window.onkeydown events regardless of current focus
2. WHEN keystrokes arrive with inter-character latency below 50ms, THE Scanner_Hook SHALL accumulate them in a buffer
3. WHEN inter-keystroke latency exceeds 50ms, THE Scanner_Hook SHALL clear the buffer as human typing noise
4. WHEN ASCII 13 (Carriage Return) is detected AND buffer length exceeds 3 characters, THE Scanner_Hook SHALL dispatch an onScan event
5. WHILE focus is on an input or textarea element, THE Scanner_Hook SHALL pass-through events to avoid double-entry
6. THE Scanner_Hook SHALL validate scanned data against expected barcode patterns before dispatching

### Requirement 3: Mobile Camera Fallback

**User Story:** As a delivery driver using a smartphone, I want to scan barcodes using my camera, so that I can process orders without USB hardware.

#### Acceptance Criteria

1. WHEN the BarcodeDetector API is available, THE Camera_Scanner SHALL use native hardware-accelerated scanning
2. WHEN the BarcodeDetector API is unavailable, THE Camera_Scanner SHALL fall back to html5-qrcode WebAssembly library
3. WHEN a barcode is detected via camera, THE Camera_Scanner SHALL invoke the same handleItemScan function as the USB scanner
4. THE Camera_Scanner SHALL support UPC, EAN, Code128, and QR code formats

### Requirement 4: Real-Time Inventory Synchronization

**User Story:** As a shop owner, I want inventory changes to appear instantly across all connected clients, so that staff and customers always see accurate stock levels.

#### Acceptance Criteria

1. THE Webshop AND Inventory_Manager SHALL subscribe to PostgreSQL UPDATE events on the inventory table via Supabase Realtime
2. WHEN an inventory change is committed, THE Realtime_Engine SHALL broadcast the change to all subscribed clients within 500ms
3. THE Realtime subscription SHALL filter events by tenant_id to maintain tenant isolation
4. WHEN a stock update is received, THE UI SHALL update the local state without requiring a page refresh

### Requirement 5: Atomic Stock Management

**User Story:** As a shop owner, I want stock levels to never go negative even under concurrent orders, so that I don't oversell products.

#### Acceptance Criteria

1. THE Database SHALL provide a decrement_stock RPC function that atomically checks and updates stock
2. WHEN decrement_stock is called, THE Function SHALL only succeed if current stock >= requested quantity
3. IF stock is insufficient, THEN THE Function SHALL return false without modifying the database
4. FOR ALL stock modifications, THE System SHALL use the RPC function rather than client-side read-modify-write

### Requirement 6: Edge Hosting and Performance

**User Story:** As a customer, I want the webshop to load quickly on mobile networks, so that I can browse and order without frustration.

#### Acceptance Criteria

1. THE Application SHALL run on Cloudflare Workers using V8 isolates for single-digit millisecond cold starts
2. THE Worker SHALL perform server-side rendering of the webshop for optimal First Contentful Paint
3. THE Worker SHALL stream HTML responses to allow progressive browser parsing
4. WHEN a product catalog request arrives, THE Worker SHALL serve from edge cache if available
5. WHEN inventory is updated, THE System SHALL purge the relevant product cache entries

### Requirement 7: Database Connection Management

**User Story:** As a platform operator, I want the system to handle thousands of concurrent serverless instances without exhausting database connections.

#### Acceptance Criteria

1. THE System SHALL connect to Supabase via Supavisor on port 6543 (Transaction Mode)
2. THE Worker SHALL use Cloudflare Hyperdrive for connection pooling and latency reduction
3. WHEN a transaction completes, THE Connection_Pooler SHALL immediately return the connection to the pool
4. THE System SHALL NOT use Session Mode (port 5432) for serverless connections

### Requirement 8: Takeout Order Workflow

**User Story:** As a customer, I want to place a takeout order and pick it up by showing a QR code, so that I can quickly collect my order without waiting.

#### Acceptance Criteria

1. WHEN a customer selects Takeout, THE System SHALL generate a unique order_id and short pickup_code
2. THE System SHALL generate a QR code containing the order_id using react-qr-code
3. WHEN staff scans the customer's QR code, THE Scanner_Hook SHALL detect the Order ID format
4. WHEN an Order ID is scanned, THE System SHALL navigate to the Order Detail drawer for verification
5. THE Staff SHALL be able to mark the order as Completed with a single tap after verification

### Requirement 9: Delivery Order Workflow

**User Story:** As a customer, I want to place a delivery order with address validation, so that my order arrives at the correct location.

#### Acceptance Criteria

1. WHEN a customer selects Delivery, THE System SHALL display an address autocomplete component
2. THE Address_Validator SHALL integrate with Google Maps or Mapbox for address validation
3. WHEN a delivery order is placed, THE System SHALL add it to the Processing queue
4. THE Backoffice SHALL display a Delivery Dashboard with orders grouped by neighborhood or route

### Requirement 10: Global Search

**User Story:** As a staff member, I want to quickly find products by name, category, or barcode, so that I can efficiently manage inventory.

#### Acceptance Criteria

1. THE Database SHALL maintain a Full Text Search index on inventory (name, category, barcode)
2. WHEN a user types in the search palette, THE System SHALL debounce queries by 300ms
3. THE Search_Results SHALL highlight matching text portions in the results
4. THE Search_Palette SHALL support keyboard navigation (arrow keys, Enter)
5. WHEN a barcode is scanned while search is open, THE System SHALL jump directly to that item

### Requirement 11: Mobile-First UI

**User Story:** As a mobile user, I want the interface optimized for one-handed use, so that I can operate the app comfortably on my phone.

#### Acceptance Criteria

1. THE Navigation SHALL use a Bottom Dock pattern with touch targets minimum 48px height
2. THE System SHALL use bottom-sheet Drawers instead of center-screen modals for editing tasks
3. WHEN an item is added to cart, THE UI SHALL animate the item flying to the cart icon using Framer Motion layoutId
4. THE Route_Transitions SHALL animate smoothly using AnimatePresence with the Remix Outlet

### Requirement 12: Optimistic UI Updates

**User Story:** As a user, I want the interface to feel instant even on slow networks, so that scanning and cart operations feel responsive.

#### Acceptance Criteria

1. WHEN a scan event occurs, THE UI SHALL immediately update local state before server confirmation
2. WHILE awaiting server confirmation, THE UI SHALL display a subtle syncing indicator
3. WHEN the server confirms the update, THE UI SHALL remove the syncing indicator
4. IF the server returns an error, THEN THE UI SHALL revert the optimistic update and display an error toast

### Requirement 13: Authentication and Security

**User Story:** As a platform operator, I want secure authentication with tenant-aware sessions, so that users can only access their authorized shop data.

#### Acceptance Criteria

1. THE System SHALL use Supabase Auth (GoTrue) for identity management
2. WHEN a user logs in, THE Auth_System SHALL look up their tenant assignment and inject tenant_id into JWT
3. THE Worker SHALL validate JWT signatures at the edge before forwarding requests to the database
4. IF a JWT is invalid, THEN THE Worker SHALL reject the request without contacting the database
5. THE System SHALL implement rate limiting per IP address on login and search endpoints

### Requirement 14: Order Data Model

**User Story:** As a developer, I want a clear data model for orders supporting both fulfillment types, so that the system can track order state correctly.

#### Acceptance Criteria

1. THE Orders_Table SHALL include a type enum with values (takeout, delivery)
2. THE Orders_Table SHALL include a status enum with values (pending, paid, processing, ready, completed)
3. THE Orders_Table SHALL include a fulfillment_data JSONB column for address or pickup time
4. THE Orders_Table SHALL include a pickup_code text column for takeout identification
5. FOR ALL order state transitions, THE System SHALL validate the transition is valid for the current state

### Requirement 15: Presence for Collision Prevention

**User Story:** As a backoffice administrator, I want to see when another admin is editing a product, so that we don't overwrite each other's changes.

#### Acceptance Criteria

1. WHEN an admin opens a product edit form, THE System SHALL broadcast a join event to the product's presence channel
2. THE UI SHALL display a visual indicator showing which users are currently editing
3. THE System MAY optionally lock the Save button while another user has the write lock
4. WHEN an admin closes the edit form, THE System SHALL broadcast a leave event
