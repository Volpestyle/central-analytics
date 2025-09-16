#!/bin/bash

# Domain Configuration Script
# Allows using any domain for local HTTPS development

set -e

# Source shared configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}           Domain Configuration for Local HTTPS            ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Function to validate domain format
validate_domain() {
    local domain=$1
    if [[ ! "$domain" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
        return 1
    fi
    return 0
}

# Get domain from user or command line
if [ -n "$1" ]; then
    BASE_DOMAIN="$1"
else
    echo -e "${CYAN}Enter your domain (e.g., example.com):${NC}"
    read -p "> " BASE_DOMAIN
fi

# Validate domain
if ! validate_domain "$BASE_DOMAIN"; then
    echo -e "${RED}Invalid domain format: $BASE_DOMAIN${NC}"
    exit 1
fi

# Get subdomain preference
if [ -n "$2" ]; then
    LOCAL_SUBDOMAIN="$2"
else
    echo -e "${CYAN}Enter local subdomain (default: $DEFAULT_LOCAL_SUBDOMAIN):${NC}"
    read -p "> " LOCAL_SUBDOMAIN
    LOCAL_SUBDOMAIN="${LOCAL_SUBDOMAIN:-$DEFAULT_LOCAL_SUBDOMAIN}"
fi

# Construct full local domain
LOCAL_DOMAIN="${LOCAL_SUBDOMAIN}.${BASE_DOMAIN}"

# Get port configurations
echo ""
echo -e "${CYAN}Port Configuration (press Enter for defaults):${NC}"

if [ -n "$3" ]; then
    FRONTEND_PORT="$3"
else
    read -p "Frontend port (default: $DEFAULT_FRONTEND_PORT): " FRONTEND_PORT
    FRONTEND_PORT="${FRONTEND_PORT:-$DEFAULT_FRONTEND_PORT}"
fi

if [ -n "$4" ]; then
    BACKEND_HTTP_PORT="$4"
else
    read -p "Backend HTTP port (default: $DEFAULT_BACKEND_HTTP_PORT): " BACKEND_HTTP_PORT
    BACKEND_HTTP_PORT="${BACKEND_HTTP_PORT:-$DEFAULT_BACKEND_HTTP_PORT}"
fi

if [ -n "$5" ]; then
    BACKEND_HTTPS_PORT="$5"
else
    read -p "Backend HTTPS port (default: $DEFAULT_BACKEND_HTTPS_PORT): " BACKEND_HTTPS_PORT
    BACKEND_HTTPS_PORT="${BACKEND_HTTPS_PORT:-$DEFAULT_BACKEND_HTTPS_PORT}"
fi

# Save configuration using shared function
save_config

echo ""
echo -e "${GREEN}✓ Configuration saved${NC}"

# Update .env file with new domain configuration
if [ -f ".env" ]; then
    echo ""
    echo -e "${YELLOW}Updating .env file with new domain configuration...${NC}"

    # Backup existing .env
    cp .env .env.backup

    # Update domain-related variables
    if grep -q "PUBLIC_APPLE_REDIRECT_URI" .env; then
        sed -i.tmp "s|PUBLIC_APPLE_REDIRECT_URI=.*|PUBLIC_APPLE_REDIRECT_URI=https://$LOCAL_DOMAIN:$FRONTEND_PORT/auth/callback|" .env
    else
        echo "PUBLIC_APPLE_REDIRECT_URI=https://$LOCAL_DOMAIN:$FRONTEND_PORT/auth/callback" >> .env
    fi

    if grep -q "PUBLIC_API_URL" .env; then
        sed -i.tmp "s|PUBLIC_API_URL=.*|PUBLIC_API_URL=https://$LOCAL_DOMAIN:$BACKEND_HTTPS_PORT|" .env
    else
        echo "PUBLIC_API_URL=https://$LOCAL_DOMAIN:$BACKEND_HTTPS_PORT" >> .env
    fi

    if grep -q "PUBLIC_LOCAL_DOMAIN" .env; then
        sed -i.tmp "s|PUBLIC_LOCAL_DOMAIN=.*|PUBLIC_LOCAL_DOMAIN=$LOCAL_DOMAIN|" .env
    else
        echo "PUBLIC_LOCAL_DOMAIN=$LOCAL_DOMAIN" >> .env
    fi

    # Clean up temp files
    rm -f .env.tmp

    echo -e "${GREEN}✓ .env file updated${NC}"
fi

# Display summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}              Configuration Summary                        ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Domain Settings:${NC}"
echo "  Base Domain:      $BASE_DOMAIN"
echo "  Local Subdomain:  $LOCAL_SUBDOMAIN"
echo "  Full Local URL:   https://$LOCAL_DOMAIN"
echo ""
echo -e "${CYAN}Port Configuration:${NC}"
echo "  Frontend:         $FRONTEND_PORT"
echo "  Backend HTTP:     $BACKEND_HTTP_PORT"
echo "  Backend HTTPS:    $BACKEND_HTTPS_PORT"
echo ""
echo -e "${CYAN}URLs:${NC}"
echo "  Frontend:         https://$LOCAL_DOMAIN:$FRONTEND_PORT"
echo "  Backend API:      https://$LOCAL_DOMAIN:$BACKEND_HTTPS_PORT"
echo "  Apple Callback:   https://$LOCAL_DOMAIN:$FRONTEND_PORT/auth/callback"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Run: ./scripts/setup-all.sh"
echo "2. Configure Apple Developer Portal with the callback URL above"
echo "3. Start development: ./scripts/start-dev.sh"
echo ""
echo -e "${GREEN}Note:${NC} Make sure you own the domain '$BASE_DOMAIN' and can verify it with Apple."
