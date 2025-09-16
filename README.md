# Central Analytics Dashboard

A centralized analytics platform built as a Progressive Web App (PWA) for monitoring AWS infrastructure and App Store performance metrics across multiple applications. Currently monitoring the **ilikeyacut** iOS app with architecture designed for easy expansion to additional applications.

## Overview

Central Analytics Dashboard provides real-time monitoring and visualization of:
- **AWS Infrastructure**: Lambda functions, API Gateway, DynamoDB, costs & usage
- **App Store Analytics**: Downloads, revenue, user engagement metrics
- **Unified Health Monitoring**: Per-application performance tracking
- **Cross-Platform Access**: PWA architecture for web, mobile, and desktop

## Tech Stack

### Frontend
- **Framework**: Astro v4 with React components
- **Styling**: Tailwind CSS
- **Charts**: ECharts for data visualization
- **State Management**: Zustand
- **PWA**: Vite PWA plugin with offline support
- **Authentication**: Sign in with Apple (biometric support)

### Backend
- **Language**: Go 1.22+ with modern practices (dependency injection, structured logging)
- **Architecture**: Clean architecture, serverless/Lambda-ready with production-simulating local server
- **AWS Services**: CloudWatch, Cost Explorer, DynamoDB, Lambda, API Gateway, Secrets Manager
- **Authentication**: Apple JWT verification with admin access control
- **API**: RESTful endpoints with CORS support, health checks, and metrics aggregation
- **Dual Mode**: Development (with mocks) and production simulation modes

## Project Structure

```
central-analytics/
├── docs/                       # Product & technical documentation
│   ├── PRODUCT.md             # Product specifications
│   ├── IMPLEMENTATION.md      # Implementation guide
│   ├── DESIGN.md              # Design system specifications
│   └── PWA-TECHNICAL.md       # PWA technical details
├── packages/
│   └── backend/               # Go backend service
│       ├── cmd/               # Application entrypoints
│       │   └── local-server/  # Local development server
│       ├── internal/          # Internal packages
│       │   ├── auth/         # Apple authentication
│       │   ├── aws/          # AWS service integrations
│       │   ├── config/       # Application configuration
│       │   └── handlers/     # HTTP request handlers
│       ├── scripts/          # Deployment & utility scripts
│       └── Makefile          # Build commands
├── src/                       # Frontend source code
│   ├── components/           # React & Astro components
│   │   ├── analytics/       # Analytics visualization components
│   │   └── charts/          # Chart components
│   ├── layouts/             # Page layouts
│   ├── pages/               # Astro pages/routes
│   │   └── apps/           # Per-app dashboard pages
│   ├── stores/              # Zustand state stores
│   └── lib/                 # Utilities & helpers
├── public/                   # Static assets
└── astro.config.mjs         # Astro configuration
```

## Prerequisites

- **Node.js**: v20 or higher
- **pnpm**: v10.11.0 or higher
- **Go**: 1.22 or higher
- **AWS CLI**: Configured with appropriate credentials (for production simulation)
- **Apple Developer Account**: For Sign in with Apple setup (optional for development)
- **App Store Connect API Key**: For App Store metrics (optional)

## Quick Start

### 1. Clone & Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/central-analytics.git
cd central-analytics

# Run automated setup (installs dependencies, configures domain, generates certificates)
pnpm setup:dev

# Configure your domain when prompted, or use default (dev.ilikeyacut.com)
```

### 2. Configure Credentials

```bash
# Edit .env files created by setup
# Frontend configuration:
vi .env
# Add your Apple credentials:
# - PUBLIC_APPLE_CLIENT_ID
# - PUBLIC_ADMIN_APPLE_SUB

# Backend configuration:
vi packages/backend/.env
# Add AWS credentials and Apple auth keys
```

### 3. Start Development

```bash
# Start all servers (frontend, backend, HTTPS proxy)
pnpm dev

# Access the application at:
# https://local-dev.jcvolpe.me:3000 (or your configured domain)
```

> **🔍 How Local Development Works:**
> - The domain (e.g., `local-dev.jcvolpe.me`) points to your local machine (127.0.0.1) via `/etc/hosts`
> - This is NOT deployed to the internet - it runs entirely on your computer
> - The HTTPS proxy on port 3000 provides SSL certificates trusted by your browser
> - Apple Sign-In works because Apple validates the domain name, not where it's hosted
> - When you visit the URL, you're connecting to localhost with a valid domain name
>
> 📖 **[Read the detailed explanation →](docs/LOCAL_DEVELOPMENT.md)**

## Development Commands

### Setup & Configuration

```bash
pnpm setup:dev        # Smart setup - only updates what's needed
pnpm setup:dev:force  # Force complete rebuild
pnpm setup:prod       # Prepare for production deployment
pnpm configure:domain # Reconfigure domain settings
```

### Development

```bash
pnpm dev              # Run all servers concurrently
pnpm dev:frontend     # Run only frontend (Astro)
pnpm dev:backend      # Run only backend (Go)
pnpm dev:proxy        # Run only HTTPS proxy
```

### Build & Deploy

```bash
pnpm build            # Build frontend
pnpm build:backend    # Build backend
pnpm build:all        # Build everything

