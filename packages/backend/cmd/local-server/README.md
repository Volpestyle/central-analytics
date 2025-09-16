central-analytics/packages/backend/cmd/local-server/README.md

# Local Server for Central Analytics Backend

This is a refactored local development server for the Central Analytics backend that simulates production environments as closely as possible while following modern Go development practices.

## Features

- **Production-Simulation**: Uses real AWS services, authentication, and configuration loading
- **Dependency Injection**: Clean architecture with injectable dependencies for testability
- **Structured Logging**: slog-based logging with configurable levels
- **Graceful Shutdown**: Proper signal handling and cleanup
- **Configuration Management**: Environment-based configuration with validation
- **Modern Go Practices**: Context handling, generics support, proper error handling

## Architecture

The application follows a clean architecture pattern:

- `main.go`: Entry point with server lifecycle management
- `config.go`: Configuration loading and validation
- `app.go`: Application container with dependency injection

### Key Components

- **Config**: Environment-based configuration with defaults
- **App Container**: Holds all dependencies (AWS clients, handlers, logger)
- **Handlers**: Business logic handlers with injected dependencies
- **Middleware**: Authentication, CORS, and other HTTP middleware

## Prerequisites

- Go 1.21+
- AWS CLI configured (for real AWS services)
- Optional: App Store Connect credentials for full functionality

## Running the Server

### Quick Start (Using pnpm commands from project root)

```bash
# From project root (recommended)
cd ../../../..  # Navigate to project root

# Run complete setup (one-time)
pnpm setup:dev

# Start all servers (frontend, backend, HTTPS proxy)
pnpm dev

# Or run just the backend
pnpm dev:backend
```

### Manual Setup

```bash
# Set environment variables (optional, has defaults)
export PORT=8080
export ENV=development
export JWT_SECRET=your-jwt-secret

# Run the server directly
go run cmd/local-server/main.go cmd/local-server/config.go cmd/local-server/app.go
```

### Production Simulation

```bash
# Full production simulation with real services
export ENV=production
export AWS_REGION=us-east-1
export JWT_SECRET=real-secret-from-secrets-manager
export ADMIN_APPLE_SUB=your-admin-apple-id
export APP_STORE_KEY_ID=your-key-id
export APP_STORE_ISSUER_ID=your-issuer-id
export APP_STORE_PRIVATE_KEY=your-private-key

go run cmd/local-server/main.go cmd/local-server/config.go cmd/local-server/app.go
```

## Configuration

Configuration is loaded from environment variables with sensible defaults:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `READ_TIMEOUT` | `30s` | HTTP read timeout |
| `WRITE_TIMEOUT` | `30s` | HTTP write timeout |
| `IDLE_TIMEOUT` | `120s` | HTTP idle timeout |
| `ENV` | `development` | Environment (development/production) |
| `AWS_REGION` | `us-east-1` | AWS region for services |
| `JWT_SECRET` | dev-secret | JWT signing secret |
| `ADMIN_APPLE_SUB` | dev-admin-sub | Admin Apple user ID |
| `APP_STORE_KEY_ID` | - | App Store Connect private key ID |
| `APP_STORE_ISSUER_ID` | - | App Store Connect issuer ID |
| `APP_STORE_PRIVATE_KEY` | - | App Store Connect private key |
| `DEFAULT_APP_ID` | ilikeyacut | Default app ID for App Store |

## API Endpoints

All endpoints support the same interface as production:

### Authentication
- `POST /api/auth/apple` - Apple Sign-In (development fallback)

### Protected Endpoints (require JWT)
- `GET /api/apps/{appId}/aws/lambda` - Lambda metrics
- `GET /api/apps/{appId}/aws/apigateway` - API Gateway metrics  
- `GET /api/apps/{appId}/aws/dynamodb` - DynamoDB metrics
- `GET /api/apps/{appId}/aws/costs` - AWS cost analytics
- `GET /api/apps/{appId}/appstore/downloads` - App Store downloads
- `GET /api/apps/{appId}/appstore/revenue` - App Store revenue
- `GET /api/apps/{appId}/health` - Service health status

### Analytics Endpoints
- `GET /api/apps/{appId}/metrics/aggregated` - All metrics summary
- `GET /api/apps/{appId}/timeseries/*` - Time series data
- `GET /api/apps/{appId}/metrics/*` - ECharts-formatted data

### Health Checks
- `GET /health` - Basic health check
- `GET /api/health` - Authenticated health check

## Development vs Production Mode

### Development Mode
- Apple auth generates mock JWT tokens
- App Store services may be mocked if credentials missing
- Debug logging enabled
- CORS allows localhost origins

### Production Mode  
- Real Apple ID token verification
- Full App Store Connect API integration
- Info-level logging
- Strict CORS policies

## AWS Integration

The server integrates with real AWS services:

- **CloudWatch**: Real metrics collection
- **Cost Explorer**: Actual cost data and forecasting
- **DynamoDB**: Live table metrics and descriptions
- **Lambda**: Function performance data

Configure AWS credentials using standard methods:
- AWS CLI (`aws configure`)
- Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- IAM roles (when running on EC2)

## Error Handling

- Structured error responses with proper HTTP status codes
- Comprehensive logging with contextual information
- Graceful degradation when optional services are unavailable
- Configuration validation on startup

## Testing

The refactored architecture enables better testing:

- Dependency injection allows mock implementations
- Handlers can be tested independently
- Configuration can be overridden for tests

Example test setup:

```go
cfg := &Config{Port: "8080", Environment: "test"}
app, _ := NewApp(cfg)
// Test with mocked dependencies
```

## Security Considerations

- JWT secrets must be strong and rotated regularly
- AWS credentials should use IAM roles in production
- Apple authentication validates tokens properly in production mode
- CORS policies restrict origins appropriately

## Monitoring

- Structured logs include request IDs, timestamps, and error details
- Health endpoints provide service status
- AWS integration provides real infrastructure metrics
- Graceful shutdown handles signals properly

## Building and Deployment

```bash
# Build
go build -o local-server cmd/local-server/*.go

# Run
./local-server
```

For production deployment, use the compiled binary with appropriate environment variables and systemd/service management for process supervision.