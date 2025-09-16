# Comprehensive Guide to Building an Analytics Dashboard PWA with Apple Biometric Login

This guide walks you through implementing your analytics dashboard as a Progressive Web App (PWA) using the specified stack: pnpm as the package manager, Astro with React for the frontend, Go for a serverless backend (instead of Astro's API routing), and deployment to AWS. The app will support login via Sign in with Apple, leveraging Apple biometrics (e.g., Face ID or Touch ID on supported devices), and restrict admin privileges to your specific Apple ID (identified via Apple's unique user identifier).

Key assumptions:
- You have an Apple Developer account for Sign in with Apple setup.
- The "analytics dashboard" is a basic example (e.g., displaying mock data); extend it as needed.
- AWS account with necessary permissions (S3, CloudFront, Lambda, API Gateway, IAM).
- Basic knowledge of Git, Node.js, Go, and AWS CLI.
- The PWA will be installable, offline-capable (via service worker), and secure (HTTPS required for biometrics and PWA features).
- For admin privileges: After authentication, the backend will check Apple's `sub` (subject) claim from the ID token, which is a unique, stable identifier for your Apple ID.

The project will be a monorepo using pnpm workspaces for seamless management. Frontend in `packages/frontend`, backend in `packages/backend`.

## Step 1: Project Setup

