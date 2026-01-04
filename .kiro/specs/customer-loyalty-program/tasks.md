# Implementation Plan: Customer Loyalty Program

## Overview

This plan implements the customer loyalty program feature in incremental steps, starting with database schema, then server functions, API routes, and finally frontend components. Property-based tests are included as sub-tasks to validate correctness early.

## Tasks

- [ ] 1. Set up database schema and RLS policies
  - [ ] 1.1 Create customers table migration
    - Create `supabase/migrations/XXXXXX_create_customers_table.sql`
    - Include id, tenant_id, email, name, phone, qualifying_purchase_count, has_available_discount, timestamps
    - Add unique constraint on (tenant_id, email)
    - Add indexes for tenant_id, email lookup, and full-text search
    - _Requirements: 1.1, 6.1_
  - [ ] 1.2 Create loyalty_history table migration
    - Create `supabase/migrations/XXXXXX_create_loyalty_history_table.sql`
    - Include id, tenant_id, customer_id, order_id, event_type, order_total, discount_amount, adjustment_reason, adjusted_by, timestamp
    - Add indexes for customer_id and tenant_id
    - _Requirements: 2.3, 4.4, 7.4_
  - [ ] 1.3 Create RLS policies for tenant isolation
    - Add tenant isolation policy for customers table
    - Add tenant isolation policy for loyalty_history table
    - _Requirements: 6.2, 6.3_

- [ ] 2. Implement PostgreSQL RPCs for atomic operations
  - [ ] 2.1 Create record_qualifying_purchase function
    - Implement threshold check (>= R$50.00)
    - Increment counter atomically
    - Set has_available_discount when count reaches 5
    - Insert loyalty_history entry
    - _Requirements: 2.1, 2.2, 2.3, 3.1_
  - [ ]* 2.2 Write property test for qualifying purchase threshold
    - **Property 6: Qualifying Purchase Counter Increment**
    - **Property 7: Non-Qualifying Purchase Counter Unchanged**
    - **Validates: Requirements 2.1, 2.2**
  - [ ] 2.3 Create apply_loyalty_discount function
    - Check eligibility (has_available_discount = true)
    - Calculate 15% discount
    - Reset counter to 0 and has_available_discount to false
    - Insert loyalty_history entry
    - Return discount amount
    - _Requirements: 4.1, 4.3, 4.4, 3.4_
  - [ ]* 2.4 Write property test for discount application
    - **Property 10: Discount Calculation Accuracy**
    - **Property 11: Discount Application Correctness**
    - **Validates: Requirements 3.4, 4.1, 4.2, 4.3, 4.4**
  - [ ] 2.5 Create restore_loyalty_discount function
    - Set counter to 5 and has_available_discount to true
    - Insert loyalty_history entry
    - _Requirements: 4.5_

- [ ] 3. Checkpoint - Database layer complete
  - Ensure all migrations run successfully
  - Verify RLS policies work correctly
  - Ensure all property tests pass, ask the user if questions arise

- [ ] 4. Implement TypeScript types and constants
  - [ ] 4.1 Create loyalty types file
    - Create `app/types/loyalty.ts`
    - Define Customer, LoyaltyHistoryEntry, LoyaltyStatus, DiscountApplication interfaces
    - Define LOYALTY_CONFIG constants
    - _Requirements: 3.4_

- [ ] 5. Implement customer management API routes
  - [ ] 5.1 Create customer list route
    - Create `app/routes/api.customers.tsx`
    - Implement GET handler with search and pagination
    - Use full-text search for name/email/phone
    - Ensure tenant isolation via RLS
    - _Requirements: 1.5, 7.1, 7.2_
  - [ ]* 5.2 Write property test for search tenant isolation
    - **Property 5: Search Tenant Isolation**
    - **Validates: Requirements 1.5, 6.3**
  - [ ] 5.3 Create customer create route
    - Implement POST handler in `app/routes/api.customers.tsx`
    - Validate required fields (name, email)
    - Handle duplicate email error
    - _Requirements: 1.1, 1.4_
  - [ ]* 5.4 Write property test for customer creation
    - **Property 1: Customer Creation Completeness**
    - **Property 4: Email Uniqueness Per Tenant**
    - **Validates: Requirements 1.1, 1.4**
  - [ ] 5.5 Create customer detail route
    - Create `app/routes/api.customers.$id.tsx`
    - Implement GET handler returning full customer with loyalty status
    - Implement PUT handler for updates
    - _Requirements: 1.2, 1.3_
  - [ ] 5.6 Create customer history route
    - Create `app/routes/api.customers.$id.history.tsx`
    - Return all loyalty_history entries for customer
    - _Requirements: 2.4, 7.3_

