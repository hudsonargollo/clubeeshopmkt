# Requirements Document

## Introduction

This document specifies the requirements for expanding ClubeeShopMkt from a retail prototype into a fully functional Multi-Tenant SaaS platform. The expansion enables self-service onboarding via a landing page, Google OAuth authentication, and comprehensive backoffice management for Products, Categories, Services, and Orders.

The system builds upon the existing Edge-Native Multi-Tenant Retail Operations Platform, adding self-service tenant creation, catalog management with product/service distinction, and manual order creation (POS) capabilities.

### UI/UX Framework

The implementation follows the NextLevelBuilder UI/UX Pro Max skill guidelines with:
- **Component Library**: Shadcn UI with Tailwind CSS
- **Animation Framework**: Framer Motion for layout animations, micro-interactions, and route transitions
- **Visual Style**: Modern Glassmorphism with subtle backdrop blur effects
- **Layout Pattern**: Bento Grid for dashboard and feature showcase views
- **Design Principles**: Mobile-first, accessibility-compliant (WCAG), thumb-zone optimized navigation

## Glossary

- **Visitor**: An unauthenticated user browsing the landing page
- **Shop_Owner**: An authenticated user who owns and manages a tenant/shop
- **Tenant**: A distinct shop/business operating on the shared platform
- **Onboarding_Flow**: The process of creating a new shop after Google OAuth signup
- **Category**: A grouping mechanism for organizing inventory items
- **Physical_Product**: An inventory item with stock tracking and barcode
- **Service**: An inventory item representing a service (e.g., "Repair") with price but no stock
- **POS_Interface**: Point-of-Sale interface for staff to create orders for walk-in customers
- **Subdomain**: The unique identifier for a tenant (e.g., myshop.clubeeshop.com)

## Requirements

### Requirement 1: Landing Page

**User Story:** As a Visitor, I want to see a landing page explaining the platform, so that I can decide to sign up.

#### Acceptance Criteria

1. WHEN a visitor navigates to the root URL (/), THE Landing_Page SHALL display a hero section with value proposition and "Start for Free" call-to-action
2. THE Landing_Page SHALL display a features grid highlighting Inventory Management, Webshop, and Multi-tenancy capabilities
3. THE Landing_Page SHALL include navigation with "Login" and "Get Started" buttons
4. WHEN a visitor clicks "Get Started", THE System SHALL redirect to the Google OAuth flow
5. WHEN a visitor clicks "Login", THE System SHALL redirect to the Google OAuth flow

### Requirement 2: Google OAuth Authentication

**User Story:** As a Visitor, I want to sign up using my Google Account, so that I don't have to manage another password.

#### Acceptance Criteria

1. THE Auth_System SHALL use Supabase Auth with Google OAuth provider enabled
2. WHEN a user initiates sign-in, THE System SHALL redirect to Google's OAuth consent screen
3. WHEN Google OAuth completes successfully, THE System SHALL redirect to /auth/callback
4. THE Auth_Callback SHALL handle the OAuth code exchange and establish a session
5. IF the OAuth flow fails, THEN THE System SHALL display an error message and redirect to the landing page

### Requirement 3: New User Onboarding

**User Story:** As a New User, I want to create my own "Shop" (Tenant) by choosing a name and subdomain immediately after signing up.

#### Acceptance Criteria

1. WHEN a new user completes OAuth AND has no linked tenant, THE System SHALL redirect to /onboarding
2. THE Onboarding_Form SHALL require a "Shop Name" text field
3. THE Onboarding_Form SHALL require a "Subdomain" text field with preview (e.g., myshop.clubeeshop.com)
4. WHEN the subdomain field changes, THE System SHALL validate uniqueness in real-time
5. IF the subdomain is already taken, THEN THE System SHALL display an error and prevent submission
6. WHEN the form is submitted with valid data, THE System SHALL create a new tenant record
7. WHEN the tenant is created, THE System SHALL create a user_tenant record with role 'owner'
8. WHEN onboarding completes, THE System SHALL inject the tenant_id into the user's JWT app_metadata
9. WHEN onboarding completes, THE System SHALL redirect to /backoffice

### Requirement 4: Existing User Login

**User Story:** As an Existing User, I want to sign in with Google and be redirected to my shop's dashboard.

#### Acceptance Criteria

