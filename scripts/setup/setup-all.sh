#!/bin/bash

# Complete setup script for local Apple Sign In development
# This script sets up everything needed to eliminate ngrok dependency
# Usage: ./scripts/setup-all.sh [domain] [subdomain] [frontend_port] [backend_http_port] [backend_https_port]

set -e

# Source shared configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Central Analytics - Local HTTPS Setup (No ngrok needed)  ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Step 0: Configure domain if not already configured
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}Step 0/5: Configuring domain...${NC}"
    ensure_executable "./scripts/configure-domain.sh"
    ./scripts/configure-domain.sh "$@"
    echo ""
else
    echo -e "${GREEN}✓ Domain already configured${NC}"
    load_config
    echo "  Using domain: $LOCAL_DOMAIN"
    echo ""
fi

# Step 1: Setup local domain
echo -e "${YELLOW}Step 1/4: Setting up local domain...${NC}"
ensure_executable "./scripts/setup-local-domain.sh"
./scripts/setup-local-domain.sh
echo ""

# Step 2: Generate certificates
echo -e "${YELLOW}Step 2/4: Generating HTTPS certificates...${NC}"
ensure_executable "./scripts/generate-certs.sh"
./scripts/generate-certs.sh
echo ""

# Step 3: Install dependencies if needed
echo -e "${YELLOW}Step 3/4: Checking dependencies...${NC}"

# Check Go installation
if ! command_exists go; then
    echo -e "${RED}Go is not installed. Please install Go 1.21 or later${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Go is installed${NC}"
fi

# Check pnpm installation
if ! command_exists pnpm; then
    echo -e "${YELLOW}pnpm not found. Installing via npm...${NC}"
    npm install -g pnpm
else
    echo -e "${GREEN}✓ pnpm is installed${NC}"
fi

# Install frontend dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    pnpm install
else
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
fi

# Build backend if needed
echo "Building backend..."
cd packages/backend
go mod download
cd ../..
echo -e "${GREEN}✓ Backend ready${NC}"
echo ""

# Step 4: Environment configuration
echo -e "${YELLOW}Step 4/4: Checking environment configuration...${NC}"

# Load domain config for env setup
load_config

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << EOF
# Apple Authentication Configuration
PUBLIC_APPLE_CLIENT_ID=com.yourcompany.app
PUBLIC_ADMIN_APPLE_SUB=your_admin_apple_id_sub_identifier
PUBLIC_APPLE_REDIRECT_URI=https://$LOCAL_DOMAIN:$FRONTEND_PORT/auth/callback

# API Configuration
PUBLIC_API_URL=https://$LOCAL_DOMAIN:$BACKEND_HTTPS_PORT
PUBLIC_LOCAL_DOMAIN=$LOCAL_DOMAIN

# PWA Configuration
PUBLIC_APP_NAME=Central Analytics Dashboard
PUBLIC_APP_SHORT_NAME=Analytics

# Backend Environment Variables
LOCAL_DOMAIN=$LOCAL_DOMAIN
FRONTEND_PORT=$FRONTEND_PORT
BACKEND_HTTPS_PORT=$BACKEND_HTTPS_PORT
EOF
    echo -e "${YELLOW}Please update .env with your Apple credentials${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
    echo -e "${YELLOW}Note: You may need to update domain-related URLs in .env${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}                    Setup Complete!                        ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo "1. Update your .env file with:"
echo "   - PUBLIC_APPLE_CLIENT_ID (your Apple Services ID)"
echo "   - PUBLIC_ADMIN_APPLE_SUB (your Apple ID sub)"
echo "   - APP_STORE_* credentials (if using App Store Connect)"
echo ""
echo "2. In Apple Developer Portal, configure:"
echo "   - Services ID with domain: $BASE_DOMAIN"
echo "   - Return URL: https://$LOCAL_DOMAIN:$FRONTEND_PORT/auth/callback"
echo ""
echo "3. Start development servers:"
echo -e "   ${GREEN}./scripts/start-dev.sh${NC}"
echo ""
echo -e "${BLUE}URLs:${NC}"
echo "   Frontend: https://$LOCAL_DOMAIN:$FRONTEND_PORT"
echo "   Backend:  https://$LOCAL_DOMAIN:$BACKEND_HTTPS_PORT"
echo ""
echo -e "${GREEN}No ngrok needed! Everything runs locally with HTTPS.${NC}"