- [ ] 6. Implement loyalty API routes
  - [ ] 6.1 Create loyalty status route
    - Create `app/routes/api.loyalty.status.$customerId.tsx`
    - Return current qualifying_purchase_count, has_available_discount, purchasesUntilDiscount
    - _Requirements: 3.2, 5.1, 5.4_
  - [ ]* 6.2 Write property test for progress calculation
    - **Property 13: Progress Calculation Accuracy**
    - **Validates: Requirements 5.4**
  - [ ] 6.3 Create apply discount route
    - Create `app/routes/api.loyalty.apply-discount.tsx`
    - Call apply_loyalty_discount RPC
    - Return original, discount, and final amounts
    - _Requirements: 4.1, 4.2_
  - [ ] 6.4 Create manual adjustment route
    - Create `app/routes/api.loyalty.manual-adjust.tsx`
    - Require reason and log adjusted_by
    - _Requirements: 7.4_
  - [ ]* 6.5 Write property test for manual adjustment audit
    - **Property 15: Manual Adjustment Audit Trail**
    - **Validates: Requirements 7.4**

- [ ] 7. Checkpoint - API layer complete
  - Ensure all API routes respond correctly
  - Verify tenant isolation works end-to-end
  - Ensure all property tests pass, ask the user if questions arise

- [ ] 8. Implement order completion hook for loyalty tracking
  - [ ] 8.1 Create order completion handler
    - Modify order completion flow to call record_qualifying_purchase
    - Pass customer_id, order_id, order_total
    - _Requirements: 2.1, 2.2_
  - [ ]* 8.2 Write property test for discount eligibility threshold
    - **Property 9: Discount Eligibility Threshold**
    - **Validates: Requirements 3.1, 3.3**
  - [ ] 8.3 Create order cancellation handler
    - Check if discount was applied to cancelled order
    - Call restore_loyalty_discount if needed
    - _Requirements: 4.5_
  - [ ]* 8.4 Write property test for discount restoration
    - **Property 12: Discount Restoration on Cancellation**
    - **Validates: Requirements 4.5**

- [ ] 9. Implement frontend components
  - [ ] 9.1 Create LoyaltyProgressWidget component
    - Create `app/components/loyalty/LoyaltyProgressWidget.tsx`
    - Display circular progress (X/5)
    - Show "Discount Available!" badge when eligible
    - _Requirements: 5.1, 5.2, 5.4_
  - [ ] 9.2 Create CustomerListView component
    - Create `app/components/customers/CustomerListView.tsx`
    - Implement search with 300ms debounce
    - Display name, email, phone, loyalty badge
    - Use useFetcher for data loading
    - _Requirements: 7.1, 7.2_
  - [ ] 9.3 Create CustomerDetailView component
    - Create `app/components/customers/CustomerDetailView.tsx`
    - Show editable contact info
    - Display loyalty progress bar
    - Show purchase history timeline
    - Include manual adjustment form for staff
    - _Requirements: 1.2, 1.3, 7.3, 7.4_
  - [ ] 9.4 Create CheckoutLoyaltySection component
    - Create `app/components/checkout/CheckoutLoyaltySection.tsx`
    - Detect and display discount eligibility
    - Show original price, discount amount, final price
    - Handle discount application on order confirmation
    - _Requirements: 3.2, 4.1, 4.2_

- [ ] 10. Implement backoffice routes
  - [ ] 10.1 Create customer management page
    - Create `app/routes/backoffice.customers.tsx`
    - Integrate CustomerListView
    - Add create customer button/form
    - _Requirements: 7.1_
  - [ ] 10.2 Create customer detail page
    - Create `app/routes/backoffice.customers.$id.tsx`
    - Integrate CustomerDetailView
    - _Requirements: 7.3_

- [ ] 11. Implement Realtime subscriptions
  - [ ] 11.1 Create loyalty Realtime channel
    - Subscribe to loyalty_history changes for current tenant
    - Update LoyaltyProgressWidget on changes
    - _Requirements: 5.3_

- [ ] 12. Implement cross-tenant isolation tests
  - [ ]* 12.1 Write property test for cross-tenant isolation
    - **Property 14: Cross-Tenant Loyalty Isolation**
    - **Validates: Requirements 6.1, 6.2, 6.4**

- [ ] 13. Final checkpoint - Feature complete
  - Ensure all components render correctly
  - Verify end-to-end flow works
  - Ensure all property tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Use fast-check library for property-based testing
