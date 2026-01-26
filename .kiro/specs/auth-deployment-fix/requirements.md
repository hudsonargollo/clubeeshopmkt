# Requirements Document: Authentication and Deployment Fix

## Introduction

This specification addresses critical authentication and account creation issues in the ClubeeShopMkt production deployment. The system currently has authentication flows implemented (Google OAuth and email/password), but requires verification, testing, and fixes to ensure production readiness. The multi-tenant architecture requires proper user routing based on tenant assignments, and the deployment environment needs validation of all configuration settings.

## Glossary

- **Auth_System**: The Supabase authentication service handling user sign-in and sign-up
- **OAuth_Provider**: Google OAuth 2.0 service for third-party authentication
- **Cloudflare_Worker**: The edge compute environment hosting the application
- **Environment_Variables**: Configuration values (SUPABASE_URL, SUPABASE_ANON_KEY) stored in Cloudflare Workers
- **Session_Token**: JWT access token and refresh token pair for authenticated requests
- **User_Routing**: Logic determining where users are redirected after authentication
- **Tenant_Assignment**: Database record linking users to their shop (tenant)
- **Onboarding_Flow**: Process for new users to create their first tenant
- **Auth_Callback**: Route handling OAuth redirect and session establishment
- **RLS_Policy**: Row-Level Security policy enforcing tenant isolation in database

## Requirements

### Requirement 1: Environment Variable Verification

**User Story:** As a system administrator, I want to verify that all required environment variables are properly configured in production, so that the authentication system can function correctly.

#### Acceptance Criteria

1. WHEN the application starts, THE Auth_System SHALL verify that SUPABASE_URL is set and valid
2. WHEN the application starts, THE Auth_System SHALL verify that SUPABASE_ANON_KEY is set and valid
3. WHEN environment variables are missing, THE Auth_System SHALL log descriptive error messages
4. WHEN environment variables are exposed to the client, THE Auth_System SHALL only expose SUPABASE_URL and SUPABASE_ANON_KEY (not JWT secrets)
5. WHEN verifying configuration, THE Auth_System SHALL test connectivity to Supabase endpoints

### Requirement 2: Google OAuth Configuration and Flow

**User Story:** As a user, I want to sign up and log in using my Google account, so that I can access the system without creating a new password.

#### Acceptance Criteria

1. WHEN a user clicks "Continue with Google", THE Auth_System SHALL initiate the OAuth flow with proper redirect URL
2. WHEN Google OAuth is not configured in Supabase, THE Auth_System SHALL display a clear error message directing users to email/password signup
3. WHEN OAuth redirect returns to the callback URL, THE Auth_System SHALL exchange the authorization code for a session
4. WHEN the OAuth code exchange succeeds, THE Auth_System SHALL store access and refresh tokens
5. WHEN the OAuth code exchange fails, THE Auth_System SHALL display a user-friendly error message and redirect to the login page
6. WHEN OAuth provider returns an error, THE Auth_System SHALL log the error details and show a generic user message

### Requirement 3: Email/Password Authentication

**User Story:** As a user, I want to create an account and log in using email and password, so that I can access the system without third-party authentication.

#### Acceptance Criteria

1. WHEN a user submits the signup form with valid credentials, THE Auth_System SHALL create a new user account
2. WHEN a user attempts to sign up with an existing email, THE Auth_System SHALL return an error message indicating the account exists
3. WHEN a user submits the login form with valid credentials, THE Auth_System SHALL return session tokens
4. WHEN a user submits the login form with invalid credentials, THE Auth_System SHALL return a generic error message without revealing whether the email exists
5. WHEN password validation fails (less than 6 characters), THE Auth_System SHALL prevent submission and display validation errors
6. WHEN passwords do not match during signup, THE Auth_System SHALL prevent submission and display a mismatch error

### Requirement 4: Session Management and Token Storage

**User Story:** As a user, I want my authentication session to persist across page reloads, so that I don't have to log in repeatedly.

#### Acceptance Criteria

1. WHEN authentication succeeds, THE Auth_System SHALL store the access token in localStorage
2. WHEN authentication succeeds, THE Auth_System SHALL store the refresh token in localStorage
3. WHEN a user reloads the page, THE Auth_System SHALL retrieve tokens from localStorage
4. WHEN tokens are expired, THE Auth_System SHALL attempt to refresh using the refresh token
5. WHEN token refresh fails, THE Auth_System SHALL clear stored tokens and redirect to login
6. WHEN a user signs out, THE Auth_System SHALL clear all stored tokens from localStorage

### Requirement 5: Auth Callback and User Routing

**User Story:** As a user, I want to be automatically directed to the appropriate page after logging in, so that I can immediately access the features relevant to my role.

#### Acceptance Criteria

