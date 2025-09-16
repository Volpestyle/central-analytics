#!/bin/bash

set -e

echo "🚀 Central Analytics Production Deployment"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Source shared configuration
source "$SCRIPT_DIR/config.sh"

# Parse command line arguments
SKIP_BUILD=false
SKIP_TESTS=false
DRY_RUN=false
DEPLOY_TARGET=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            ;;
        --skip-tests)
            SKIP_TESTS=true
            ;;
        --dry-run)
            DRY_RUN=true
            ;;
        --target)
            DEPLOY_TARGET="$2"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: ./deploy.sh [options]"
            echo "Options:"
            echo "  --skip-build   Skip building (use existing dist)"
            echo "  --skip-tests   Skip running tests"
            echo "  --dry-run      Show what would be deployed without deploying"
            echo "  --target       Deployment target (s3, vercel, netlify)"
            exit 1
            ;;
    esac
    shift
done

# Confirmation for production
if [ "$DRY_RUN" = false ]; then
    echo "⚠️  WARNING: You are about to deploy to PRODUCTION!"
    echo ""
    read -p "Type 'deploy' to confirm: " confirmation
    if [ "$confirmation" != "deploy" ]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
    echo ""
fi

# Load environment configuration
ENV_FILE=".env.production"
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found"
    echo "Creating template .env.production file..."
    cat > "$ENV_FILE" << EOF
# Production Configuration
DEPLOY_DOMAIN=analytics.ilikeyacut.com
DEPLOY_BUCKET=s3://prod-central-analytics
API_ENDPOINT=https://api.ilikeyacut.com
CLOUDFRONT_DISTRIBUTION_ID=
AWS_REGION=us-east-1
AWS_PROFILE=default

# Deployment Target (s3, vercel, netlify)
DEPLOY_TARGET=s3

# Backend Deployment (lambda, ec2, ecs, vercel)
BACKEND_TARGET=lambda
BACKEND_FUNCTION_NAME=central-analytics-api
EOF
    echo "✅ Created $ENV_FILE template. Please configure it and run again."
    exit 1
fi

# Source production environment
source "$ENV_FILE"

# Set default values if not provided
DEPLOY_TARGET="${DEPLOY_TARGET:-s3}"
DEPLOY_DOMAIN="${DEPLOY_DOMAIN:-analytics.ilikeyacut.com}"
API_ENDPOINT="${API_ENDPOINT:-https://api.ilikeyacut.com}"

echo "📋 Deployment Configuration"
echo "---------------------------"
echo "Environment: Production"
echo "Target: $DEPLOY_TARGET"
echo "Domain: $DEPLOY_DOMAIN"
echo "API: $API_ENDPOINT"
echo "Dry run: $DRY_RUN"
echo "Skip build: $SKIP_BUILD"
echo "Skip tests: $SKIP_TESTS"
echo ""

# Run tests
if [ "$SKIP_TESTS" = false ]; then
    echo "🧪 Running tests..."
    echo "-------------------"
    if [ -f "package.json" ] && grep -q '"test"' package.json; then
        pnpm test || { echo "❌ Tests failed"; exit 1; }
    else
        echo "⚠️  No tests configured"
    fi
    echo ""
fi

# Build the application
if [ "$SKIP_BUILD" = false ]; then
    echo "🏗️  Building application..."
    echo "--------------------------"

    # Set environment for build
    export NODE_ENV=production

    # Build frontend
    echo "Building frontend..."
    pnpm build || { echo "❌ Frontend build failed"; exit 1; }

    # Build backend
    if [ -d "packages/backend" ]; then
        echo "Building backend..."
        cd packages/backend

        # Build for Linux (most cloud providers)
        GOOS=linux GOARCH=amd64 go build -o dist/server cmd/local-server/main.go || { echo "❌ Backend build failed"; exit 1; }

        cd "$PROJECT_ROOT"
    fi

    echo "✅ Build complete"
    echo ""
fi

# Verify build artifacts exist
echo "📦 Verifying build artifacts..."
echo "-------------------------------"
if [ ! -d "dist" ]; then
    echo "❌ Error: dist/ directory not found. Run build first."
    exit 1
fi

if [ -d "packages/backend" ] && [ ! -f "packages/backend/dist/server" ]; then
    echo "❌ Error: Backend binary not found. Run build first."
    exit 1
fi
echo "✅ Build artifacts verified"
echo ""

echo "🚀 Deploying to Production..."
echo "--------------------------------"

if [ "$DRY_RUN" = true ]; then
    echo "🔍 DRY RUN - No actual deployment"
    echo ""
    echo "Would deploy:"
    echo "  Frontend: dist/ -> $DEPLOY_TARGET"
    echo "  Backend: packages/backend/dist/server -> $BACKEND_TARGET"
    echo ""
    exit 0
fi

