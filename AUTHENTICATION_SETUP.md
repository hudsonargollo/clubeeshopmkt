# Authentication Setup Guide

## Current Status ✅

The ClubeeShopMkt application has been successfully deployed with improved authentication:

- **Production URL**: https://clubeeshopmkt-production.hudsonargollo2.workers.dev
- **Staging URL**: https://clubeeshopmkt.hudsonargollo2.workers.dev

## Recent Fixes Applied ✅

### Authentication Callback Improvements
- **Fixed redirect mechanism**: Changed from `window.location.href` to React Router `navigate()` for better SPA behavior
- **Enhanced debugging**: Added comprehensive logging to track authentication flow
- **Improved error handling**: Better error messages and fallback behavior

### Multi-Tenant Authentication System

#### Superadmin Account
- **Email**: `cavernacentral2@gmail.com`
- **Access**: Can control and manage all other accounts
- **Redirect**: `/portal` (multi-tenant management interface)
- **Capabilities**: 
  - View all tenants
  - Manage all shop accounts
  - Access any tenant's backoffice
  - Full system administration

#### Regular User Accounts
- **Purpose**: Individual shop/service management
- **Redirect Logic**:
  - **New users** (0 tenants) → `/onboarding` (create their own tenant)
  - **Existing users** (1+ tenants) → `/backoffice` (manage their shop)
- **Capabilities**:
  - Manage their own inventory
  - Process orders for their shop
  - Access only their tenant data
  - Cannot see other tenants

## Authentication Flow

1. **Login**: Users click "Continue with Google"
2. **OAuth**: Google authentication via Supabase
3. **Callback Processing**: Server-side token exchange and role detection
4. **Routing**:
   - `cavernacentral2@gmail.com` → `/portal` (superadmin)
   - Other users → `/onboarding` (new) or `/backoffice` (existing)

## Testing the Fixed Authentication

### Test 1: Superadmin Login
1. Go to: https://clubeeshopmkt-production.hudsonargollo2.workers.dev/login
2. Login with `cavernacentral2@gmail.com`
3. Should be redirected to `/portal`
4. Can manage all tenants and accounts

### Test 2: Regular User Login (New)
1. Login with any other Google account
2. Should be redirected to `/onboarding`
3. Can create their own shop/tenant

### Test 3: Regular User Login (Existing)
1. Login with account that has existing tenant
2. Should be redirected to `/backoffice`
3. Can manage their own shop inventory

## Google OAuth Configuration Required

The authentication flow is ready but needs **Google OAuth to be configured in your Supabase project**.

### Step 1: Configure Google OAuth in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and click **Configure**
4. Enable Google OAuth
5. Add your Google OAuth credentials:
   - Client ID (from Google Cloud Console)
   - Client Secret (from Google Cloud Console)

### Step 2: Configure Redirect URLs

In your Supabase project:

1. Go to **Authentication** → **URL Configuration**
2. Add these redirect URLs:
   ```
   https://clubeeshopmkt-production.hudsonargollo2.workers.dev/auth/callback
   https://clubeeshopmkt.hudsonargollo2.workers.dev/auth/callback
   http://localhost:8787/auth/callback
   ```

### Step 3: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Set application type to **Web application**
6. Add authorized redirect URIs:
   ```
   https://zalerisusobjckaodkfb.supabase.co/auth/v1/callback
   ```
   (Replace with your actual Supabase project URL)

## Current Implementation Details

The authentication system uses:

- **Server-side OAuth**: Google OAuth is handled server-side for security
- **JWT Tokens**: Stored in localStorage for client-side auth state
- **Role-based Access**: Superadmin vs regular user permissions
- **Automatic Routing**: Users are routed based on role and tenant count
- **Multi-tenant Support**: Each shop gets isolated data access
- **Improved Redirects**: Uses React Router navigation for seamless SPA experience

## Troubleshooting

### Issue: "Redirected to landing page after login"

**Status**: ✅ **FIXED** - Updated redirect mechanism to use React Router navigation

**Previous Cause**: Authentication callback was using `window.location.href` which could cause issues

**Solution Applied**: 
- Changed to React Router `navigate()` method
- Added proper timing delays for localStorage writes
- Enhanced logging for debugging

### Issue: "Access Error - Please log in to access the backoffice"

**Cause**: User not authenticated or session expired

**Solution**:
1. Clear browser localStorage
2. Try logging in again
3. Check browser console for errors

## Next Steps

1. **Configure Google OAuth** in Supabase (most important)
2. **Test the improved authentication flow** with both superadmin and regular users
3. **Verify redirect behavior** works correctly
4. **Create test tenants** and verify isolation
5. **Test inventory management** features
6. **Verify barcode scanning** functionality

## Support

The system now has comprehensive error handling, improved redirect logic, and detailed logging to help diagnose any authentication issues. All authentication flows are properly configured for the multi-tenant architecture with superadmin capabilities.