# ClubeeShopMkt Deployment Guide

This document provides comprehensive deployment instructions for the ClubeeShopMkt multi-tenant retail platform.

## 🚀 Quick Start

### Option 1: Quick Deploy (Recommended for rapid iterations)
```powershell
# Windows PowerShell
.\scripts\quick-deploy.ps1

# Or directly
npm run deploy
```

### Option 2: Full Deployment Process
```powershell
# Windows PowerShell
.\scripts\deploy.ps1

# Unix/Linux/macOS
./scripts/deploy.sh
```

## 📋 Deployment Options

### Manual Deployment Commands

#### 1. Build Only
```bash
npm run build
```

#### 2. Deploy Only (assumes build is done)
```bash
npx wrangler deploy
```

#### 3. Full Build + Deploy
```bash
npm run deploy
```

### Script Options

#### PowerShell Script (`scripts/deploy.ps1`)
```powershell
# Basic deployment
.\scripts\deploy.ps1

# Skip build step (if already built)
.\scripts\deploy.ps1 -SkipBuild

# Skip git operations
.\scripts\deploy.ps1 -SkipGit

# Custom commit message
.\scripts\deploy.ps1 -CommitMessage "feat: new feature implementation"

# Combine options
.\scripts\deploy.ps1 -SkipBuild -CommitMessage "hotfix: critical bug fix"
```

#### Bash Script (`scripts/deploy.sh`)
```bash
# Basic deployment
./scripts/deploy.sh

# Skip build step
./scripts/deploy.sh --skip-build

# Skip git operations
./scripts/deploy.sh --skip-git

# Custom commit message
./scripts/deploy.sh -m "feat: new feature implementation"

# Show help
./scripts/deploy.sh --help
```

## 🔄 Automated Deployment (GitHub Actions)

### Setup GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:

```
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
```

### Getting Cloudflare Credentials

#### API Token
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use **Custom token** template
4. Set permissions:
   - **Account**: `Cloudflare Workers:Edit`
   - **Zone**: `Zone:Read` (if using custom domains)
5. Copy the generated token

#### Account ID
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account
3. Copy the **Account ID** from the right sidebar

### Automatic Deployment Triggers

The GitHub Action automatically deploys when:
- Code is pushed to `main` branch
- Pull requests are created/updated
- Manual trigger via GitHub Actions tab

## 🌐 Deployment Environments

### Production
- **URL**: https://clubeeshopmkt.hudsonargollo2.workers.dev
- **Branch**: `main`
- **Auto-deploy**: ✅ Enabled

### Staging (if configured)
- **URL**: https://clubeeshopmkt-staging.hudsonargollo2.workers.dev
- **Branch**: `staging`
- **Auto-deploy**: ✅ Enabled

## 🔧 Environment Variables

### Required Variables (set in Cloudflare Workers)
```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
ENVIRONMENT=production
```

### Setting Environment Variables
```bash
# Set environment variables
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY

# List current variables
npx wrangler secret list
```

## 📊 Deployment Process Overview

### What Happens During Deployment

1. **Prerequisites Check**: Verifies Node.js, npm, git, and wrangler are available
2. **Dependency Installation**: Runs `npm ci` to install exact dependencies
3. **Build Process**: Compiles TypeScript, bundles assets, optimizes for production
4. **Git Operations** (optional): Commits changes and pushes to GitHub
5. **Cloudflare Deployment**: Uploads to Cloudflare Workers
6. **Cache Purging**: Automatically purged on Workers deployment
7. **Verification**: Confirms deployment success and provides URLs

### Build Output
```
✓ 2312 modules transformed
✓ Client build: 254.06 kB (gzipped: 82.85 kB)
✓ Server build: 205.99 kB
✓ Deployed to Cloudflare Workers
```

## 🚨 Troubleshooting

### Common Issues

#### 1. "Wrangler not found"
```bash
# Install wrangler globally
npm install -g wrangler

# Or use npx
npx wrangler --version
```

#### 2. "Authentication failed"
```bash
# Login to Cloudflare
npx wrangler login

# Or set API token
npx wrangler auth
```

#### 3. "Build failed"
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check
```

#### 4. "Deployment timeout"
```bash
# Try deploying with verbose output
npx wrangler deploy --verbose

# Check Cloudflare status
curl -s https://www.cloudflarestatus.com/api/v2/status.json
```

### Debug Mode

Enable verbose logging:
```bash
# PowerShell
$env:DEBUG="*"
.\scripts\deploy.ps1

# Bash
DEBUG=* ./scripts/deploy.sh
```

## 📈 Performance Optimization

### Build Optimization
- **Tree Shaking**: Unused code automatically removed
- **Code Splitting**: Routes loaded on-demand
- **Asset Optimization**: Images and CSS minified
- **Gzip Compression**: Enabled by default

### Deployment Speed
- **Incremental Builds**: Only changed files rebuilt
- **Asset Caching**: Unchanged assets skipped
- **Edge Deployment**: Global CDN distribution

## 🔐 Security Considerations

### Environment Variables
- Never commit secrets to git
- Use Cloudflare Workers secrets for sensitive data
- Rotate API tokens regularly

### Deployment Security
- GitHub Actions use encrypted secrets
- Cloudflare API tokens have minimal required permissions
- All connections use HTTPS/TLS

## 📱 Testing After Deployment

### Automated Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
```

### Manual Testing Checklist
- [ ] Landing page loads correctly
- [ ] Signup page with Google OAuth
- [ ] Login functionality
- [ ] Backoffice access
- [ ] Inventory management
- [ ] Order processing
- [ ] Mobile responsiveness

### URLs to Test
- **Landing**: https://clubeeshopmkt.hudsonargollo2.workers.dev
- **Signup**: https://clubeeshopmkt.hudsonargollo2.workers.dev/signup
- **Login**: https://clubeeshopmkt.hudsonargollo2.workers.dev/login
- **Backoffice**: https://clubeeshopmkt.hudsonargollo2.workers.dev/backoffice

## 📞 Support

### Getting Help
- **Documentation**: Check this file and inline code comments
- **Logs**: Use `npx wrangler tail` for real-time logs
- **Status**: Monitor [Cloudflare Status](https://www.cloudflarestatus.com/)

### Rollback Process
```bash
# List recent deployments
npx wrangler deployments list

# Rollback to previous version
npx wrangler rollback [version-id]
```

---

## 🎯 Summary

The ClubeeShopMkt deployment process is designed to be:
- **Fast**: Optimized builds and incremental deployments
- **Reliable**: Automated testing and rollback capabilities
- **Secure**: Encrypted secrets and minimal permissions
- **Scalable**: Edge deployment with global CDN

Choose the deployment method that best fits your workflow:
- **Quick iterations**: Use `npm run deploy` or `quick-deploy.ps1`
- **Full process**: Use the comprehensive deployment scripts
- **Automated**: Let GitHub Actions handle deployments on push

The platform is now ready for production use with robust authentication, multi-tenant architecture, and comprehensive error handling.