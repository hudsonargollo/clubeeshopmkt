# 🌐 Custom Domain Setup: eshop.clubemkt.digital

**Target Domain**: `eshop.clubemkt.digital`
**Current URL**: `https://clubeeshopmkt.hudsonargollo2.workers.dev`

## Quick Setup Guide

### Step 1: Add Custom Domain via Cloudflare Dashboard

Since the Wrangler CLI doesn't support the `domains` command in version 3.x, you need to use the Cloudflare Dashboard:

1. **Go to Cloudflare Dashboard**
   - Visit: https://dash.cloudflare.com
   - Login to your account

2. **Navigate to Workers & Pages**
   - Click on **Workers & Pages** in the left sidebar
   - Find and click on **clubeeshopmkt** worker

3. **Add Custom Domain**
   - Click on the **Settings** tab
   - Scroll to **Domains & Routes** section
   - Click **Add** next to "Custom Domains"
   - Enter: `eshop.clubemkt.digital`
   - Click **Add Custom Domain**

4. **Verify DNS Configuration**
   - Cloudflare will automatically create the DNS record
   - Go to your domain's **DNS** settings
   - Verify there's a record for `eshop` pointing to your worker
   - The record should be **Proxied** (orange cloud icon)

### Step 2: Configure SSL/TLS

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to **Full (strict)**
3. Go to **SSL/TLS** → **Edge Certificates**
4. Ensure **Always Use HTTPS** is ON
5. Verify **Universal SSL Certificate** is active

### Step 3: Update Supabase OAuth Configuration

Since you're adding a custom domain, update your OAuth redirect URLs:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your ClubeeShopMkt project
3. Navigate to **Authentication** → **URL Configuration**
4. Update **Site URL** to: `https://eshop.clubemkt.digital`
5. Add to **Redirect URLs**:
   ```
   https://eshop.clubemkt.digital/auth/callback
   https://clubeeshopmkt.hudsonargollo2.workers.dev/auth/callback
   ```
   (Keep both for testing)

### Step 4: Test the Custom Domain

After DNS propagation (usually 5-10 minutes), test your custom domain:

```bash
# Test DNS resolution
nslookup eshop.clubemkt.digital

# Test HTTPS response
curl -I https://eshop.clubemkt.digital

# Test landing page
curl https://eshop.clubemkt.digital
```

### Step 5: Verify Application

1. **Visit**: https://eshop.clubemkt.digital
2. **Test**:
   - Landing page loads
   - Signup page works
   - Login page works
   - OAuth redirects properly

## Alternative: Using Cloudflare API

If you prefer to use the API, here's how:

```bash
# Get your Cloudflare Account ID and API Token
# Account ID: Found in Cloudflare Dashboard
# API Token: Create at https://dash.cloudflare.com/profile/api-tokens

# Set environment variables
export CF_ACCOUNT_ID="your-account-id"
export CF_API_TOKEN="your-api-token"

# Add custom domain via API
curl -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/workers/scripts/clubeeshopmkt/domains" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "hostname": "eshop.clubemkt.digital"
  }'
```

## DNS Configuration Details

Cloudflare will automatically create this DNS record:

```
Type: AAAA
Name: eshop
Content: 100:: (Cloudflare Workers IPv6)
Proxy: Proxied (orange cloud)
TTL: Auto
```

If you need to create it manually:
1. Go to **DNS** → **Records**
2. Click **Add record**
3. Fill in the details above
4. Click **Save**

## Verification Checklist

- [ ] Custom domain added to worker in Cloudflare Dashboard
- [ ] DNS record created and proxied
- [ ] SSL/TLS set to Full (strict)
- [ ] Always Use HTTPS enabled
- [ ] Supabase OAuth URLs updated
- [ ] Domain resolves correctly (nslookup)
- [ ] HTTPS works (curl test)
- [ ] Landing page loads
- [ ] Authentication works
- [ ] OAuth redirects properly

## Expected Results

After setup, your application will be accessible at:

- **Primary**: https://eshop.clubemkt.digital
- **Signup**: https://eshop.clubemkt.digital/signup
- **Login**: https://eshop.clubemkt.digital/login
- **Backoffice**: https://eshop.clubemkt.digital/backoffice
- **Portal**: https://eshop.clubemkt.digital/portal
- **Backup**: https://clubeeshopmkt.hudsonargollo2.workers.dev (still works)

## Troubleshooting

### Domain Not Resolving
- **Wait**: DNS propagation can take 5-10 minutes
- **Check**: Verify DNS record exists in Cloudflare
- **Proxy**: Ensure orange cloud (proxied) is enabled

### SSL Certificate Error
- **Wait**: Certificate provisioning can take up to 24 hours
- **Check**: Verify Universal SSL is enabled
- **Mode**: Ensure SSL/TLS mode is Full or Full (strict)

### 403 Forbidden
- **Verify**: Custom domain is added to worker
- **Check**: Worker is deployed after domain configuration
- **Test**: Try accessing workers.dev URL first

### OAuth Not Working
- **Update**: Supabase redirect URLs must include new domain
- **Clear**: Browser cache and cookies
- **Test**: Use incognito mode

## Multi-Tenant Support

With your custom domain, you can now support tenant subdomains:

### Option 1: Subdomain per Tenant
- `tenant1.eshop.clubemkt.digital`
- `tenant2.eshop.clubemkt.digital`

To enable, add wildcard DNS:
```
Type: AAAA
Name: *
Content: 100::
Proxy: Proxied
```

### Option 2: Path-based Tenants
- `eshop.clubemkt.digital/shop/tenant1`
- `eshop.clubemkt.digital/shop/tenant2`

This is already supported with current configuration.

## Next Steps

1. **Add custom domain** via Cloudflare Dashboard (Step 1 above)
2. **Wait for DNS** propagation (5-10 minutes)
3. **Test the domain** using the verification checklist
4. **Update OAuth** redirect URLs in Supabase
5. **Announce** the new domain to your users!

---

**Need Help?**
- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Cloudflare Support: https://support.cloudflare.com/
