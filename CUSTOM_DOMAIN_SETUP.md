# Custom Domain Setup Guide

## 🌐 Setting up eshop.clubemkt.digital

This guide walks you through configuring the custom domain `eshop.clubemkt.digital` for ClubeeShopMkt.

## Prerequisites

- Access to Cloudflare dashboard
- Domain `clubemkt.digital` must be managed by Cloudflare
- Cloudflare Workers plan that supports custom domains

## Step-by-Step Setup

### 1. Verify Domain in Cloudflare

First, ensure `clubemkt.digital` is added to your Cloudflare account:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Check if `clubemkt.digital` is listed in your domains
3. If not, add it by clicking "Add a Site" and following the setup process

### 2. Configure Custom Domain via Cloudflare Dashboard

#### Option A: Via Workers Dashboard (Recommended)
1. Go to **Workers & Pages** in Cloudflare Dashboard
2. Click on your `clubeeshopmkt` worker
3. Go to **Settings** → **Triggers**
4. In the **Custom Domains** section, click **Add Custom Domain**
5. Enter: `eshop.clubemkt.digital`
6. Click **Add Custom Domain**

#### Option B: Via Wrangler CLI
```bash
# Add custom domain via CLI
npx wrangler domains add eshop.clubemkt.digital

# Verify domain is added
npx wrangler domains list
```

### 3. DNS Configuration

Cloudflare will automatically create the necessary DNS records, but verify:

1. Go to **DNS** → **Records** in your Cloudflare dashboard
2. Look for a record like:
   ```
   Type: AAAA
   Name: eshop
   Content: 100:: (or similar IPv6 address)
   Proxy: Proxied (orange cloud)
   ```

If the record doesn't exist, create it manually:
- **Type**: AAAA
- **Name**: eshop
- **Content**: `100::`
- **Proxy Status**: Proxied (orange cloud icon)

### 4. SSL/TLS Configuration

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to **Full (strict)** or **Full**
3. Go to **SSL/TLS** → **Edge Certificates**
4. Ensure **Always Use HTTPS** is enabled
5. Verify **Universal SSL Certificate** covers `*.clubemkt.digital`

### 5. Deploy with Custom Domain

Update your deployment to use the custom domain:

```bash
# Build the application
npm run build

# Deploy to Cloudflare Workers
npx wrangler deploy

# Verify deployment
curl -I https://eshop.clubemkt.digital
```

### 6. Update OAuth Redirect URLs

Since you're changing domains, update your Supabase OAuth configuration:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Update **Site URL** to: `https://eshop.clubemkt.digital`
5. Add to **Redirect URLs**:
   - `https://eshop.clubemkt.digital/auth/callback`
   - Keep existing URLs for testing: `https://clubeeshopmkt.hudsonargollo2.workers.dev/auth/callback`

### 7. Update Environment Variables (Optional)

If you want to set the custom domain as an environment variable:

```bash
# Set via wrangler
npx wrangler secret put CUSTOM_DOMAIN
# Enter: eshop.clubemkt.digital

# Or add to wrangler.toml
[vars]
CUSTOM_DOMAIN = "eshop.clubemkt.digital"
```

## Verification Steps

### 1. Test Domain Resolution
```bash
# Check DNS resolution
nslookup eshop.clubemkt.digital

# Test HTTP response
curl -I https://eshop.clubemkt.digital
```

### 2. Test Application
1. Visit: https://eshop.clubemkt.digital
2. Verify landing page loads correctly
3. Test signup/login functionality
4. Check that OAuth redirects work properly

### 3. Test Debug Endpoints
```bash
# Test system health
curl https://eshop.clubemkt.digital/api/debug

# Test with authentication (replace TOKEN)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://eshop.clubemkt.digital/api/user/status
```

## Troubleshooting

### Domain Not Resolving
- Wait 5-10 minutes for DNS propagation
- Check DNS records in Cloudflare dashboard
- Verify domain is proxied (orange cloud)

### SSL Certificate Issues
- Ensure Universal SSL is enabled
- Check that encryption mode is set to Full or Full (strict)
- Wait up to 24 hours for certificate provisioning

### 403 Forbidden Errors
- Verify custom domain is properly added to worker
- Check that routes are configured correctly in wrangler.toml
- Ensure worker is deployed after domain configuration

### OAuth Redirect Issues
- Update Supabase redirect URLs to include new domain
- Clear browser cache and cookies
- Test in incognito mode

## Production Checklist

- [ ] Domain `clubemkt.digital` is in Cloudflare
- [ ] Custom domain `eshop.clubemkt.digital` is added to worker
- [ ] DNS records are configured and proxied
- [ ] SSL/TLS is set to Full (strict)
- [ ] Always Use HTTPS is enabled
- [ ] Supabase OAuth URLs are updated
- [ ] Application deploys successfully
- [ ] Landing page loads at new domain
- [ ] Authentication flow works
- [ ] Debug endpoints respond correctly

## Final URLs

After setup, your application will be available at:

- **Production**: https://eshop.clubemkt.digital
- **Debug Endpoint**: https://eshop.clubemkt.digital/api/debug
- **User Status**: https://eshop.clubemkt.digital/api/user/status
- **Backup (Workers.dev)**: https://clubeeshopmkt.hudsonargollo2.workers.dev

## Multi-Tenant Considerations

With the custom domain, you can now support:

1. **Main Domain**: `eshop.clubemkt.digital` (platform landing)
2. **Tenant Subdomains**: `tenant-name.eshop.clubemkt.digital` (individual shops)
3. **Path-based Tenants**: `eshop.clubemkt.digital/shop/tenant-name`

To enable tenant subdomains, add a wildcard route:
```toml
routes = [
  { pattern = "eshop.clubemkt.digital/*", custom_domain = true },
  { pattern = "*.eshop.clubemkt.digital/*", custom_domain = true }
]
```

This setup provides a professional domain for your multi-tenant retail platform!