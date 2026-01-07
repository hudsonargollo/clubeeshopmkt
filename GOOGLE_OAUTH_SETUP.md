# 🔐 Google OAuth Setup Guide for ClubeeShopMkt

## 🚨 Quick Fix for "Google sign-up is not yet configured"

Follow these steps to enable Google OAuth and fix the signup page.

## Step 1: Get Your Supabase Project Details

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your ClubeeShopMkt project
3. Note down your **Project URL** (looks like: `https://abcdefgh.supabase.co`)

## Step 2: Google Cloud Console Setup

### 2.1 Create/Select Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Name it "ClubeeShopMkt" or similar

### 2.2 Enable Required APIs
1. Go to **APIs & Services** → **Library**
2. Search and enable:
   - **Google+ API** (required for OAuth)
   - **People API** (recommended)

### 2.3 Create OAuth Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. If prompted, configure OAuth consent screen first:
   - **User Type**: External
   - **App Name**: ClubeeShopMkt
   - **User Support Email**: Your email
   - **Developer Contact**: Your email
   - **Scopes**: Add `email` and `profile`

### 2.4 Configure OAuth Client
1. **Application Type**: Web application
2. **Name**: ClubeeShopMkt Production
3. **Authorized JavaScript origins**:
   ```
   https://clubeeshopmkt.hudsonargollo2.workers.dev
   https://[your-project-id].supabase.co
   ```
4. **Authorized redirect URIs**:
   ```
   https://[your-project-id].supabase.co/auth/v1/callback
   ```
   (Replace `[your-project-id]` with your actual Supabase project ID)

5. Click **Create**
6. **Copy the Client ID and Client Secret** - you'll need these!

## Step 3: Configure Supabase

### 3.1 Enable Google Provider
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **Providers**
4. Find **Google** and toggle it **ON**
5. Click **Configure**

### 3.2 Add Google Credentials
1. **Client ID**: Paste from Google Cloud Console
2. **Client Secret**: Paste from Google Cloud Console
3. Click **Save**

### 3.3 Configure Site URL
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**: `https://clubeeshopmkt.hudsonargollo2.workers.dev`
3. Add **Redirect URLs**:
   ```
   https://clubeeshopmkt.hudsonargollo2.workers.dev/auth/callback
   http://localhost:8787/auth/callback
   ```

## Step 4: Test the Setup

1. **Deploy latest changes** (if not already done):
   ```bash
   npm run deploy
   ```

2. **Test the flow**:
   - Go to: https://clubeeshopmkt.hudsonargollo2.workers.dev
   - Click "Start for Free" → should navigate to signup
   - Click "Continue with Google" → should work now!

## Step 5: Verify Everything Works

### ✅ Checklist
- [ ] Landing page "Start for Free" navigates to signup
- [ ] Signup page loads without errors
- [ ] "Continue with Google" redirects to Google OAuth
- [ ] After Google auth, user is redirected back to app
- [ ] New users go to `/onboarding`
- [ ] Existing users go to `/backoffice`
- [ ] Superadmin (`cavernacentral2@gmail.com`) goes to `/portal`

## 🚨 Common Issues & Solutions

### Issue: "redirect_uri_mismatch"
**Solution**: Make sure the redirect URI in Google Cloud Console exactly matches:
```
https://[your-project-id].supabase.co/auth/v1/callback
```

### Issue: "OAuth consent screen not configured"
**Solution**: 
1. Go to Google Cloud Console → **APIs & Services** → **OAuth consent screen**
2. Fill in required fields (app name, support email, etc.)
3. Add your email to test users if in development mode

### Issue: "Google sign-up is not yet configured" still shows
**Solution**:
1. Check Supabase provider is enabled and saved
2. Verify Client ID and Secret are correct
3. Wait 1-2 minutes for changes to propagate
4. Clear browser cache and try again

### Issue: "Invalid client" error
**Solution**:
1. Double-check Client ID in Supabase matches Google Cloud Console
2. Ensure the Google project has the APIs enabled
3. Verify the OAuth consent screen is published (not in draft)

## 📞 Need Help?

If you encounter issues:

1. **Check browser console** for error messages
2. **Check Supabase logs** in the dashboard
3. **Verify all URLs** match exactly (no trailing slashes, correct protocols)
4. **Test with incognito mode** to avoid cache issues

## 🎯 Expected Result

After completing this setup:
- ✅ "Start for Free" button works correctly
- ✅ Google OAuth signup/login works
- ✅ Users are properly routed based on their role
- ✅ Multi-tenant system functions correctly
- ✅ Production-ready authentication system

The entire authentication flow should be seamless and professional!