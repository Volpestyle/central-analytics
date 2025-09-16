#!/bin/bash

# Script to generate HTTPS certificates for local development
# Uses mkcert for trusted local certificates

set -e

echo "Generating HTTPS certificates for local development..."

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

# Check if mkcert is installed
if ! command_exists mkcert; then
    echo "mkcert not found. Installing via Homebrew..."
    if ! command_exists brew; then
        echo "Homebrew not found. Please install Homebrew first:"
        echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    brew install mkcert
fi

# Install local CA
echo "Installing local Certificate Authority..."
mkcert -install

# Create certificates directory
CERTS_DIR="certs"
mkdir -p "$CERTS_DIR"

# Generate certificates for configured domain
echo "Generating certificates for $LOCAL_DOMAIN..."
cd "$CERTS_DIR"
mkcert "$LOCAL_DOMAIN" "127.0.0.1" "localhost"

# Find and rename the generated certificate files
# mkcert generates files with +N suffix, we need to find them
CERT_FILE=$(ls "${LOCAL_DOMAIN}"+*.pem 2>/dev/null | grep -v key | head -1)
KEY_FILE=$(ls "${LOCAL_DOMAIN}"+*-key.pem 2>/dev/null | head -1)

if [ -z "$CERT_FILE" ] || [ -z "$KEY_FILE" ]; then
    echo "Error: Certificate files not found after generation"
    exit 1
fi

# Rename certificates for clarity
mv "$CERT_FILE" "cert.pem"
mv "$KEY_FILE" "key.pem"

cd ..

# Set appropriate permissions
chmod 644 certs/cert.pem
chmod 600 certs/key.pem

echo ""
echo "✓ Certificates generated successfully!"
echo ""
echo "Certificate location:"
echo "  • ./certs/cert.pem, ./certs/key.pem"
echo ""
echo "These certificates are trusted by your system and will work with:"
echo "  • https://$LOCAL_DOMAIN:$FRONTEND_PORT (Astro frontend)"
echo "  • https://$LOCAL_DOMAIN:$BACKEND_HTTPS_PORT (Go backend proxy)"
echo ""
echo "Note: The certificates are valid for local development only."