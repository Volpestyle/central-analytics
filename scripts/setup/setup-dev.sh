#!/bin/bash

set -e

echo "🚀 Central Analytics Development Setup"
echo "======================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

cd "$PROJECT_ROOT"

# Source shared configuration
source "$SCRIPT_DIR/../utils/config.sh"

NEEDS_UPDATE=false
FORCE_UPDATE=false

if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
    FORCE_UPDATE=true
    echo "🔄 Force update mode enabled"
    echo ""
fi

echo "📦 Step 1: Checking dependencies..."
echo "-----------------------------------"
if [ "$FORCE_UPDATE" = true ] || [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo "Installing/updating dependencies..."
    if command_exists pnpm; then
        pnpm install
    elif command_exists npm; then
        npm install
    else
        echo "❌ Error: pnpm or npm not found"
        exit 1
    fi
else
    echo "✅ Dependencies up to date"
fi

echo ""
echo "🌐 Step 2: Domain configuration..."
echo "----------------------------------"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "No domain configuration found. Running domain setup..."
    if [ -f "scripts/utils/configure-domain.sh" ]; then
        ensure_executable "scripts/utils/configure-domain.sh"
        ./scripts/utils/configure-domain.sh
    else
        echo "Creating default configuration..."
        BASE_DOMAIN="$DEFAULT_BASE_DOMAIN"
        LOCAL_SUBDOMAIN="$DEFAULT_LOCAL_SUBDOMAIN"
        LOCAL_DOMAIN="${LOCAL_SUBDOMAIN}.${BASE_DOMAIN}"
        FRONTEND_PORT="$DEFAULT_FRONTEND_PORT"
        BACKEND_HTTP_PORT="$DEFAULT_BACKEND_HTTP_PORT"
        BACKEND_HTTPS_PORT="$DEFAULT_BACKEND_HTTPS_PORT"
        save_config
    fi
    NEEDS_UPDATE=true
else
    echo "✅ Domain already configured"
    load_config
    if [ "$FORCE_UPDATE" = false ]; then
        echo "   Current config:"
        echo "   Base Domain: $BASE_DOMAIN"
        echo "   Local Domain: $LOCAL_DOMAIN"
        echo "   Frontend Port: $FRONTEND_PORT"
        echo "   Backend HTTP Port: $BACKEND_HTTP_PORT"
        echo "   Backend HTTPS Port: $BACKEND_HTTPS_PORT"
    fi
fi

echo ""
echo "🔐 Step 3: HTTPS certificates..."
echo "--------------------------------"
CERT_DIR="certs"
CERT_FILE="$CERT_DIR/cert.pem"
KEY_FILE="$CERT_DIR/key.pem"

if [ "$FORCE_UPDATE" = true ] || [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    echo "Generating certificates..."
    if [ -f "scripts/certs/generate-certs.sh" ]; then
        ensure_executable "scripts/certs/generate-certs.sh"
        ./scripts/certs/generate-certs.sh
    else
        echo "⚠️  Warning: Certificate generation script not found"
    fi
else
    # Check if certificates are still valid (not expired)
    if command_exists openssl; then
        if openssl x509 -checkend 86400 -noout -in "$CERT_FILE" 2>/dev/null; then
            echo "✅ Certificates valid (expires in >24 hours)"
        else
            echo "⚠️  Certificates expired or expiring soon. Regenerating..."
            if [ -f "scripts/certs/generate-certs.sh" ]; then
                ensure_executable "scripts/certs/generate-certs.sh"
                ./scripts/certs/generate-certs.sh
            fi
        fi
    else
        echo "✅ Certificates exist (validity not checked)"
    fi
fi

echo ""
echo "🏠 Step 4: Local domain setup..."
echo "--------------------------------"
load_config

# Check if domain is already in /etc/hosts
if grep -q "$LOCAL_DOMAIN" /etc/hosts 2>/dev/null; then
    echo "✅ Local domain already configured in /etc/hosts"
else
    echo "Adding $LOCAL_DOMAIN to /etc/hosts..."
    if [ -f "scripts/setup-local-domain.sh" ]; then
        ensure_executable "scripts/setup-local-domain.sh"
        ./scripts/setup-local-domain.sh
    else
        echo "⚠️  Warning: Local domain setup script not found"
    fi
fi

echo ""
echo "🔧 Step 5: Environment files..."
echo "-------------------------------"
ENV_UPDATED=false

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env from .env.example"
    else
        load_config
        cat > .env << EOF
# Apple Authentication
PUBLIC_APPLE_CLIENT_ID=your_apple_client_id_here
PUBLIC_ADMIN_APPLE_SUB=your_admin_apple_sub_here

# API Configuration
PUBLIC_API_URL=https://${LOCAL_DOMAIN}:${BACKEND_HTTPS_PORT}/api

# Environment
NODE_ENV=development
EOF
        echo "✅ Created default .env file"
    fi
    ENV_UPDATED=true
    echo "⚠️  Please update .env with your actual values"
else
    echo "✅ .env file exists"
fi

echo ""
echo "🔧 Step 6: Backend setup..."
echo "---------------------------"
if [ -d "packages/backend" ]; then
    cd packages/backend

    if [ ! -f ".env" ]; then
        echo "Creating backend .env..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            echo "✅ Created backend .env from .env.example"
        else
            load_config
            cat > .env << EOF
# Server Configuration
PORT=${BACKEND_HTTP_PORT}
HOST=0.0.0.0

# CORS Configuration
ALLOWED_ORIGINS=https://${LOCAL_DOMAIN}:${BACKEND_HTTPS_PORT},https://${LOCAL_DOMAIN}:${FRONTEND_PORT}

# Apple Auth
APPLE_CLIENT_ID=your_apple_client_id_here
APPLE_TEAM_ID=your_apple_team_id_here
APPLE_KEY_ID=your_apple_key_id_here
APPLE_PRIVATE_KEY_PATH=./keys/AuthKey.p8

# AWS Configuration (Optional for local dev)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
EOF
            echo "✅ Created backend .env file"
        fi
        ENV_UPDATED=true
        echo "⚠️  Please update backend .env with your actual values"
    else
        echo "✅ Backend .env exists"
    fi

    # Only install Go deps if go.mod changed or vendor doesn't exist
    if command_exists go; then
        if [ "$FORCE_UPDATE" = true ] || [ ! -d "vendor" ] || [ "go.mod" -nt "vendor" ] 2>/dev/null; then
            echo "Installing Go dependencies..."
            go mod download
            go mod tidy
            echo "✅ Go dependencies updated"
        else
            echo "✅ Go dependencies up to date"
        fi
    else
        echo "⚠️  Warning: Go not found. Please install Go to run the backend"
    fi

    cd "$PROJECT_ROOT"
else
    echo "⚠️  Warning: Backend directory not found"
fi

echo ""
echo "🔧 Step 7: HTTPS proxy script..."
echo "--------------------------------"
if [ ! -f "scripts/dev/https-proxy.cjs" ]; then
    echo "Creating HTTPS proxy script..."
    load_config
    cat > scripts/dev/https-proxy.cjs << 'EOF'
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

require('dotenv').config();
const configPath = path.join(__dirname, '..', '..', '.domain.config');
let config = {};

if (fs.existsSync(configPath)) {
  const configContent = fs.readFileSync(configPath, 'utf8');
  configContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      if (key && value) {
        config[key.trim()] = value.trim();
      }
    }
  });
}

