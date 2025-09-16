.PHONY: help build run test clean deploy-lambda

# Variables
BINARY_NAME=central-analytics-server
LAMBDA_FUNCTION=central-analytics-metrics
GO_VERSION=1.22

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

deps: ## Download Go dependencies
	go mod download
	go mod tidy

build: ## Build the local server binary
	go build -o $(BINARY_NAME) cmd/local-server/main.go

run: ## Run the local server
	go run cmd/local-server/main.go

run-dev: ## Run with development environment
	AWS_REGION=us-east-1 \
	PORT=8080 \
	JWT_SECRET=development-secret \
	go run cmd/local-server/main.go

test: ## Run tests
	go test -v ./...

test-coverage: ## Run tests with coverage
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out

lint: ## Run linter
	@which golangci-lint > /dev/null || (echo "Installing golangci-lint..." && go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest)
	golangci-lint run

format: ## Format code
	go fmt ./...
	gofmt -s -w .

build-lambda: ## Build Lambda function
	GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o bootstrap cmd/metrics/main.go
	zip metrics.zip bootstrap
	rm bootstrap

deploy-lambda: build-lambda ## Deploy Lambda function to AWS
	aws lambda update-function-code \
		--function-name $(LAMBDA_FUNCTION) \
		--zip-file fileb://metrics.zip
	rm metrics.zip

docker-build: ## Build Docker image
	docker build -t central-analytics-backend .

docker-run: ## Run in Docker container
	docker run -p 8080:8080 \
		-e AWS_REGION=us-east-1 \
		-v ~/.aws:/root/.aws:ro \
		central-analytics-backend

clean: ## Clean build artifacts
	rm -f $(BINARY_NAME)
	rm -f bootstrap
	rm -f *.zip
	rm -f coverage.out
	go clean -cache

watch: ## Run with file watcher (requires entr)
	@which entr > /dev/null || (echo "Please install entr: brew install entr" && exit 1)
	find . -name '*.go' | entr -r make run

test-api: ## Test API endpoints
	./scripts/test-api.sh

# Development helpers
.PHONY: dev-setup
dev-setup: ## Setup development environment
	@echo "Setting up development environment..."
	@echo "1. Installing dependencies..."
	@make deps
	@echo "2. Running linter..."
	@make lint
	@echo "3. Running tests..."
	@make test
	@echo "✅ Development environment ready!"

.PHONY: check-aws
check-aws: ## Check AWS credentials
	@echo "Checking AWS configuration..."
	@aws sts get-caller-identity > /dev/null 2>&1 && \
		echo "✅ AWS credentials configured" || \
		echo "❌ AWS credentials not configured. Please run: aws configure"

.PHONY: logs-lambda
logs-lambda: ## Tail Lambda function logs
	aws logs tail /aws/lambda/$(LAMBDA_FUNCTION) --follow

# Benchmarks
.PHONY: bench
bench: ## Run benchmarks
	go test -bench=. -benchmem ./...

# Security
.PHONY: security
security: ## Run security checks
	@which gosec > /dev/null || (echo "Installing gosec..." && go install github.com/securego/gosec/v2/cmd/gosec@latest)
	gosec ./...