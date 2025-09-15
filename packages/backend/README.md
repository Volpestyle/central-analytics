# Central Analytics Backend

Go serverless backend for the Central Analytics Dashboard PWA, providing secure API endpoints for AWS metrics and App Store analytics.

## Architecture

The backend consists of three main Lambda functions:
- **Auth**: Handles Apple Sign In token verification and JWT session management
- **Metrics**: Retrieves AWS CloudWatch, API Gateway, DynamoDB, and Cost Explorer metrics
- **AppStore**: Integrates with App Store Connect API for app analytics

## Prerequisites

- Go 1.22 or later
- AWS CLI configured with appropriate credentials
- Node.js 18+ (for Serverless Framework)
- Terraform 1.0+ (optional, for Terraform deployment)
- AWS SAM CLI (optional, for SAM deployment)

## Quick Start

1. Install dependencies:
```bash
go mod download
```

2. Create AWS secrets:
```bash
make create-secrets
```

3. Build Lambda functions:
```bash
make build
```

4. Deploy to AWS:
```bash
# Using Serverless Framework (recommended)
make deploy-serverless DEPLOY_ENV=dev

# Using Terraform
make deploy-terraform DEPLOY_ENV=dev

# Using AWS SAM
make deploy-sam DEPLOY_ENV=dev
```

## Development

### Local Testing

Run unit tests:
```bash
make test
```

Run local API with SAM:
```bash
make local
```

### Building Functions

Build all functions:
```bash
make build
```

Build specific function:
```bash
make auth
make metrics
make appstore
```

### Deployment

Deploy using the deployment script:
```bash
./deploy/scripts/deploy.sh dev serverless
```

Update a single function (faster):
```bash
make update-function FUNCTION=auth
```

View function logs:
```bash
make logs FUNCTION=auth
```

## API Endpoints

### Authentication

- `POST /api/auth/verify` - Verify Apple ID token and get session JWT
- `POST /api/auth/refresh` - Refresh session token
- `POST /api/auth/logout` - Logout (client-side)

### Metrics (Requires Authentication)

- `POST /api/metrics/lambda` - Get Lambda function metrics
- `POST /api/metrics/apigateway` - Get API Gateway metrics
- `POST /api/metrics/dynamodb` - Get DynamoDB table metrics
- `POST /api/metrics/all` - Get all metrics combined

### App Store (Requires Admin Authentication)

- `GET /api/appstore/analytics` - Get app analytics
- `GET /api/appstore/builds` - Get latest build info
- `GET /api/appstore/testflight` - Get TestFlight statistics
- `GET /api/appstore/ratings` - Get app ratings

## Configuration

### Environment Variables

- `STAGE` - Deployment stage (dev/staging/prod)
- `JWT_SECRET_NAME` - AWS Secrets Manager secret for JWT signing
- `APPSTORE_SECRET_NAME` - AWS Secrets Manager secret for App Store Connect
- `ADMIN_APPLE_SUB` - Apple ID sub identifier for admin user
- `DEFAULT_APP_ID` - Default App Store app ID

### AWS Secrets

Create the following secrets in AWS Secrets Manager:

1. `central-analytics/jwt-secret` - Random string for JWT signing
2. `central-analytics/appstore-connect` - App Store Connect API credentials:
```json
{
  "keyId": "YOUR_KEY_ID",
  "issuerId": "YOUR_ISSUER_ID",
  "privateKey": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
}
```

## Project Structure

```
packages/backend/
├── cmd/                    # Lambda function handlers
│   ├── auth/              # Authentication handler
│   ├── metrics/           # AWS metrics handler
│   └── appstore/          # App Store Connect handler
├── internal/              # Internal packages
│   ├── auth/             # Authentication logic
│   ├── aws/              # AWS service clients
│   ├── appstore/         # App Store Connect client
│   └── middleware/       # HTTP middleware
├── pkg/                   # Public packages
│   └── response/         # API response helpers
├── deploy/               # Deployment configurations
│   ├── terraform/        # Terraform infrastructure
│   └── scripts/          # Deployment scripts
├── build/                # Build artifacts (generated)
├── go.mod                # Go module definition
├── go.sum                # Go module checksums
├── Makefile              # Build and deployment commands
└── serverless.yml        # Serverless Framework config
```

## CI/CD Pipeline

The GitHub Actions workflow automatically:
1. Runs tests on pull requests
2. Builds Lambda functions
3. Deploys to development (develop branch)
4. Deploys to staging (main branch)
5. Deploys to production (main branch with approval)

## Security

- Apple ID tokens are verified using Apple's public keys
- JWT sessions with configurable TTL
- Admin access restricted to specific Apple ID
- All secrets stored in AWS Secrets Manager
- IAM roles with least privilege principle
- API Gateway authorization on protected endpoints

## Monitoring

- CloudWatch Logs for all Lambda functions
- CloudWatch Metrics for performance monitoring
- X-Ray tracing enabled for distributed tracing
- Cost tracking through AWS Cost Explorer integration

## Performance Optimizations

- Lambda functions use ARM64 architecture for better price/performance
- Connection pooling for AWS SDK clients
- Response caching with appropriate TTLs
- Minimal cold start times with optimized binaries
- Concurrent execution limits configured per function

## Troubleshooting

### Common Issues

1. **Authentication fails**: Check Apple ID token and ADMIN_APPLE_SUB configuration
2. **Metrics not loading**: Verify IAM permissions for CloudWatch and Cost Explorer
3. **Deployment fails**: Ensure AWS credentials are configured correctly
4. **Function timeouts**: Increase timeout in serverless.yml or Terraform config

### Debug Commands

View function logs:
```bash
aws logs tail /aws/lambda/central-analytics-dev-auth --follow
```

Test API endpoint:
```bash
curl -X OPTIONS https://your-api-url/api/auth/verify
```

Check function configuration:
```bash
aws lambda get-function --function-name central-analytics-dev-auth
```

## License

Proprietary - All rights reserved