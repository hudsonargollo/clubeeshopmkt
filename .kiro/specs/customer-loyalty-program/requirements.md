# Requirements Document

## Introduction

This document specifies the requirements for a Customer Loyalty Program feature that enables customer management and rewards customers with discounts after qualifying purchases. The system tracks customer purchase history and automatically applies discounts when loyalty thresholds are met.

## Glossary

- **Loyalty_System**: The component responsible for tracking customer purchases and calculating loyalty rewards
- **Customer_Manager**: The component responsible for creating, updating, and managing customer profiles
- **Qualifying_Purchase**: A completed order with a total value of R$50.00 or more
- **Loyalty_Threshold**: The number of qualifying purchases (5) required to earn a discount
- **Loyalty_Discount**: A 15% discount applied to the customer's next purchase after reaching the threshold
- **Customer**: A registered user who makes purchases through the webshop
- **Purchase_Counter**: The running count of qualifying purchases for a customer

## Requirements

### Requirement 1: Customer Registration and Profile Management

**User Story:** As a shop owner, I want to manage customer profiles, so that I can track their purchase history and loyalty status.

#### Acceptance Criteria

1. WHEN a new customer is created, THE Customer_Manager SHALL store their name, email, phone number, and tenant association
2. WHEN a customer profile is viewed, THE Customer_Manager SHALL display their total purchase count, qualifying purchase count, and current loyalty status
3. WHEN a customer's information is updated, THE Customer_Manager SHALL persist the changes and maintain purchase history
4. IF a customer email already exists for the tenant, THEN THE Customer_Manager SHALL reject the duplicate and return an error
5. WHEN a customer is searched by name, email, or phone, THE Customer_Manager SHALL return matching results for the current tenant only

### Requirement 2: Purchase Tracking for Loyalty

**User Story:** As a customer, I want my purchases to be tracked automatically, so that I can earn loyalty rewards without manual intervention.

#### Acceptance Criteria

1. WHEN an order is completed with a total of R$50.00 or more, THE Loyalty_System SHALL increment the customer's qualifying purchase counter by one
2. WHEN an order is completed with a total less than R$50.00, THE Loyalty_System SHALL NOT increment the qualifying purchase counter
3. WHEN a qualifying purchase is recorded, THE Loyalty_System SHALL store the order reference and timestamp
4. WHEN a customer's purchase history is queried, THE Loyalty_System SHALL return all orders with their qualifying status

### Requirement 3: Loyalty Discount Eligibility

**User Story:** As a customer, I want to receive a 15% discount after making 5 qualifying purchases, so that I am rewarded for my loyalty.

#### Acceptance Criteria

1. WHEN a customer reaches 5 qualifying purchases, THE Loyalty_System SHALL mark the customer as eligible for a 15% discount
2. WHEN a customer has an available discount, THE Loyalty_System SHALL display the discount availability in their profile and at checkout
3. WHEN checking discount eligibility, THE Loyalty_System SHALL verify the customer has exactly 5 or more unclaimed qualifying purchases
4. THE Loyalty_System SHALL calculate the discount amount as 15% of the order subtotal before taxes

### Requirement 4: Discount Application at Checkout

**User Story:** As a customer, I want my loyalty discount to be applied automatically at checkout, so that I receive my earned reward seamlessly.

#### Acceptance Criteria

1. WHEN a customer with an available discount proceeds to checkout, THE Loyalty_System SHALL automatically apply the 15% discount to the order total
2. WHEN a discount is applied, THE Loyalty_System SHALL display the original price, discount amount, and final price
3. WHEN a discount is successfully used, THE Loyalty_System SHALL reset the customer's qualifying purchase counter to zero
4. WHEN a discount is applied, THE Loyalty_System SHALL record the discount usage with order reference and discount amount
5. IF a customer cancels an order where a discount was applied, THEN THE Loyalty_System SHALL restore the discount eligibility

### Requirement 5: Loyalty Status Visibility

**User Story:** As a customer, I want to see my progress toward the next loyalty reward, so that I am motivated to continue purchasing.

#### Acceptance Criteria

1. WHEN a customer views their account, THE Loyalty_System SHALL display their current qualifying purchase count out of 5
2. WHEN a customer has an available discount, THE Loyalty_System SHALL prominently display the discount availability
3. WHEN a customer completes a qualifying purchase, THE Loyalty_System SHALL show updated progress toward the next reward
4. THE Loyalty_System SHALL display a progress indicator showing purchases remaining until the next discount

### Requirement 6: Multi-Tenant Isolation

**User Story:** As a shop owner, I want customer loyalty data isolated per tenant, so that each shop manages its own customer base independently.

#### Acceptance Criteria

1. THE Customer_Manager SHALL associate every customer record with a tenant_id
2. THE Loyalty_System SHALL only count purchases made within the same tenant toward loyalty rewards
3. WHEN querying customers or loyalty data, THE Customer_Manager SHALL filter results by the current tenant context
4. IF a customer shops at multiple tenants, THEN THE Loyalty_System SHALL maintain separate loyalty progress for each tenant

### Requirement 7: Backoffice Customer Management

**User Story:** As a shop staff member, I want to view and manage customer loyalty status from the backoffice, so that I can assist customers with their accounts.

#### Acceptance Criteria

1. WHEN viewing the customer list in backoffice, THE Customer_Manager SHALL display customer name, contact info, and loyalty status
2. WHEN a staff member searches for a customer, THE Customer_Manager SHALL support search by name, email, phone, or barcode scan of customer card
3. WHEN viewing a customer detail, THE Customer_Manager SHALL show complete purchase history and loyalty progress
4. WHEN a staff member manually adjusts loyalty status, THE Customer_Manager SHALL log the adjustment with reason and staff identifier
