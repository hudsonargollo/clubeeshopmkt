# Custom Domain Setup Script for ClubeeShopMkt
# This script helps set up the custom domain eshop.clubemkt.digital

param(
    [switch]$CheckOnly,
    [switch]$Deploy
)

Write-Host "🌐 ClubeeShopMkt Custom Domain Setup" -ForegroundColor Cyan
Write-Host "Domain: eshop.clubemkt.digital" -ForegroundColor Yellow
Write-Host ""

# Function to check if command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Verify wrangler is available
if (-not (Test-Command "npx")) {
    Write-Host "❌ npx is not available" -ForegroundColor Red
    exit 1
}

if ($CheckOnly) {
    Write-Host "🔍 Checking domain configuration..." -ForegroundColor Blue
    
    # Check if domain is configured
    try {
        $domains = npx wrangler domains list 2>&1
        if ($domains -match "eshop.clubemkt.digital") {
            Write-Host "✅ Custom domain is already configured" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Custom domain not found in wrangler domains" -ForegroundColor Yellow
            Write-Host "Run with -Deploy flag to add the domain" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "❌ Failed to check domains: $_" -ForegroundColor Red
    }
    
    # Test domain resolution
    Write-Host "🔍 Testing domain resolution..." -ForegroundColor Blue
    try {
        $response = Invoke-WebRequest -Uri "https://eshop.clubemkt.digital" -Method Head -TimeoutSec 10 -ErrorAction Stop
        Write-Host "✅ Domain is resolving (Status: $($response.StatusCode))" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️ Domain not yet resolving: $_" -ForegroundColor Yellow
    }
    
    exit 0
}

if ($Deploy) {
    Write-Host "🚀 Setting up custom domain..." -ForegroundColor Blue
    
    # Add custom domain
    Write-Host "📋 Adding custom domain to worker..." -ForegroundColor Blue
    try {
        $result = npx wrangler domains add eshop.clubemkt.digital 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Custom domain added successfully" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Domain may already exist or need manual configuration" -ForegroundColor Yellow
            Write-Host "Output: $result" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "❌ Failed to add domain: $_" -ForegroundColor Red
    }
    
    # Deploy with updated configuration
    Write-Host "📋 Deploying with custom domain configuration..." -ForegroundColor Blue
    try {
        npm run build
        npx wrangler deploy
        Write-Host "✅ Deployment completed" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "🎉 Custom domain setup completed!" -ForegroundColor Green
    Write-Host "🌐 Your app should be available at: https://eshop.clubemkt.digital" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Verify DNS propagation (may take 5-10 minutes)" -ForegroundColor White
    Write-Host "2. Update Supabase OAuth redirect URLs" -ForegroundColor White
    Write-Host "3. Test authentication flow" -ForegroundColor White
    Write-Host ""
    
    exit 0
}

# Default: Show help
Write-Host "Usage:" -ForegroundColor Yellow
Write-Host "  .\setup-custom-domain.ps1 -CheckOnly    # Check current domain status" -ForegroundColor White
Write-Host "  .\setup-custom-domain.ps1 -Deploy       # Set up and deploy custom domain" -ForegroundColor White
Write-Host ""
Write-Host "Manual setup instructions:" -ForegroundColor Yellow
Write-Host "1. Go to Cloudflare Dashboard > Workers & Pages" -ForegroundColor White
Write-Host "2. Select your 'clubeeshopmkt' worker" -ForegroundColor White
Write-Host "3. Go to Settings > Triggers" -ForegroundColor White
Write-Host "4. Add Custom Domain: eshop.clubemkt.digital" -ForegroundColor White
Write-Host "5. Deploy: npx wrangler deploy" -ForegroundColor White
Write-Host ""
Write-Host "See CUSTOM_DOMAIN_SETUP.md for detailed instructions" -ForegroundColor Cyan