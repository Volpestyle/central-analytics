# Central Analytics Dashboard

A comprehensive Progressive Web App (PWA) for monitoring AWS infrastructure and App Store performance metrics for all deployed applications.

## Tech Stack

- **Frontend**: Astro + React + TypeScript
- **Styling**: Tailwind CSS
- **Charts**: ECharts
- **Authentication**: Apple Sign In with biometric support (Face ID/Touch ID)
- **State Management**: Zustand
- **Backend**: Go serverless functions (AWS Lambda)
- **Deployment**: AWS (S3 + CloudFront for frontend, Lambda + API Gateway for backend)
- **Package Manager**: pnpm

## Features

### Authentication
- Apple Sign In with Face ID/Touch ID support for iOS 26 and iPhone 17 Pro
- 2FA with biometric as second factor
- Admin privileges restricted to specific Apple ID
- PWA-optimized authentication for both browser and installed app
- Offline capability with background sync

### Dashboard Visualizations
- **AWS Infrastructure Monitoring**:
  - Lambda function metrics (invocations, errors, duration, cold starts)
  - API Gateway metrics (requests, error rates, latency)
  - DynamoDB metrics (capacity usage, throttling, storage)
  - Cost analytics with trends and projections

- **App Store Analytics**:
  - Downloads and install metrics
  - Revenue tracking (IAP, ARPU)
  - User engagement metrics
  - Geographic distribution

### Backend API
- Apple token verification with JWT sessions
- AWS CloudWatch metrics collection
- App Store Connect API integration
- Real-time data fetching with caching
- Secure admin endpoints

## Project Structure

```
central-analytics/
├── src/                     # Frontend source code
│   ├── components/
│   │   ├── auth/           # Authentication components
│   │   ├── charts/         # Data visualization components
│   │   └── Dashboard.tsx   # Main dashboard component
│   ├── lib/                # Utilities and libraries
│   ├── pages/              # Astro pages
│   ├── stores/             # Zustand state management
│   └── styles/             # Global styles
├── packages/backend/        # Go serverless backend
│   ├── cmd/                # Lambda function handlers
│   ├── internal/           # Internal packages
│   ├── deploy/             # Deployment configurations
│   └── serverless.yml      # Serverless Framework config
├── public/                 # Static assets
│   ├── manifest.json       # PWA manifest
│   └── sw.js              # Service worker
└── docs/                   # Documentation
```

## Getting Started

### Prerequisites
- Node.js 20+
- Go 1.23+
- pnpm 9+
- AWS CLI configured
- Apple Developer account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd central-analytics
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Configure Apple Sign In:
- Create App ID and Service ID in Apple Developer Console
- Set redirect URLs
- Generate private key for backend

### Development

Run the frontend and backend concurrently:
```bash
pnpm dev
```

Frontend: http://localhost:4321
Backend: http://localhost:3001

### Build

Build for production:
```bash
pnpm build
```

### Deployment

#### Frontend (S3 + CloudFront)
```bash
cd packages/backend
make deploy-frontend
```

#### Backend (Lambda + API Gateway)
```bash
cd packages/backend
make deploy-serverless DEPLOY_ENV=production
```

Or use the deployment script:
```bash
./packages/backend/deploy/scripts/deploy.sh production serverless
```

## Environment Variables

### Frontend (.env)
```
PUBLIC_APPLE_CLIENT_ID=your.apple.client.id
PUBLIC_API_URL=https://api.your-domain.com
```

### Backend
```
ADMIN_APPLE_SUB=your-apple-sub-identifier
DEFAULT_APP_ID=ilikeyacut
AWS_REGION=us-east-1
```

## PWA Features

- Installable on all platforms
- Offline support with service worker
- Background sync for failed requests
- Push notifications (optional)
- App shortcuts from home screen

## Security

- Apple ID token verification using JWKS
- JWT-based session management
- Admin access control via Apple sub identifier
- Secrets stored in AWS Secrets Manager
- HTTPS required for biometric authentication

## Testing

Test on physical devices for biometric features:
1. Deploy to HTTPS domain
2. Install as PWA on iPhone 17 Pro
3. Test Face ID authentication
4. Verify offline functionality

## CI/CD

GitHub Actions workflow included for automated deployment:
- Builds and tests on push to main
- Deploys frontend to S3/CloudFront
- Updates Lambda functions
- Runs post-deployment tests

## License

Private - All rights reserved

## Support

For issues or questions, please check the documentation in the `/docs` directory.