# ClubeeShopMkt Deployment Script for Windows PowerShell
# This script handles the complete deployment process for both GitHub and Cloudflare

param(
    [string]$Environment = "production",
    [switch]$SkipBuild,
    [switch]$SkipGit,
    [string]$CommitMessage = "Deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

Write-Host "🚀 ClubeeShopMkt Deployment Script" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor Gray
Write-Host ""

# Function to check if command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Function to run command with error handling
function Invoke-SafeCommand($Command, $Description) {
    Write-Host "📋 $Description..." -ForegroundColor Blue
    try {
        Invoke-Expression $Command
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code $LASTEXITCODE"
        }
        Write-Host "✅ $Description completed successfully" -ForegroundColor Green
        Write-Host ""
    }
    catch {
        Write-Host "❌ $Description failed: $_" -ForegroundColor Red
        exit 1
    }
}

# Verify prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Blue

if (-not (Test-Command "node")) {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "npm")) {
    Write-Host "❌ npm is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "git")) {
    Write-Host "❌ Git is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "npx")) {
    Write-Host "❌ npx is not available" -ForegroundColor Red
    exit 1
}

Write-Host "✅ All prerequisites satisfied" -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Install dependencies
Invoke-SafeCommand "npm ci" "Installing dependencies"

# Build the application (unless skipped)
if (-not $SkipBuild) {
    Invoke-SafeCommand "npm run build" "Building application"
} else {
    Write-Host "⏭️ Skipping build step" -ForegroundColor Yellow
    Write-Host ""
}

# Git operations (unless skipped)
if (-not $SkipGit) {
    Write-Host "📝 Git operations..." -ForegroundColor Blue
    
    # Check for uncommitted changes
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Host "📋 Staging changes..." -ForegroundColor Blue
        Invoke-SafeCommand "git add ." "Staging all changes"
        
        Write-Host "📋 Committing changes..." -ForegroundColor Blue
        Invoke-SafeCommand "git commit -m `"$CommitMessage`"" "Committing changes"
    } else {
        Write-Host "ℹ️ No uncommitted changes found" -ForegroundColor Yellow
    }
    
    Write-Host "📋 Pushing to GitHub..." -ForegroundColor Blue
    Invoke-SafeCommand "git push origin main" "Pushing to GitHub"
} else {
    Write-Host "⏭️ Skipping Git operations" -ForegroundColor Yellow
    Write-Host ""
}

# Deploy to Cloudflare Workers
Write-Host "🌐 Deploying to Cloudflare Workers..." -ForegroundColor Blue
try {
    $deployOutput = npx wrangler deploy 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Wrangler deploy failed with exit code $LASTEXITCODE"
    }
    
    # Extract deployment URL from output
    $deploymentUrl = $deployOutput | Select-String -Pattern "https://.*\.workers\.dev" | ForEach-Object { $_.Matches[0].Value }
    
    Write-Host "✅ Deployment to Cloudflare Workers completed successfully" -ForegroundColor Green
    if ($deploymentUrl) {
        Write-Host "🌐 Deployment URL: $deploymentUrl" -ForegroundColor Cyan
    }
    Write-Host ""
}
catch {
    Write-Host "❌ Cloudflare Workers deployment failed: $_" -ForegroundColor Red
    Write-Host "Output: $deployOutput" -ForegroundColor Red
    exit 1
}

# Cache is automatically purged on Workers deployment
Write-Host "🔄 Cache automatically purged on deployment" -ForegroundColor Green
Write-Host ""

# Final status
Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host "📊 Deployment Summary:" -ForegroundColor Cyan
Write-Host "  • Environment: $Environment" -ForegroundColor White
Write-Host "  • Build: $(if ($SkipBuild) { 'Skipped' } else { 'Completed' })" -ForegroundColor White
Write-Host "  • Git: $(if ($SkipGit) { 'Skipped' } else { 'Completed' })" -ForegroundColor White
Write-Host "  • Cloudflare: Deployed" -ForegroundColor White
Write-Host "  • Cache: Purged" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Custom Domain: https://eshop.clubemkt.digital" -ForegroundColor Cyan
Write-Host "🌐 Workers URL: https://clubeeshopmkt.hudsonargollo2.workers.dev" -ForegroundColor Cyan
Write-Host "📱 Test the signup page: https://eshop.clubemkt.digital/signup" -ForegroundColor Cyan
Write-Host ""
Write-Host "✨ Ready for testing!" -ForegroundColor Green