.PHONY: all build clean deploy test

# Variables
FUNCTIONS := auth metrics appstore
BUILD_DIR := build
DEPLOY_ENV ?= dev
PORT ?= 8080

# Go build flags
GOFLAGS := -ldflags="-s -w"
GOOS := linux
GOARCH := amd64

# AWS settings
AWS_REGION ?= us-east-1
STACK_NAME := central-analytics-$(DEPLOY_ENV)

all: clean build

# Build all Lambda functions
build: $(FUNCTIONS)

$(FUNCTIONS):
	@echo "Building Lambda function: $@"
	@mkdir -p $(BUILD_DIR)/$@
	GOOS=$(GOOS) GOARCH=$(GOARCH) go build $(GOFLAGS) -o $(BUILD_DIR)/$@/bootstrap ./cmd/$@
	@cd $(BUILD_DIR)/$@ && zip -q function.zip bootstrap
	@rm $(BUILD_DIR)/$@/bootstrap
	@echo "Built $@ successfully"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)

# Run tests
test:
	@echo "Running tests..."
	@go test -v ./...

# Format code
fmt:
	@echo "Formatting code..."
	@go fmt ./...
	@goimports -w .

# Lint code
lint:
	@echo "Linting code..."
	@golangci-lint run

# Download dependencies
deps:
	@echo "Downloading dependencies..."
	@go mod download
	@go mod tidy

# Deploy using Serverless Framework
deploy-serverless: build
	@echo "Deploying with Serverless Framework to $(DEPLOY_ENV)..."
	@serverless deploy --stage $(DEPLOY_ENV) --region $(AWS_REGION)

# Deploy using Terraform
deploy-terraform: build
	@echo "Deploying with Terraform to $(DEPLOY_ENV)..."
	@cd deploy/terraform && \
		terraform init && \
		terraform workspace select $(DEPLOY_ENV) || terraform workspace new $(DEPLOY_ENV) && \
		terraform apply -var="environment=$(DEPLOY_ENV)" -var="region=$(AWS_REGION)"

# Deploy using AWS SAM
deploy-sam: build
	@echo "Deploying with SAM to $(DEPLOY_ENV)..."
	@sam deploy \
		--stack-name $(STACK_NAME) \
		--s3-bucket central-analytics-deployments-$(DEPLOY_ENV) \
		--capabilities CAPABILITY_IAM \
		--region $(AWS_REGION) \
		--parameter-overrides Environment=$(DEPLOY_ENV)

# Run local HTTP server
run:
	@echo "Starting local HTTP server on port $(PORT)..."
	@go run cmd/local-server/main.go

# Run local server with hot reload (requires air)
dev:
	@echo "Starting development server with hot reload on port $(PORT)..."
	@which air > /dev/null 2>&1 || (echo "Installing air..." && go install github.com/air-verse/air@latest)
	@air

# Local development with SAM
local:
	@echo "Starting local API with SAM..."
	@sam local start-api --env-vars env.json

# Update function code only (faster deployment)
update-function:
	@if [ -z "$(FUNCTION)" ]; then \
		echo "Please specify FUNCTION=<function-name>"; \
		exit 1; \
	fi
	@echo "Updating Lambda function: $(FUNCTION)"
	@make $(FUNCTION)
	@aws lambda update-function-code \
		--function-name central-analytics-$(DEPLOY_ENV)-$(FUNCTION) \
		--zip-file fileb://$(BUILD_DIR)/$(FUNCTION)/function.zip \
		--region $(AWS_REGION)

# Create secrets in AWS Secrets Manager
create-secrets:
	@echo "Creating secrets in AWS Secrets Manager..."
	@aws secretsmanager create-secret \
		--name central-analytics/jwt-secret \
		--secret-string "$$(openssl rand -base64 32)" \
		--region $(AWS_REGION) || true
	@echo "JWT secret created. Please update App Store Connect and admin Apple ID secrets manually."

# View logs for a function
logs:
	@if [ -z "$(FUNCTION)" ]; then \
		echo "Please specify FUNCTION=<function-name>"; \
		exit 1; \
	fi
	@echo "Fetching logs for $(FUNCTION)..."
	@aws logs tail /aws/lambda/central-analytics-$(DEPLOY_ENV)-$(FUNCTION) \
		--follow \
		--region $(AWS_REGION)

# Run integration tests
integration-test:
	@echo "Running integration tests..."
	@go test -v -tags=integration ./tests/...

# Generate API documentation
docs:
	@echo "Generating API documentation..."
	@swag init -g cmd/auth/main.go -o docs/

# Performance test
perf-test:
	@echo "Running performance tests..."
	@artillery run tests/performance/load-test.yml

# Security scan
security:
	@echo "Running security scan..."
	@gosec ./...
	@trivy fs .

# Docker build for local testing
docker-build:
	@echo "Building Docker image..."
	@docker build -t central-analytics-backend:$(DEPLOY_ENV) .

# Help
help:
	@echo "Available targets:"
	@echo "  make run            - Run local HTTP server"
	@echo "  make dev            - Run development server with hot reload"
	@echo "  make build          - Build all Lambda functions"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make test           - Run unit tests"
	@echo "  make deploy-serverless - Deploy using Serverless Framework"
	@echo "  make deploy-terraform  - Deploy using Terraform"
	@echo "  make deploy-sam     - Deploy using AWS SAM"
	@echo "  make local          - Start local API with SAM"
	@echo "  make update-function FUNCTION=name - Update specific function"
	@echo "  make logs FUNCTION=name - View function logs"
	@echo "  make create-secrets - Create AWS secrets"
	@echo ""
	@echo "Environment variables:"
	@echo "  PORT                - HTTP server port (default: 8080)"
	@echo "  DEPLOY_ENV          - Deployment environment (default: dev)"
	@echo "  AWS_REGION          - AWS region (default: us-east-1)"