1. WHEN an existing user completes OAuth AND has exactly one linked tenant, THE System SHALL redirect to /backoffice
2. WHEN an existing user completes OAuth AND has multiple linked tenants, THE System SHALL redirect to /portal
3. THE Portal_Page SHALL display a list of shops the user belongs to
4. WHEN a user selects a shop from the portal, THE System SHALL update the session with that tenant_id and redirect to /backoffice

### Requirement 5: Category Management

**User Story:** As a Shop Owner, I want to manage Categories, so that I can organize my inventory.

#### Acceptance Criteria

1. THE Database SHALL include a categories table with id, tenant_id, name, slug, and created_at columns
2. THE Categories_Table SHALL enforce unique (tenant_id, slug) constraint
3. WHEN a shop owner navigates to /backoffice/categories, THE System SHALL display a list of categories
4. THE Category_List SHALL support inline creation of new categories
5. THE Category_List SHALL support editing existing category names
6. THE Category_List SHALL support deleting categories
7. WHEN a category is deleted, THE System SHALL set category_id to NULL on associated inventory items

### Requirement 6: Product and Service Types

**User Story:** As a Shop Owner, I want to create/edit/delete Physical Products and Services, so that I can manage my complete catalog.

#### Acceptance Criteria

1. THE Inventory_Table SHALL include a type column with values ('physical', 'service')
2. THE Inventory_Table SHALL include a description text column
3. THE Inventory_Table SHALL include a category_id UUID column referencing categories
4. WHEN type is 'physical', THE Product_Form SHALL require stock (>=0) and barcode fields
5. WHEN type is 'service', THE Product_Form SHALL hide stock and barcode fields
6. THE Product_Form SHALL include an image upload field
7. WHEN an image is uploaded, THE System SHALL store it in Cloudflare R2 or Supabase Storage
8. THE Barcode_Validator SHALL ensure barcodes are unique within a tenant
9. IF a duplicate barcode is submitted, THEN THE System SHALL display an error and prevent save

### Requirement 7: Order List View

**User Story:** As a Shop Owner, I want to view a list of all orders with filters, so that I can manage my business.

#### Acceptance Criteria

1. WHEN a shop owner navigates to /backoffice/orders, THE System SHALL display a table of orders
2. THE Order_Table SHALL display columns: ID, Customer (optional), Total, Status, Type, Date
3. THE Order_List SHALL include tabs for "Active", "Completed", and "Cancelled" orders
4. THE Order_List SHALL support filtering by status
5. THE Order_List SHALL support filtering by date range
6. THE Order_List SHALL support sorting by date (newest first by default)

### Requirement 8: Manual Order Creation (POS)

**User Story:** As a Shop Owner, I want to manually create an order for walk-in customers, so that I can process in-store sales.

#### Acceptance Criteria

1. WHEN a shop owner navigates to /backoffice/orders/new, THE System SHALL display the POS interface
2. THE POS_Interface SHALL allow searching products by name or barcode
3. THE POS_Interface SHALL allow scanning products via barcode scanner
4. WHEN a product is found, THE POS_Interface SHALL add it to the order cart
5. THE POS_Interface SHALL allow adjusting quantities for cart items
6. THE POS_Interface SHALL allow removing items from the cart
7. THE POS_Interface SHALL display a running total
8. THE POS_Interface SHALL allow selecting fulfillment type: "Takeout" or "Delivery"
9. WHEN checkout is initiated, THE System SHALL create an Order record
10. WHEN an order contains physical products, THE System SHALL decrement stock atomically
11. IF stock is insufficient for any item, THEN THE System SHALL reject the order and display which items are unavailable

### Requirement 9: Order Status Management

**User Story:** As a Shop Owner, I want to update order statuses, so that I can track order progress.

#### Acceptance Criteria

1. WHEN a shop owner views an order detail, THE System SHALL display a status dropdown
2. THE Status_Dropdown SHALL only show valid next states based on current status
3. WHEN a status is selected, THE System SHALL validate the transition against the state machine
4. IF the transition is invalid, THEN THE System SHALL reject the change and display an error
5. WHEN a valid transition is made, THE System SHALL update the order status and timestamp

### Requirement 10: Mobile-First Backoffice

