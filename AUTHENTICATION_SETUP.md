# Authentication Setup Guide

## Current Status ✅

The ClubeeShopMkt application has been successfully deployed with improved authentication:

- **Production URL**: https://clubeeshopmkt.hudsonargollo2.workers.dev
- **Staging URL**: https://clubeeshopmkt.hudsonargollo2.workers.dev

## 🚨 URGENT: Google OAuth Configuration Required

The signup page currently shows "Google sign-up is not yet configured" because Google OAuth needs to be set up in your Supabase project.

### Step 1: Configure Google OAuth in Supabase Dashboard

1. **Go to your Supabase project dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your ClubeeShopMkt project

2. **Navigate to Authentication Settings**
   - Click **Authentication** in the left sidebar
   - Click **Providers** tab

3. **Enable Google Provider**
   - Find **Google** in the list of providers
   - Toggle it **ON** (enabled)
   - Click **Configure**

4. **Add Google OAuth Credentials**
   You'll need to get these from Google Cloud Console (see Step 2 below):
   - **Client ID**: `your_google_client_id.apps.googleusercontent.com`
   - **Client Secret**: `your_google_client_secret`

5. **Configure Redirect URLs**
   - Go to **Authentication** → **URL Configuration**
   - Add these redirect URLs:
   ```
   https://clubeeshopmkt.hudsonargollo2.workers.dev/auth/callback
   http://localhost:8787/auth/callback
   ```

### Step 2: Google Cloud Console Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable Google+ API**
   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API" and enable it

3. **Create OAuth 2.0 Credentials**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**
   - Choose **Web application**

4. **Configure OAuth Client**
   - **Name**: ClubeeShopMkt
   - **Authorized JavaScript origins**:
     ```
     https://clubeeshopmkt.hudsonargollo2.workers.dev
     http://localhost:8787
     ```
   - **Authorized redirect URIs**:
     ```
     https://[your-supabase-project-id].supabase.co/auth/v1/callback
     ```
     (Replace `[your-supabase-project-id]` with your actual Supabase project ID)

5. **Copy Credentials**
   - Copy the **Client ID** and **Client Secret**
   - Add these to your Supabase Google provider configuration

### Step 3: Test Google OAuth

1. **Deploy the latest changes**:
   ```bash
   npm run deploy
   ```

2. **Test the signup flow**:
   - Go to: https://clubeeshopmkt.hudsonargollo2.workers.dev
   - Click "Start for Free" (should now navigate to signup)
   - Try "Continue with Google" (should work after OAuth setup)

## Recent Fixes Applied ✅

### Landing Page Navigation Fixed
- **Fixed "Start for Free" button**: Now uses React Router `Link` instead of `window.location.href`
- **Improved navigation**: Seamless SPA navigation to signup page
- **Removed unused code**: Cleaned up useState and loading states

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

1. **Landing Page**: Users click "Start for Free" → navigates to `/signup`
2. **Signup Options**: Google OAuth or Email/Password
3. **OAuth**: Google authentication via Supabase (after configuration)
4. **Callback Processing**: Server-side token exchange and role detection
5. **Routing**:
   - `cavernacentral2@gmail.com` → `/portal` (superadmin)
   - Other users → `/onboarding` (new) or `/backoffice` (existing)

## Testing the Authentication

### Test 1: Landing Page Navigation
1. Go to: https://clubeeshopmkt.hudsonargollo2.workers.dev
2. Click "Start for Free" button
3. Should navigate to `/signup` page (no page reload)

### Test 2: Google OAuth (After Configuration)
1. Go to signup page
2. Click "Continue with Google"
3. Should redirect to Google OAuth flow
4. After authentication, should return to app

### Test 3: Email/Password Signup
1. Go to signup page
2. Fill in email and password
3. Click "Create Account"
4. Should create account and show success message

### Test 4: Superadmin Login
1. Login with `cavernacentral2@gmail.com`
2. Should be redirected to `/portal`
3. Can manage all tenants and accounts

## Troubleshooting

### Issue: "Start for Free button doesn't work"

**Status**: ✅ **FIXED** - Updated to use React Router Link

**Solution Applied**: 
- Changed from `window.location.href` to `<Link to="/signup">`
- Removed loading states and click handlers
- Improved SPA navigation experience

### Issue: "Google sign-up is not yet configured"

**Status**: ⚠️ **REQUIRES SETUP** - Google OAuth needs configuration

**Solution**:
1. Follow Step 1 and Step 2 above to configure Google OAuth
2. Add Google Client ID and Secret to Supabase
3. Configure redirect URLs properly
4. Test the OAuth flow

### Issue: "Access Error - Please log in to access the backoffice"

**Cause**: User not authenticated or session expired

**Solution**:
1. Clear browser localStorage
2. Try logging in again
3. Check browser console for errors

## Next Steps

1. **🚨 URGENT: Configure Google OAuth** in Supabase (most important)
2. **Test the fixed navigation** from landing page to signup
3. **Verify Google OAuth flow** works correctly after setup
4. **Create test tenants** and verify isolation
5. **Test inventory management** features
6. **Verify barcode scanning** functionality

## Support

The system now has:
- ✅ Fixed landing page navigation
- ✅ Comprehensive error handling
- ✅ Improved redirect logic
- ✅ Detailed logging for debugging
- ⚠️ Google OAuth ready for configuration

Once Google OAuth is configured, the authentication system will be fully functional for production use.