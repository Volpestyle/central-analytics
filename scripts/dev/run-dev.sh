#!/bin/bash

set -e

echo "🚀 Starting Central Analytics Development Servers"
echo "================================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Source shared configuration
source "$SCRIPT_DIR/config.sh"

# Load configuration
load_config

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Error: Domain not configured. Please run './scripts/configure-domain.sh' first"
    exit 1
fi

cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $(jobs -p) 2>/dev/null || true
    wait
    echo "✅ All servers stopped"
    exit 0
}

trap cleanup EXIT INT TERM

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Warning: Port $port is already in use"
        echo "   Run 'lsof -i :$port' to see what's using it"
        return 1
    fi
    return 0
}

echo "🔍 Checking ports..."
echo "--------------------"
check_port $FRONTEND_PORT || { echo "Frontend port $FRONTEND_PORT is busy"; }
check_port $BACKEND_HTTP_PORT || { echo "Backend port $BACKEND_HTTP_PORT is busy"; }
check_port $BACKEND_HTTPS_PORT || { echo "Proxy port $BACKEND_HTTPS_PORT is busy"; }

echo ""
echo "🔐 Starting HTTPS Proxy (Port $BACKEND_HTTPS_PORT)..."
echo "----------------------------------------------"
if [ -f "scripts/https-proxy.js" ]; then
    node scripts/https-proxy.js &
    PROXY_PID=$!
    echo "✅ HTTPS Proxy started (PID: $PROXY_PID)"
else
    echo "⚠️  Warning: HTTPS proxy script not found"
fi

sleep 2

echo ""
echo "🖥️  Starting Frontend (Port $FRONTEND_PORT)..."
echo "-----------------------------------------------"
pnpm dev:frontend &
FRONTEND_PID=$!
echo "✅ Frontend server started (PID: $FRONTEND_PID)"

sleep 2

echo ""
echo "⚙️  Starting Backend (Port $BACKEND_HTTP_PORT)..."
echo "---------------------------------------------"
if command -v go &> /dev/null; then
    if [ -d "packages/backend" ]; then
        cd packages/backend
        go run cmd/local-server/main.go &
        BACKEND_PID=$!
        echo "✅ Backend server started (PID: $BACKEND_PID)"
        cd "$PROJECT_ROOT"
    else
        echo "⚠️  Warning: Backend directory not found"
    fi
else
    echo "⚠️  Warning: Go not found. Backend will not start"
    echo "   Install Go: brew install go"
fi

echo ""
echo "================================================"
echo "✅ All servers are running!"
echo ""
echo "🌐 Access your app at:"
echo "   https://${LOCAL_DOMAIN}:${BACKEND_HTTPS_PORT}"
echo ""
echo "📊 Individual servers:"
echo "   Frontend: http://localhost:${FRONTEND_PORT}"
echo "   Backend:  http://localhost:${BACKEND_HTTP_PORT}"
echo "   API:      https://${LOCAL_DOMAIN}:${BACKEND_HTTPS_PORT}/api"
echo ""
echo "📝 Logs are displayed below. Press Ctrl+C to stop all servers."
echo "================================================"
echo ""

wait
