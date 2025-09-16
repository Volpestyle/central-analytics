#!/bin/bash

# Start development servers with HTTPS for Apple Sign In testing
# No ngrok required - uses local domain with trusted certificates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Source shared configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# Load configuration
load_config

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Configuration not found. Run ./scripts/configure-domain.sh first.${NC}"
    exit 1
fi

echo -e "${GREEN}Starting Central Analytics Development Environment${NC}"
echo -e "Domain: ${LOCAL_DOMAIN}"
echo ""

# Check if local domain is configured
if ! grep -q "$LOCAL_DOMAIN" /etc/hosts 2>/dev/null; then
    echo -e "${YELLOW}Local domain not configured. Running setup...${NC}"
    ensure_executable "./scripts/setup-local-domain.sh"
    ./scripts/setup-local-domain.sh
fi

# Check if certificates exist
if [ ! -f "certs/cert.pem" ] || [ ! -f "certs/key.pem" ]; then
    echo -e "${YELLOW}HTTPS certificates not found. Generating...${NC}"
    ensure_executable "./scripts/generate-certs.sh"
    ./scripts/generate-certs.sh
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"
    # Kill all child processes
    pkill -P $$ || true
    exit 0
}

trap cleanup EXIT INT TERM

# Start backend server with HTTPS proxy
echo -e "${GREEN}Starting backend server with HTTPS proxy...${NC}"
cd packages/backend
go run ./cmd/local-server/main.go --port=$BACKEND_HTTP_PORT &
BACKEND_PID=$!
cd ../..

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 3

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}Backend failed to start${NC}"
    exit 1
fi

# Start Astro frontend
echo -e "${GREEN}Starting Astro frontend...${NC}"
pnpm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo "Waiting for frontend to start..."
sleep 5

echo ""
echo -e "${GREEN}✨ Development environment is ready!${NC}"
echo ""
echo "Access your application at:"
echo -e "  ${GREEN}Frontend:${NC} https://$LOCAL_DOMAIN:$FRONTEND_PORT"
echo -e "  ${GREEN}Backend API:${NC} https://$LOCAL_DOMAIN:$BACKEND_HTTPS_PORT"
echo ""
echo "Apple Sign In Configuration:"
echo -e "  ${YELLOW}Redirect URI:${NC} https://$LOCAL_DOMAIN:$FRONTEND_PORT/auth/callback"
echo -e "  ${YELLOW}Client ID:${NC} Check your .env file"
echo ""
echo -e "${YELLOW}Important:${NC} Make sure to configure these URLs in your Apple Developer portal"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for user to stop
wait
