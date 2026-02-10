# Onboarding Fix Instructions

## Issue
The onboarding flow is failing because the Row Level Security (RLS) policies prevent regular users from creating `user_tenants` relationships. Only the service role can bypass these restrictions.

## Solution
We need to add the Supabase service role key to the Cloudflare Workers environment.

## Steps to Fix

### 1. Get the Service Role Key from Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `zalerisusobjckaodkfb`
3. Go to **Settings** → **API**
4. Copy the **service_role** key (not the anon key)

### 2. Set the Service Role Key in Cloudflare Workers

Run this command in your terminal (replace `YOUR_SERVICE_ROLE_KEY` with the actual key):

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

When prompted, paste your service role key.

### 3. Verify the Fix

After setting the secret, the onboarding flow should work:

1. Go to https://eshop.clubemkt.digital
2. Sign up with Google OAuth
3. Complete the onboarding form
4. The tenant should be created successfully

## Technical Details

The fix works by:

1. **Regular Supabase Client**: Uses anon key for normal operations
2. **Admin Supabase Client**: Uses service role key for `user_tenants` creation
3. **RLS Bypass**: Service role can bypass RLS policies to create the user-tenant relationship
4. **Security**: Only the onboarding process uses the service role, maintaining security

## Code Changes Made

- Updated `app/lib/supabase.server.ts` to support service role
- Modified `app/routes/onboarding.tsx` to use service role for user_tenant creation
- Added proper error handling for missing service role key

## Testing

You can test the fix by:

1. Completing the OAuth flow
2. Filling out the onboarding form
3. Checking that the tenant is created in Supabase dashboard
4. Verifying the user can access the backoffice

## Fallback

If the service role key is not set, the onboarding will show a helpful error message: "Configuração do servidor incompleta. Entre em contato com o suporte."