const LOCAL_DOMAIN = config.LOCAL_DOMAIN || 'dev.ilikeyacut.com';
const FRONTEND_PORT = parseInt(config.FRONTEND_PORT || '4321');
const BACKEND_HTTP_PORT = parseInt(config.BACKEND_HTTP_PORT || '8080');
const BACKEND_HTTPS_PORT = parseInt(config.BACKEND_HTTPS_PORT || '3000');

const options = {
  key: fs.readFileSync(path.join(__dirname, '..', '..', 'certs', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '..', '..', 'certs', 'cert.pem'))
};

const server = https.createServer(options, (req, res) => {
  const isApiRequest = req.url.startsWith('/api');
  const targetPort = isApiRequest ? BACKEND_HTTP_PORT : FRONTEND_PORT;
  const targetPath = isApiRequest ? req.url.slice(4) : req.url;

  const proxyOptions = {
    hostname: 'localhost',
    port: targetPort,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: `localhost:${targetPort}`
    }
  };

  const proxy = http.request(proxyOptions, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxy.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxy);
});

server.listen(BACKEND_HTTPS_PORT, () => {
  console.log(`🔐 HTTPS Proxy running at https://${LOCAL_DOMAIN}:${BACKEND_HTTPS_PORT}`);
  console.log(`   Frontend (/) -> http://localhost:${FRONTEND_PORT}`);
  console.log(`   Backend (/api) -> http://localhost:${BACKEND_HTTP_PORT}`);
});
EOF
    chmod +x scripts/dev/https-proxy.cjs
    echo "✅ Created HTTPS proxy script"
else
    echo "✅ HTTPS proxy script exists"
fi

echo ""
echo "===================================="
if [ "$ENV_UPDATED" = true ]; then
    echo "⚠️  Setup Complete - Action Required!"
    echo "===================================="
    echo ""
    echo "Please update these files with your actual values:"
    echo "  1. .env - Apple credentials and API configuration"
    echo "  2. packages/backend/.env - Backend configuration"
else
    echo "✅ Setup Complete - Ready to Run!"
    echo "===================================="
fi
echo ""
echo "Run 'pnpm dev' to start all development servers"
echo ""
echo "Your app will be available at:"
load_config
echo "  https://${LOCAL_DOMAIN}:${BACKEND_HTTPS_PORT}"
echo ""
echo "💡 Tip: Run with --force to rebuild everything:"
echo "   pnpm setup:dev:force"
echo ""