pnpm deploy           # Deploy to production (with confirmation)
pnpm deploy:dry-run   # Preview deployment without executing
```

## Production Deployment

### Prerequisites

1. AWS CLI configured with appropriate credentials
2. Production environment file created (`.env.production`)
3. AWS resources provisioned (S3, CloudFront, Lambda, etc.)

### Deploy to Production

```bash
# One-time production setup
pnpm setup:prod

# Build and deploy to production
pnpm deploy
# Type 'deploy' when prompted to confirm

# Or preview what would be deployed
pnpm deploy:dry-run
```

### Deploy Options

```bash
# Skip build (use existing dist)
pnpm deploy -- --skip-build

# Skip tests
pnpm deploy -- --skip-tests
```

### Production Configuration

Create `.env.production` with:

```bash
# Production Environment
NODE_ENV=production

# Apple Authentication
PUBLIC_APPLE_CLIENT_ID=your_production_client_id
PUBLIC_ADMIN_APPLE_SUB=your_admin_sub

# API Configuration
PUBLIC_API_URL=https://api.ilikeyacut.com

# AWS Configuration
AWS_REGION=us-east-1
AWS_S3_BUCKET=prod-central-analytics
AWS_CLOUDFRONT_DISTRIBUTION_ID=your_distribution_id
```

### What Deploy Does

1. **Builds** frontend and backend for production
2. **Syncs** frontend to S3 with optimized caching
3. **Deploys** backend to your configured service (Lambda/EC2/ECS)
4. **Invalidates** CloudFront cache
5. **Runs** health checks on deployed services
6. **Reports** deployment status and URLs

## Configuration

### Apple Sign in Configuration

1. **Apple Developer Portal Setup**:
   - Create an App ID with Sign in with Apple capability
   - Create a Services ID for web authentication
   - Configure return URLs (production domain + localhost for dev)
   - Download private key for backend verification

2. **Update Configuration**:
   - Set `PUBLIC_APPLE_CLIENT_ID` in frontend .env
   - Configure Apple private key in backend
   - Set admin Apple subject ID for access control

### AWS Configuration

Required AWS services and permissions:
- **CloudWatch**: Read access for metrics
- **Cost Explorer**: Read access for cost data
- **DynamoDB**: Read access to application tables
- **API Gateway**: Read access for API metrics
- **Lambda**: Read access for function metrics
- **S3**: Read/Write for static hosting
- **CloudFront**: Distribution management

### PWA Configuration

The app is configured as a PWA with:
- Offline support via service worker
- App installation prompt
- Cache strategies for API and static assets
- Background sync for failed requests


## Monitoring Applications

### Currently Monitored: ilikeyacut

The dashboard currently monitors the ilikeyacut iOS app infrastructure:

**AWS Resources**:
- API Gateway: `ilikeyacut-api-dev`
- Lambda Functions:
  - `ilikeyacut-gemini-proxy-dev`
  - `ilikeyacut-auth-dev`
  - `ilikeyacut-templates-dev`
  - `ilikeyacut-user-data-dev`
  - `ilikeyacut-purchase-dev`
  - `ilikeyacut-iap-webhook-dev`
- DynamoDB Tables:
  - `ilikeyacut-users-dev`
  - `ilikeyacut-transactions-dev`
  - `ilikeyacut-templates-dev`
  - `ilikeyacut-rate-limits-dev`

### Adding New Applications

To add monitoring for additional applications:

1. Update `packages/backend/internal/config/apps.go`
2. Add new app configuration with AWS resource mappings
3. Create new dashboard page in `src/pages/apps/[appname].astro`
4. Update navigation to include new app

## Features

### Real-Time Monitoring
- Live AWS infrastructure metrics
- App Store performance tracking
- Cost analytics and projections
- Error rate monitoring

### Data Visualization
- Interactive charts with ECharts
- Time-series analysis
- Cost breakdown by service
- Geographic distribution maps

### Progressive Web App
- Install to home screen
- Offline data access
- Push notifications for alerts
- Background data sync

### Security
- Apple Sign in with biometric support
- Admin-only access control
- JWT-based authentication
- Secure API communication

## Troubleshooting

### Common Issues

**Backend won't start**:
- Check Go version: `go version` (requires 1.22+)
- Verify AWS credentials are configured
- Check port 8080 is available

**Frontend build fails**:
- Clear node_modules: `rm -rf node_modules && pnpm install`
- Check Node version: `node --version` (requires v20+)
- Verify pnpm is installed: `pnpm --version`

**Apple Sign In not working**:
- Ensure HTTPS is used (ngrok for local)
- Verify Apple Services ID configuration
- Check redirect URI matches configuration

**PWA not installing**:
- Must be served over HTTPS
- Check manifest.json is accessible
- Verify service worker registration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

Private repository - All rights reserved

## Support

For issues or questions, please contact the development team or create an issue in the repository.

---

Built with modern web technologies for optimal performance and user experience across all platforms.