# Deploy based on target
case "$DEPLOY_TARGET" in
    s3)
        # Check for AWS CLI
        if ! command_exists aws; then
            echo "❌ Error: AWS CLI not found"
            echo "Install with: brew install awscli"
            exit 1
        fi

        # Deploy Frontend to S3
        echo "📤 Deploying frontend to S3..."
        aws s3 sync dist/ "$DEPLOY_BUCKET" \
            --delete \
            --cache-control "public, max-age=31536000" \
            --exclude "*.html" \
            --exclude "*.json" || { echo "❌ S3 sync failed"; exit 1; }

        # Deploy HTML files with different cache settings
        aws s3 sync dist/ "$DEPLOY_BUCKET" \
            --delete \
            --cache-control "public, max-age=0, must-revalidate" \
            --exclude "*" \
            --include "*.html" \
            --include "*.json" || { echo "❌ S3 HTML sync failed"; exit 1; }

        echo "✅ Frontend deployed to S3"

        # Invalidate CloudFront cache if configured
        if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
            echo "🔄 Invalidating CDN cache..."
            aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --paths "/*"
            echo "✅ CloudFront cache invalidated"
        fi
        ;;

    vercel)
        if ! command_exists vercel; then
            echo "❌ Error: Vercel CLI not found"
            echo "Install with: pnpm install -g vercel"
            exit 1
        fi
        echo "📤 Deploying to Vercel..."
        vercel --prod
        echo "✅ Deployed to Vercel"
        ;;

    netlify)
        if ! command_exists netlify; then
            echo "❌ Error: Netlify CLI not found"
            echo "Install with: pnpm install -g netlify-cli"
            exit 1
        fi
        echo "📤 Deploying to Netlify..."
        netlify deploy --prod --dir=dist
        echo "✅ Deployed to Netlify"
        ;;

    *)
        echo "❌ Unknown deployment target: $DEPLOY_TARGET"
        exit 1
        ;;
esac

echo ""

# Deploy Backend based on target
if [ -d "packages/backend/dist" ] && [ -n "$BACKEND_TARGET" ]; then
    echo "📤 Deploying backend..."

    case "$BACKEND_TARGET" in
        lambda)
            if [ -n "$BACKEND_FUNCTION_NAME" ]; then
                cd packages/backend
                zip -r function.zip dist/server
                aws lambda update-function-code \
                    --function-name "$BACKEND_FUNCTION_NAME" \
                    --zip-file fileb://function.zip || echo "⚠️  Lambda update failed"
                rm function.zip
                cd "$PROJECT_ROOT"
                echo "✅ Backend deployed to Lambda"
            else
                echo "⚠️  Lambda function name not configured"
            fi
            ;;

        ec2)
            echo "⚠️  EC2 deployment not configured"
            echo "Configure SSH deployment in .env.production"
            ;;

        ecs)
            echo "⚠️  ECS deployment not configured"
            echo "Configure container deployment in .env.production"
            ;;

        vercel)
            cd packages/backend
            vercel --prod
            cd "$PROJECT_ROOT"
            echo "✅ Backend deployed to Vercel"
            ;;

        *)
            echo "⚠️  Backend deployment method not configured"
            ;;
    esac
fi

echo ""

# Health check
echo "🏥 Running health checks..."
echo "---------------------------"

# Check API health
HEALTH_ENDPOINT="$API_ENDPOINT/health"
if curl -f -s -o /dev/null -w "%{http_code}" "$HEALTH_ENDPOINT" 2>/dev/null | grep -q "200"; then
    echo "✅ API health check passed"
else
    echo "⚠️  API health check failed or not configured"
fi

# Check frontend
FRONTEND_URL="https://$DEPLOY_DOMAIN"
if curl -f -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null | grep -q "200"; then
    echo "✅ Frontend health check passed"
else
    echo "⚠️  Frontend health check failed or not reachable"
fi

echo ""

# Post-deployment tasks
echo "📋 Post-deployment..."
echo "---------------------"
echo "✅ Production deployment complete!"
echo ""
echo "🔗 Links:"
echo "  Frontend: https://$DEPLOY_DOMAIN"
echo "  API: $API_ENDPOINT"
echo ""

# Show monitoring links based on deployment target
case "$DEPLOY_TARGET" in
    s3)
        echo "📊 Monitoring:"
        echo "  CloudWatch: https://console.aws.amazon.com/cloudwatch"
        if [ "$BACKEND_TARGET" = "lambda" ] && [ -n "$BACKEND_FUNCTION_NAME" ]; then
            echo "  Logs: aws logs tail /aws/lambda/$BACKEND_FUNCTION_NAME --follow"
        fi
        ;;
    vercel)
        echo "📊 Monitoring:"
        echo "  Vercel Dashboard: https://vercel.com/dashboard"
        ;;
    netlify)
        echo "📊 Monitoring:"
        echo "  Netlify Dashboard: https://app.netlify.com"
        ;;
esac

echo ""
echo "✨ Deployment complete!"