1. WHEN the auth callback receives a valid authorization code, THE Auth_System SHALL exchange it for a session
2. WHEN a superadmin user completes authentication, THE User_Routing SHALL redirect to /portal
3. WHEN a user with zero tenant assignments completes authentication, THE User_Routing SHALL redirect to /onboarding
4. WHEN a user with one or more tenant assignments completes authentication, THE User_Routing SHALL redirect to /backoffice
5. WHEN the auth callback encounters an error, THE Auth_System SHALL display the error for 3 seconds then redirect to the home page
6. WHEN determining user routing, THE Auth_System SHALL query the user_tenants table to count tenant assignments

### Requirement 6: Tenant Creation in Onboarding

**User Story:** As a new user, I want to create my shop during onboarding, so that I can start using the platform immediately after signup.

#### Acceptance Criteria

1. WHEN a user submits the onboarding form with valid data, THE Onboarding_Flow SHALL create a new tenant record
2. WHEN a tenant is created, THE Onboarding_Flow SHALL create a user_tenants record with role 'owner'
3. WHEN a subdomain is already taken, THE Onboarding_Flow SHALL return an error and prevent tenant creation
4. WHEN tenant creation fails, THE Onboarding_Flow SHALL rollback any partial changes
5. WHEN tenant creation succeeds, THE Onboarding_Flow SHALL redirect the user to /backoffice
6. WHEN the onboarding form is submitted, THE Onboarding_Flow SHALL validate shop name (2-50 characters) and subdomain (3-30 characters, lowercase alphanumeric with hyphens)

### Requirement 7: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages when authentication fails, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN a network error occurs during authentication, THE Auth_System SHALL display a message indicating connection issues
2. WHEN Supabase returns an error, THE Auth_System SHALL log the technical details and display a user-friendly message
3. WHEN OAuth configuration is missing, THE Auth_System SHALL suggest using email/password authentication instead
4. WHEN form validation fails, THE Auth_System SHALL display field-specific error messages
5. WHEN an unexpected error occurs, THE Auth_System SHALL display a generic error message and log details for debugging
6. WHEN authentication succeeds, THE Auth_System SHALL provide visual feedback (loading states, success messages)

### Requirement 8: Production Deployment Verification

**User Story:** As a system administrator, I want to verify that the production deployment is correctly configured, so that users can successfully create accounts and log in.

#### Acceptance Criteria

1. WHEN accessing the production URL, THE Cloudflare_Worker SHALL serve the application without errors
2. WHEN checking environment variables in production, THE Cloudflare_Worker SHALL have SUPABASE_URL and SUPABASE_ANON_KEY configured
3. WHEN testing the signup flow in production, THE Auth_System SHALL successfully create new user accounts
4. WHEN testing the login flow in production, THE Auth_System SHALL successfully authenticate existing users
5. WHEN testing the onboarding flow in production, THE Onboarding_Flow SHALL successfully create new tenants
6. WHEN testing OAuth in production, THE Auth_System SHALL either complete the flow successfully or display a clear configuration error

### Requirement 9: Database Connectivity and RLS

**User Story:** As a system administrator, I want to ensure that the application can connect to Supabase and that Row-Level Security policies are enforcing tenant isolation, so that data remains secure.

#### Acceptance Criteria

1. WHEN the application queries the database, THE Auth_System SHALL use the Supabase client with proper authentication headers
2. WHEN a user is authenticated, THE RLS_Policy SHALL enforce tenant isolation based on JWT claims
3. WHEN querying user_tenants, THE Auth_System SHALL only return records for the authenticated user
4. WHEN creating a tenant, THE Onboarding_Flow SHALL ensure the tenant_id is properly set in the database
5. WHEN a user has no tenant assignments, THE Auth_System SHALL allow access to the onboarding page
6. WHEN database queries fail, THE Auth_System SHALL log errors and return appropriate HTTP status codes

### Requirement 10: End-to-End Authentication Testing

**User Story:** As a developer, I want comprehensive end-to-end tests for the authentication flow, so that I can verify all components work together correctly.

#### Acceptance Criteria

1. WHEN running end-to-end tests, THE Auth_System SHALL verify email/password signup creates a user
2. WHEN running end-to-end tests, THE Auth_System SHALL verify email/password login returns valid tokens
3. WHEN running end-to-end tests, THE User_Routing SHALL verify new users are directed to onboarding
4. WHEN running end-to-end tests, THE Onboarding_Flow SHALL verify tenant creation succeeds
5. WHEN running end-to-end tests, THE User_Routing SHALL verify users with tenants are directed to backoffice
6. WHEN running end-to-end tests, THE Auth_System SHALL verify error cases (invalid credentials, duplicate emails, missing fields)