1. **Initialize the Monorepo**:
   - Create a root directory: `mkdir central-analytics  && cd central-analytics`.
   - Initialize pnpm: `pnpm init`.
   - Set up workspaces in `pnpm-workspace.yaml`:
     ```
     packages:
       - 'packages/*'
     ```
   - Create subdirectories: `mkdir -p packages/frontend packages/backend`.
   - In root `package.json`, add scripts (we'll expand later):
     ```
     {
       "name": "analytics-dashboard",
       "scripts": {
         "dev": "pnpm -r dev",
         "build": "pnpm -r build",
         "deploy": "./deploy.sh"
       },
       "devDependencies": {
         "concurrently": "^8.2.2"
       }
     }
     ```
   - Install concurrent runner: `pnpm add -D concurrently`.

2. **Install Dependencies**:
   - Run `pnpm install` in root to set up.

3. **Git Setup**:
   - `git init`.
   - Create `.gitignore` with standard ignores (e.g., `node_modules`, `.env`, `dist`, `bin` for Go binaries).

## Step 2: Frontend Setup (Astro with React)

The frontend will be built with Astro for static/hybrid rendering and React for interactive components (e.g., dashboard charts). It will be a PWA with a manifest and service worker.

1. **Initialize Frontend**:
   - Navigate to `packages/frontend`.
   - Run `pnpm create astro@latest --template with-react` (follow prompts: yes to TypeScript, install deps with pnpm).
   - In `packages/frontend/package.json`, add scripts:
     ```
     "scripts": {
       "dev": "astro dev",
       "build": "astro build",
       "preview": "astro preview"
     }
     ```

2. **Make it a PWA**:
   - Install PWA plugin: `pnpm add -D @astrojs/pwa`.
   - Update `astro.config.mjs`:
     ```js
     import { defineConfig } from 'astro/config';
     import react from '@astrojs/react';
     import pwa from '@astrojs/pwa';

     export default defineConfig({
       integrations: [react(), pwa({
         registerType: 'autoUpdate',
         manifest: {
           name: 'Analytics Dashboard',
           short_name: 'Analytics',
           description: 'My personal analytics dashboard',
           theme_color: '#ffffff',
           background_color: '#ffffff',
           display: 'standalone',
           start_url: '/',
           icons: [
             // Add icon paths here (generate icons at e.g., realfavicongenerator.net)
             { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
             { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
           ]
         }
       })]
     });
     ```
   - Create a service worker if needed (Astro PWA handles basic offline; customize in `src/sw.js` for advanced caching).

3. **State Management with Zustand**:
   - Install Zustand for lightweight client-side state management:
     ```bash
     pnpm add zustand
     ```
   - Create stores directory and filter store (`src/stores/filterStore.js`):
     ```js
     import { create } from 'zustand';

     export const useFilterStore = create((set) => ({
       // Filters for dashboard
       logLevel: 'all',
       timeRange: '1h',
       platform: 'all', // 'apple', 'google', 'all'
       metric: 'downloads',
       dateRange: { start: null, end: null },
       
       // Setters
       setLogLevel: (level) => set({ logLevel: level }),
       setTimeRange: (range) => set({ timeRange: range }),
       setPlatform: (platform) => set({ platform: platform }),
       setMetric: (metric) => set({ metric: metric }),
       setDateRange: (start, end) => set({ dateRange: { start, end } }),
       
       // Reset filters
       resetFilters: () => set({
         logLevel: 'all',
         timeRange: '1h',
         platform: 'all',
         metric: 'downloads',
         dateRange: { start: null, end: null }
       })
     }));
     ```
   - Benefits of Zustand:
     - Minimal bundle size (~8KB)
     - No providers needed
     - Works seamlessly with React islands in Astro
     - TypeScript support out of the box
     - DevTools integration available

4. **Implement Dashboard UI**:
   - In `src/pages/index.astro`, create a basic React component integration:
     ```astro
     ---
     import Dashboard from '../components/Dashboard.jsx';
     ---

     <html lang="en">
       <head>
         <meta charset="utf-8" />
         <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
         <meta name="viewport" content="width=device-width" />
         <title>Analytics Dashboard</title>
       </head>
       <body>
         <Dashboard client:load />
       </body>
     </html>
     ```
   - Create `src/components/Dashboard.jsx` (React component with Zustand):
     ```jsx
     import React, { useState, useEffect } from 'react';
     import { useFilterStore } from '../stores/filterStore';
     import FilterPanel from './FilterPanel';
     import AnalyticsChart from './AnalyticsChart';

     export default function Dashboard() {
       const [data, setData] = useState(null);
       const [isAuthenticated, setIsAuthenticated] = useState(false);
       const { logLevel, timeRange, platform } = useFilterStore();

       useEffect(() => {
         // Check auth and fetch data from backend
         // For now, mock
         setIsAuthenticated(true);
         setData({ metrics: 'Sample data' });
       }, []);

       useEffect(() => {
         // Refetch data when filters change
         if (isAuthenticated) {
           fetchFilteredData();
         }
       }, [logLevel, timeRange, platform]);

       const fetchFilteredData = async () => {
         const params = new URLSearchParams({
           logLevel,
           timeRange,
           platform
         });
         const response = await fetch(`/api/data?${params}`);
         if (response.ok) {
           setData(await response.json());
         }
       };

       if (!isAuthenticated) {
         return <div>Please log in with Apple.</div>;
       }

       return (
         <div>
           <h1>Analytics Dashboard</h1>
           <FilterPanel />
           <AnalyticsChart data={data} />
           <button onClick={fetchFilteredData}>Refresh Data</button>
         </div>
       );
     }
     ```
   - Create `src/components/FilterPanel.jsx`:
     ```jsx
     import React from 'react';
     import { useFilterStore } from '../stores/filterStore';

     export default function FilterPanel() {
       const {
         logLevel,
         timeRange,
         platform,
         setLogLevel,
         setTimeRange,
         setPlatform,
         resetFilters
       } = useFilterStore();

       return (
         <div className="filter-panel">
           <select value={logLevel} onChange={(e) => setLogLevel(e.target.value)}>
             <option value="all">All Logs</option>
             <option value="error">Errors</option>
             <option value="warning">Warnings</option>
             <option value="info">Info</option>
           </select>
           
           <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
             <option value="1h">Last Hour</option>
             <option value="24h">Last 24 Hours</option>
             <option value="7d">Last 7 Days</option>
             <option value="30d">Last 30 Days</option>
           </select>
           
           <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
             <option value="all">All Platforms</option>
             <option value="apple">Apple</option>
             <option value="google">Google</option>
           </select>
           
           <button onClick={resetFilters}>Reset Filters</button>
         </div>
       );
     }
     ```
   - Add libraries for charts if needed (e.g., `pnpm add recharts`).

5. **Integrate Sign in with Apple**:
   - Install Apple JS SDK: Include via CDN or bundle (Apple doesn't have an npm package; use script tag).
   - In `src/components/Login.jsx` (create and import into Dashboard):
     ```jsx
     import React, { useEffect } from 'react';

     export default function Login({ onLogin }) {
       useEffect(() => {
         if (window.AppleID) {
           window.AppleID.auth.init({
             clientId: 'your.apple.client.id', // From Apple Developer
             scope: 'name email',
             redirectURI: 'https://your-domain.com/auth/callback', // Or localhost for dev
             state: 'your-state',
             usePopup: true // For biometric popup
           });
         }
       }, []);

       const handleSignIn = async () => {
         try {
           const data = await window.AppleID.auth.signIn();
           // Send data.identityToken to backend for verification
           const response = await fetch('/api/auth', {
             method: 'POST',
             body: JSON.stringify({ token: data.identityToken }),
           });
           if (response.ok) {
             onLogin(true);
           }
         } catch (err) {
           console.error(err);
         }
       };

       return <button onClick={handleSignIn}>Sign in with Apple</button>;
     }
     ```
   - Apple biometrics: On Apple devices, the SDK uses Face ID/Touch ID automatically if enrolled.
   - Note: For PWA, ensure it's added to home screen for full biometric support. HTTPS is required.

   - Setup Apple Developer:
     - Create App ID and Services ID in Apple Developer portal.
     - Enable Sign in with Apple.
     - Download private key for backend verification.

   - In production, proxy API calls to backend (since we're using Go backend, not Astro API).

## Step 3: Backend Setup (Go Serverless)

Backend in Go, deployed as AWS Lambda functions. Handles auth verification and analytics API (e.g., `/api/auth`, `/api/data`).

1. **Initialize Backend**:
   - Navigate to `packages/backend`.
   - `go mod init backend`.
   - Install deps: `go get github.com/golang-jwt/jwt/v5 github.com/aws/aws-lambda-go/lambda github.com/aws/aws-lambda-go/events`.
   - Create `main.go` (entrypoint for Lambda):
     ```go
     package main

     import (
         "context"
         "encoding/json"
         "fmt"
         "net/http"
         "os"

         "github.com/aws/aws-lambda-go/events"
         "github.com/aws/aws-lambda-go/lambda"
         "github.com/golang-jwt/jwt/v5"
     )

     var adminSub = os.Getenv("ADMIN_APPLE_SUB") // Your Apple unique ID (sub)

     func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
         switch req.Path {
         case "/api/auth":
             // Parse body
             var body struct { Token string }
             if err := json.Unmarshal([]byte(req.Body), &body); err != nil {
                 return events.APIGatewayProxyResponse{StatusCode: 400}, err
             }
             // Verify Apple ID token (use Apple's public keys; fetch from https://appleid.apple.com/auth/keys)
             // Implement token verification here (use jwt.ParseWithClaims, validate aud, iss, etc.)
             // Assume verified claims:
             claims := jwt.MapClaims{} // Parse real token
             sub, _ := claims["sub"].(string)
             if sub != adminSub {
                 return events.APIGatewayProxyResponse{StatusCode: 403, Body: "Unauthorized"}, nil
             }
             // Generate your JWT or session
             return events.APIGatewayProxyResponse{StatusCode: 200, Body: "Authenticated"}, nil
         case "/api/data":
             // Check auth header (your JWT), then return analytics data
             return events.APIGatewayProxyResponse{StatusCode: 200, Body: `{"metrics": "data"}`}, nil
         default:
             return events.APIGatewayProxyResponse{StatusCode: 404}, nil
         }
     }

     func main() {
         lambda.Start(handler)
     }
     ```
   - For Apple token verification: Implement full JWT validation using Apple's JWKS. Fetch keys dynamically.
   - Store your Apple private key securely (e.g., AWS Secrets Manager).
   - For local dev, create `server.go` for non-Lambda mode:
     ```go
     package main

     import (
         "net/http"
     )

     func main() {
         http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
             // Wrap handler logic
             resp, _ := handler(r.Context(), events.APIGatewayProxyRequest{Path: r.URL.Path, Body: string([]byte{} /* read body */)})
             w.WriteHeader(resp.StatusCode)
             w.Write([]byte(resp.Body))
         })
         http.ListenAndServe(":3001", nil) // Proxy to avoid CORS in dev
     }
     ```
   - In `packages/backend/package.json` (for pnpm integration, even though it's Go):
     ```json
     {
       "name": "backend",
       "scripts": {
         "dev": "go run server.go",
         "build": "GOOS=linux GOARCH=amd64 go build -o bin/main main.go && zip -j bin/main.zip bin/main"
       }
     }
     ```

2. **Environment Variables**:
   - Use `.env` for dev: `ADMIN_APPLE_SUB=your.sub.from.apple`.
   - Load with `godotenv` if needed.

3. **CORS**:
   - Add CORS headers in handler for frontend access.

## Step 4: Local Development with Simplified Commands

```bash
# One-time setup (installs deps, configures domain, generates certs)
pnpm setup:dev

# Start all servers concurrently
pnpm dev
```

- Frontend runs at port 4321
- Backend runs at port 8080
- HTTPS proxy runs at port 3000
- Access app at `https://dev.ilikeyacut.com:3000` (or your configured domain)
- No manual proxy configuration needed - handled automatically

## Step 5: Production Deployment

```bash
# Prepare for production
pnpm setup:prod

# Build everything
pnpm build:all

# Deploy to production (with confirmation)
pnpm deploy

# Or preview deployment
pnpm deploy:dry-run
```

Deployment script automatically:
- Builds frontend and backend
- Syncs to S3 with optimized caching
- Deploys backend to Lambda/EC2/ECS
- Invalidates CloudFront cache
- Runs health checks

- Setup AWS resources first:
  - S3 bucket (static website hosting enabled).
  - CloudFront distribution pointing to S3.
  - Lambda function (Go runtime).
  - API Gateway REST API proxying to Lambda.
  - For PWA/HTTPS: Use CloudFront with custom domain or ACM certificate.

- For Apple callback: Update redirect URI in Apple Developer to your API Gateway endpoint.

## Step 6: GitHub Actions for CI/CD

Push to GitHub repo.

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9
      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.23'
      - name: Install dependencies
        run: pnpm install
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1  # Your region
      - name: Deploy
        run: ./deploy.sh
```

- Add AWS secrets to GitHub repo settings.

## Step 7: Testing and Final Touches

- Local: `pnpm dev`, test login at `https://dev.ilikeyacut.com:3000`
- Deploy: Run `pnpm deploy` for production deployment
- Admin check: Hardcode your `sub` in env; in prod, use Secrets Manager.
- Analytics: Extend backend to fetch real data (e.g., from DynamoDB).
- Security: Use HTTPS, validate tokens properly, handle errors.
- PWA Testing: Use Lighthouse in Chrome DevTools.

This setup provides a seamless dev/deploy flow. If issues arise, check logs in AWS CloudWatch or console outputs. Extend as needed for real analytics sources.
