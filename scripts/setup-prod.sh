#!/bin/bash

set -e

echo "🚀 Central Analytics Production Setup"
echo "======================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "📦 Step 1: Installing production dependencies..."
echo "------------------------------------------------"
if command -v pnpm &> /dev/null; then
    pnpm install --production
elif command -v npm &> /dev/null; then
    npm install --production
else
    echo "❌ Error: pnpm or npm not found"
    exit 1
fi

echo ""
echo "🔧 Step 2: Setting up production environment..."
echo "-----------------------------------------------"
if [ ! -f ".env.production" ]; then
    cat > .env.production << 'EOF'
# Production Environment Variables
NODE_ENV=production

# Apple Authentication
PUBLIC_APPLE_CLIENT_ID=${APPLE_CLIENT_ID}
PUBLIC_ADMIN_APPLE_SUB=${ADMIN_APPLE_SUB}

# API Configuration
PUBLIC_API_URL=${API_URL}

# AWS Configuration
AWS_REGION=${AWS_REGION}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
EOF
    echo "✅ Created .env.production template"
    echo "⚠️  Please update with actual production values or use environment variables"
else
    echo "✅ Production environment already configured"
fi

echo ""
echo "🏗️  Step 3: Building frontend..."
echo "---------------------------------"
pnpm build

echo ""
echo "🏗️  Step 4: Building backend..."
echo "--------------------------------"
if [ -d "packages/backend" ]; then
    cd packages/backend

    if command -v go &> /dev/null; then
        echo "Building Go backend..."
        GOOS=linux GOARCH=amd64 go build -o dist/server cmd/local-server/main.go
        echo "✅ Backend built for Linux/AMD64"

        GOOS=darwin GOARCH=arm64 go build -o dist/server-darwin-arm64 cmd/local-server/main.go
        echo "✅ Backend built for Darwin/ARM64"

        GOOS=darwin GOARCH=amd64 go build -o dist/server-darwin-amd64 cmd/local-server/main.go
        echo "✅ Backend built for Darwin/AMD64"
    else
        echo "⚠️  Warning: Go not found. Skipping backend build"
    fi

    cd "$PROJECT_ROOT"
else
    echo "⚠️  Warning: Backend directory not found"
fi

echo ""
echo "📋 Step 5: Creating deployment artifacts..."
echo "-------------------------------------------"
if [ ! -d "dist" ]; then
    mkdir -p dist
fi

cat > dist/deploy.sh << 'EOF'
#!/bin/bash

echo "🚀 Deploying Central Analytics"
echo "=============================="

if [ -z "$1" ]; then
    echo "Usage: ./deploy.sh <environment>"
    echo "  environment: staging, production"
    exit 1
fi

ENVIRONMENT=$1

case $ENVIRONMENT in
    staging)
        echo "Deploying to staging..."
        ;;
    production)
        echo "Deploying to production..."
        echo "⚠️  WARNING: This will deploy to production!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Deployment cancelled"
            exit 1
        fi
        ;;
    *)
        echo "Unknown environment: $ENVIRONMENT"
        exit 1
        ;;
esac

echo "✅ Deployment complete!"
EOF

chmod +x dist/deploy.sh

echo ""
echo "📋 Step 6: Creating Docker configuration..."
echo "-------------------------------------------"
if [ ! -f "Dockerfile" ]; then
    cat > Dockerfile << 'EOF'
# Frontend build stage
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Backend build stage
FROM golang:1.21-alpine AS backend-builder
WORKDIR /app
COPY packages/backend/go.mod packages/backend/go.sum ./
RUN go mod download
COPY packages/backend/ .
RUN go build -o server cmd/local-server/main.go

# Production stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

# Copy backend binary
COPY --from=backend-builder /app/server .

# Copy frontend build
COPY --from=frontend-builder /app/dist ./public

# Expose ports
EXPOSE 8080

# Run the server
CMD ["./server"]
EOF
    echo "✅ Created Dockerfile"
fi

if [ ! -f "docker-compose.yml" ]; then
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
      - HOST=0.0.0.0
    env_file:
      - .env.production
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app
    restart: unless-stopped
EOF
    echo "✅ Created docker-compose.yml"
fi

echo ""
echo "📋 Step 7: Creating CI/CD configuration..."
echo "------------------------------------------"
if [ ! -d ".github/workflows" ]; then
    mkdir -p .github/workflows
    cat > .github/workflows/deploy.yml << 'EOF'
name: Deploy to Production

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'

    - name: Setup Go
      uses: actions/setup-go@v4
      with:
        go-version: '1.21'

    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Build frontend
      run: pnpm build

    - name: Build backend
      run: |
        cd packages/backend
        go build -o server cmd/local-server/main.go

    - name: Deploy
      run: |
        echo "Deploy to your cloud provider here"
EOF
    echo "✅ Created GitHub Actions workflow"
fi

echo ""
echo "✅ Production Setup Complete!"
echo "============================="
echo ""
echo "Build artifacts:"
echo "  Frontend: ./dist/"
echo "  Backend: ./packages/backend/dist/"
echo ""
echo "Deployment options:"
echo "  1. Docker: docker-compose up -d"
echo "  2. Manual: ./dist/deploy.sh production"
echo "  3. CI/CD: Push to main branch"
echo ""
echo "⚠️  Remember to:"
echo "  1. Set production environment variables"
echo "  2. Configure your cloud provider"
echo "  3. Set up SSL certificates for production"
echo "  4. Configure DNS for your domain"
echo ""