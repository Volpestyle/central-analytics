#!/bin/bash

# Central Analytics Backend Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/../.."
BUILD_DIR="$BACKEND_DIR/build"

# Default values
ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-us-east-1}
DEPLOY_METHOD=${2:-serverless}

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."

    # Check Go
    if ! command -v go &> /dev/null; then
        log_error "Go is not installed. Please install Go 1.22 or later."
        exit 1
    fi

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install AWS CLI."
        exit 1
    fi

    # Check deployment tool
    case $DEPLOY_METHOD in
        serverless)
            if ! command -v serverless &> /dev/null; then
                log_error "Serverless Framework is not installed. Run: npm install -g serverless"
                exit 1
            fi
            ;;
        terraform)
            if ! command -v terraform &> /dev/null; then
                log_error "Terraform is not installed. Please install Terraform."
                exit 1
            fi
            ;;
        sam)
            if ! command -v sam &> /dev/null; then
                log_error "AWS SAM CLI is not installed. Please install SAM CLI."
                exit 1
            fi
            ;;
    esac

    log_info "All requirements met!"
}

check_aws_credentials() {
    log_info "Checking AWS credentials..."

    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Run: aws configure"
        exit 1
    fi

    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    log_info "Using AWS Account: $ACCOUNT_ID"
}

check_secrets() {
    log_info "Checking AWS Secrets Manager secrets..."

    # Check if JWT secret exists
    if ! aws secretsmanager describe-secret --secret-id "central-analytics/jwt-secret" --region $REGION &> /dev/null; then
        log_warn "JWT secret not found. Creating..."
        JWT_SECRET=$(openssl rand -base64 32)
        aws secretsmanager create-secret \
            --name "central-analytics/jwt-secret" \
            --secret-string "$JWT_SECRET" \
            --region $REGION
        log_info "JWT secret created"
    fi

    # Check if App Store Connect secret exists
    if ! aws secretsmanager describe-secret --secret-id "central-analytics/appstore-connect" --region $REGION &> /dev/null; then
        log_warn "App Store Connect secret not found."
        log_warn "Please create it manually with the following structure:"
        echo '{'
        echo '  "keyId": "YOUR_KEY_ID",'
        echo '  "issuerId": "YOUR_ISSUER_ID",'
        echo '  "privateKey": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"'
        echo '}'
    fi
}

build_functions() {
    log_info "Building Lambda functions..."

    cd "$BACKEND_DIR"

    # Clean previous builds
    make clean

    # Build all functions
    make build

    if [ $? -eq 0 ]; then
        log_info "Build successful!"
    else
        log_error "Build failed!"
        exit 1
    fi
}

run_tests() {
    log_info "Running tests..."

    cd "$BACKEND_DIR"
    go test -v ./...

    if [ $? -eq 0 ]; then
        log_info "Tests passed!"
    else
        log_error "Tests failed!"
        exit 1
    fi
}

deploy_serverless() {
    log_info "Deploying with Serverless Framework to $ENVIRONMENT..."

    cd "$BACKEND_DIR"

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        npm install
    fi

    # Deploy
    serverless deploy --stage $ENVIRONMENT --region $REGION

    if [ $? -eq 0 ]; then
        log_info "Deployment successful!"

        # Get API endpoint
        API_URL=$(serverless info --stage $ENVIRONMENT --region $REGION | grep "endpoint:" | head -1 | awk '{print $2}')
        log_info "API Endpoint: $API_URL"
    else
        log_error "Deployment failed!"
        exit 1
    fi
}

deploy_terraform() {
    log_info "Deploying with Terraform to $ENVIRONMENT..."

    cd "$BACKEND_DIR/deploy/terraform"

    # Initialize Terraform
    terraform init

    # Select or create workspace
    terraform workspace select $ENVIRONMENT 2>/dev/null || terraform workspace new $ENVIRONMENT

    # Plan deployment
    log_info "Planning deployment..."
    terraform plan -var="environment=$ENVIRONMENT" -var="region=$REGION" -out=tfplan

    # Apply deployment
    log_info "Applying deployment..."
    terraform apply tfplan

    if [ $? -eq 0 ]; then
        log_info "Deployment successful!"

        # Get outputs
        API_URL=$(terraform output -raw api_gateway_url)
        CLOUDFRONT_URL=$(terraform output -raw cloudfront_domain)

        log_info "API Endpoint: $API_URL"
        log_info "CloudFront URL: https://$CLOUDFRONT_URL"
    else
        log_error "Deployment failed!"
        exit 1
    fi
}

deploy_sam() {
    log_info "Deploying with AWS SAM to $ENVIRONMENT..."

    cd "$BACKEND_DIR"

    # Build with SAM
    sam build

    # Deploy
    sam deploy \
        --stack-name "central-analytics-$ENVIRONMENT" \
        --s3-bucket "central-analytics-deployments-$ENVIRONMENT" \
        --capabilities CAPABILITY_IAM \
        --region $REGION \
        --parameter-overrides "Environment=$ENVIRONMENT"

    if [ $? -eq 0 ]; then
        log_info "Deployment successful!"

        # Get API endpoint
        API_URL=$(aws cloudformation describe-stacks \
            --stack-name "central-analytics-$ENVIRONMENT" \
            --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
            --output text \
            --region $REGION)

        log_info "API Endpoint: $API_URL"
    else
        log_error "Deployment failed!"
        exit 1
    fi
}

verify_deployment() {
    log_info "Verifying deployment..."

    if [ -z "$API_URL" ]; then
        log_warn "API URL not found. Skipping verification."
        return
    fi

    # Test CORS preflight
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$API_URL/api/auth/verify")

    if [ "$RESPONSE" = "200" ]; then
        log_info "API is responding correctly!"
    else
        log_warn "API returned status code: $RESPONSE"
    fi
}

update_frontend_config() {
    log_info "Updating frontend configuration..."

    FRONTEND_CONFIG="$SCRIPT_DIR/../../../frontend/.env.$ENVIRONMENT"

    if [ -n "$API_URL" ]; then
        echo "VITE_API_URL=$API_URL" > "$FRONTEND_CONFIG"
        log_info "Frontend config updated: $FRONTEND_CONFIG"
    fi
}

# Main execution
main() {
    echo "========================================="
    echo "Central Analytics Backend Deployment"
    echo "========================================="
    echo "Environment: $ENVIRONMENT"
    echo "Region: $REGION"
    echo "Method: $DEPLOY_METHOD"
    echo "========================================="

    check_requirements
    check_aws_credentials
    check_secrets
    run_tests
    build_functions

    case $DEPLOY_METHOD in
        serverless)
            deploy_serverless
            ;;
        terraform)
            deploy_terraform
            ;;
        sam)
            deploy_sam
            ;;
        *)
            log_error "Unknown deployment method: $DEPLOY_METHOD"
            echo "Usage: $0 [environment] [method]"
            echo "  environment: dev|staging|prod (default: dev)"
            echo "  method: serverless|terraform|sam (default: serverless)"
            exit 1
            ;;
    esac

    verify_deployment
    update_frontend_config

    echo "========================================="
    log_info "Deployment complete!"

    if [ -n "$API_URL" ]; then
        echo ""
        echo "API Endpoint: $API_URL"
        echo ""
        echo "Test with:"
        echo "  curl -X OPTIONS $API_URL/api/auth/verify"
    fi

    if [ -n "$CLOUDFRONT_URL" ]; then
        echo "CloudFront URL: https://$CLOUDFRONT_URL"
    fi

    echo "========================================="
}

# Run main function
main