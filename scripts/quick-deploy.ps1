# Quick Deploy Script - Minimal deployment for rapid iterations
# Usage: .\scripts\quick-deploy.ps1

Write-Host "Quick Deploy - ClubeeShopMkt" -ForegroundColor Cyan
Write-Host ""

# Build and deploy in one go
Write-Host "Building and deploying..." -ForegroundColor Blue
try {
    npm run deploy
    Write-Host ""
    Write-Host "Quick deployment completed!" -ForegroundColor Green
    Write-Host "URL: https://clubeeshopmkt.hudsonargollo2.workers.dev" -ForegroundColor Cyan
    Write-Host "Cache automatically purged" -ForegroundColor Green
}
catch {
    Write-Host "Quick deployment failed: $_" -ForegroundColor Red
    exit 1
}