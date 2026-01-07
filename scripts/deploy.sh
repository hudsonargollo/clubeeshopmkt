#!/bin/bash

# ClubeeShopMkt Deployment Script for Unix/Linux/macOS
# This script handles the complete deployment process for both GitHub and Cloudflare

set -e  # Exit on any error

# Default values
ENVIRONMENT="production"
SKIP_BUILD=false
SKIP_GIT=false
COMMIT_MESSAGE="Deploy: $(date '+%Y-%m-%d %H:%M:%S')"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-git)
            SKIP_GIT=true
            shift
            ;;
        -m|--message)
            COMMIT_MESSAGE="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -e, --environment ENV    Set environment (default: production)"
            echo "  --skip-build            Skip the build step"
            echo "  --skip-git              Skip git operations"
            echo "  -m, --message MSG       Custom commit message"
            echo "  -h, --help              Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}🚀 ClubeeShopMkt Deployment Script${NC}"
echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
echo -e "${GRAY}Timestamp: $(date)${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to run command with error handling
run_command() {
    local cmd="$1"
    local description="$2"
    
    echo -e "${BLUE}📋 $description...${NC}"
    if eval "$cmd"; then
        echo -e "${GREEN}✅ $description completed successfully${NC}"
        echo ""
    else
        echo -e "${RED}❌ $description failed${NC}"
        exit 1
    fi
}

# Verify prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed or not in PATH${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed or not in PATH${NC}"
    exit 1
fi

if ! command_exists git; then
    echo -e "${RED}❌ Git is not installed or not in PATH${NC}"
    exit 1
fi

if ! command_exists npx; then
    echo -e "${RED}❌ npx is not available${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites satisfied${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Install dependencies
run_command "npm ci" "Installing dependencies"

# Build the application (unless skipped)
if [ "$SKIP_BUILD" = false ]; then
    run_command "npm run build" "Building application"
else
    echo -e "${YELLOW}⏭️ Skipping build step${NC}"
    echo ""
fi

# Git operations (unless skipped)
if [ "$SKIP_GIT" = false ]; then
    echo -e "${BLUE}📝 Git operations...${NC}"
    
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${BLUE}📋 Staging changes...${NC}"
        run_command "git add ." "Staging all changes"
        
        echo -e "${BLUE}📋 Committing changes...${NC}"
        run_command "git commit -m \"$COMMIT_MESSAGE\"" "Committing changes"
    else
        echo -e "${YELLOW}ℹ️ No uncommitted changes found${NC}"
    fi
    
    echo -e "${BLUE}📋 Pushing to GitHub...${NC}"
    run_command "git push origin main" "Pushing to GitHub"
else
    echo -e "${YELLOW}⏭️ Skipping Git operations${NC}"
    echo ""
fi

# Deploy to Cloudflare Workers
echo -e "${BLUE}🌐 Deploying to Cloudflare Workers...${NC}"
if DEPLOY_OUTPUT=$(npx wrangler deploy 2>&1); then
    # Extract deployment URL from output
    DEPLOYMENT_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[^[:space:]]*\.workers\.dev' | head -1)
    
    echo -e "${GREEN}✅ Deployment to Cloudflare Workers completed successfully${NC}"
    if [ -n "$DEPLOYMENT_URL" ]; then
        echo -e "${CYAN}🌐 Deployment URL: $DEPLOYMENT_URL${NC}"
    fi
    echo ""
else
    echo -e "${RED}❌ Cloudflare Workers deployment failed${NC}"
    echo -e "${RED}Output: $DEPLOY_OUTPUT${NC}"
    exit 1
fi

# Cache is automatically purged on Workers deployment
echo -e "${GREEN}🔄 Cache automatically purged on deployment${NC}"
echo ""

# Final status
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${CYAN}📊 Deployment Summary:${NC}"
echo -e "${WHITE}  • Environment: $ENVIRONMENT${NC}"
echo -e "${WHITE}  • Build: $([ "$SKIP_BUILD" = true ] && echo "Skipped" || echo "Completed")${NC}"
echo -e "${WHITE}  • Git: $([ "$SKIP_GIT" = true ] && echo "Skipped" || echo "Completed")${NC}"
echo -e "${WHITE}  • Cloudflare: Deployed${NC}"
echo -e "${WHITE}  • Cache: Purged${NC}"
echo ""
echo -e "${CYAN}🌐 Production URL: https://clubeeshopmkt.hudsonargollo2.workers.dev${NC}"
echo -e "${CYAN}📱 Test the signup page: https://clubeeshopmkt.hudsonargollo2.workers.dev/signup${NC}"
echo ""
echo -e "${GREEN}✨ Ready for testing!${NC}"