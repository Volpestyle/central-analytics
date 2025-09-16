#!/bin/bash

# Script to set up local domain mapping for Apple Sign In testing
# This eliminates the need for ngrok by using a verifiable subdomain

set -e

echo "Setting up local development domain for Apple Sign In..."

# Source shared configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
source "$SCRIPT_DIR/config.sh"

cd "$PROJECT_ROOT"

# Load configuration
load_config

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Configuration not found. Run ./scripts/configure-domain.sh first."
    exit 1
fi

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "This script is designed for macOS. Please modify for your OS."
    exit 1
fi

# Domain configuration from config file
HOSTS_FILE="/etc/hosts"

# Check if already configured
if grep -q "$LOCAL_DOMAIN" "$HOSTS_FILE" 2>/dev/null; then
    echo "✓ Local domain $LOCAL_DOMAIN already configured in hosts file"
else
    echo "Adding $LOCAL_DOMAIN to hosts file (requires sudo)..."
    echo "127.0.0.1 $LOCAL_DOMAIN" | sudo tee -a "$HOSTS_FILE" > /dev/null
    echo "✓ Added $LOCAL_DOMAIN to hosts file"
fi

# Flush DNS cache
echo "Flushing DNS cache..."
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder 2>/dev/null || true
echo "✓ DNS cache flushed"

# Verify domain resolution
echo "Verifying domain resolution..."
if ping -c 1 "$LOCAL_DOMAIN" &> /dev/null; then
    echo "✓ $LOCAL_DOMAIN resolves correctly to 127.0.0.1"
else
    echo "✗ Failed to resolve $LOCAL_DOMAIN"
    echo "Please check your hosts file configuration"
    exit 1
fi

echo ""
echo "Local domain setup complete!"
echo "You can now access your application at:"
echo "  • https://$LOCAL_DOMAIN:$FRONTEND_PORT (Frontend)"
echo "  • https://$LOCAL_DOMAIN:$BACKEND_HTTPS_PORT (Backend)"
echo ""
echo "Next steps:"
echo "1. Run ./scripts/generate-certs.sh to generate HTTPS certificates"
echo "2. Start the development servers with ./scripts/start-dev.sh"