**User Story:** As a Shop Owner using a mobile device, I want the backoffice to be usable on my phone, so that I can manage my shop while on the floor.

#### Acceptance Criteria

1. THE Backoffice_UI SHALL be responsive and usable on screens 320px and wider
2. THE Product_Form SHALL use bottom-sheet drawers on mobile instead of full-page forms
3. THE Navigation SHALL use a collapsible sidebar on desktop and bottom navigation on mobile
4. THE Touch_Targets SHALL be minimum 48px height for all interactive elements

### Requirement 11: Fast Onboarding Experience

**User Story:** As a New User, I want onboarding to be quick, so that I can start using the platform immediately.

#### Acceptance Criteria

1. THE Onboarding_Flow SHALL complete in under 60 seconds for a typical user
2. THE Subdomain_Validation SHALL respond within 500ms
3. THE Tenant_Creation SHALL complete within 2 seconds
4. THE System SHALL provide clear progress indication during onboarding

### Requirement 12: Glassmorphism Visual Design

**User Story:** As a User, I want a modern, visually appealing interface, so that the platform feels professional and trustworthy.

#### Acceptance Criteria

1. THE Landing_Page SHALL use Glassmorphism style with translucent card surfaces and backdrop blur effects
2. THE Card_Components SHALL use subtle shadows and semi-transparent backgrounds (bg-white/80 dark:bg-slate-900/80)
3. THE UI SHALL support adaptive dark/light themes via Tailwind CSS variables
4. THE Color_Palette SHALL use a cohesive SaaS-appropriate scheme with primary, secondary, and accent colors
5. THE Typography SHALL use a clear hierarchy with system font stack (48px headers, 16px body minimum)

### Requirement 13: Bento Grid Layout

**User Story:** As a Visitor viewing the landing page, I want features presented in an organized grid, so that I can quickly understand the platform's capabilities.

#### Acceptance Criteria

1. THE Features_Section SHALL use a Bento Grid layout with varying card sizes
2. THE Bento_Grid SHALL arrange cards in a visually balanced asymmetric pattern
3. THE Grid_Cards SHALL contain icons, titles, and brief descriptions
4. THE Layout SHALL be responsive, collapsing to single column on mobile

### Requirement 14: Framer Motion Animations

**User Story:** As a User, I want smooth animations throughout the interface, so that interactions feel polished and responsive.

#### Acceptance Criteria

1. THE Route_Transitions SHALL animate using AnimatePresence with fade and slide effects
2. THE Card_Components SHALL animate on hover with subtle lift effect (translateY -2px)
3. THE Button_Components SHALL animate on press with scale effect (0.95)
4. THE Form_Submissions SHALL display loading states with animated spinners
5. THE Success_States SHALL animate with pulse or checkmark effects
6. THE Error_States SHALL animate with horizontal shake effect
7. THE Modal_Drawers SHALL animate with slide-up entrance from bottom on mobile

### Requirement 15: Shadcn UI Component Usage

**User Story:** As a Developer, I want consistent UI components, so that the interface is maintainable and accessible.

#### Acceptance Criteria

1. THE System SHALL use Shadcn UI Button component for all interactive buttons
2. THE System SHALL use Shadcn UI Card component for content containers
3. THE System SHALL use Shadcn UI Input component for form fields with proper label association
4. THE System SHALL use Shadcn UI Drawer component for mobile bottom sheets
5. THE System SHALL use Shadcn UI Select component for dropdowns including status selection
6. THE System SHALL use Shadcn UI Table component for order and category lists
7. THE System SHALL use Shadcn UI Tabs component for order status filtering
8. THE System SHALL use Sonner (Toast) for notifications and feedback
9. ALL interactive components SHALL have visible focus rings for keyboard navigation
10. ALL components SHALL include appropriate ARIA labels for screen readers

### Requirement 16: Visual Distinction for Services

**User Story:** As a Shop Owner viewing my catalog, I want Services visually distinguished from Products, so that I can quickly identify item types.

#### Acceptance Criteria

1. THE Product_List SHALL display a distinct icon for Services (e.g., wrench or tool icon)
2. THE Product_List SHALL display a distinct icon for Physical Products (e.g., box or package icon)
3. THE Service_Cards SHALL use a different accent color or badge to indicate type
4. THE Product_Form SHALL visually toggle between Product and Service modes with clear indication

