# Local Apple Sign In Setup (No ngrok Required)

This guide explains how to set up local Apple Sign In testing without using ngrok, utilizing a custom subdomain and local HTTPS certificates.

## Overview

Instead of using ngrok tunnels, we use:
- **Local domain mapping**: `local-dev.jcvolpe.me` → 127.0.0.1 (only on your computer)
- **Trusted HTTPS certificates**: Generated with mkcert for local development
- **HTTPS proxy server**: Routes traffic between frontend and backend with SSL
- **No internet deployment**: Everything runs locally on your machine

> **⚠️ Important:** The domain `local-dev.jcvolpe.me` is NOT on the internet. It only exists on your computer via `/etc/hosts`. When you access it, you're connecting to localhost (127.0.0.1) with a valid domain name that Apple can verify.

## Quick Start

### 1. One-Time Setup

Run the complete setup:

```bash
pnpm setup:dev
```

This will:
- Add `local-dev.jcvolpe.me → 127.0.0.1` to your `/etc/hosts` file
- Install mkcert and generate trusted SSL certificates
- Install all dependencies
- Create configuration files
- Set up the HTTPS proxy

### 2. Configure Apple Developer Portal

In your Apple Developer account:

1. **Services ID Configuration**:
   - Add domain: `local-dev.jcvolpe.me` (subdomain only, not base domain)
   - Set Return URL: `https://local-dev.jcvolpe.me:3000/auth/callback` (port 3000, not 4321)

2. **Domain Verification** (if not already done):
   - Add the TXT record Apple provides to your Route 53 hosted zone
   - Verify the domain in Apple Developer Portal

### 3. Update Environment Variables

Edit `.env` file:

```env
PUBLIC_APPLE_CLIENT_ID=com.jcvolpe.central-analytics.web
PUBLIC_ADMIN_APPLE_SUB=<your_apple_id_sub>
PUBLIC_APPLE_REDIRECT_URI=https://local-dev.jcvolpe.me:3000/auth/callback
PUBLIC_API_URL=https://local-dev.jcvolpe.me:3000
```

> **Note:** We use port 3000 (the HTTPS proxy) for everything, not port 4321 (frontend) directly.

### 4. Start Development Servers

```bash
pnpm dev
```

This starts:
- Frontend (Astro) on port 4321
- Backend API (Go) on port 8080
- HTTPS proxy on port 3000 (routes traffic to frontend/backend)

**Access your app at: `https://local-dev.jcvolpe.me:3000`**

## Architecture

```
┌─────────────────┐     HTTPS      ┌──────────────────┐
│                 │ ────────────>   │  Astro Frontend  │
│   Browser       │                 │  (Port 4321)     │
│                 │                 └──────────────────┘
│                 │                          │
│                 │     HTTPS               ▼ /api proxy
│                 │ ────────────>   ┌──────────────────┐
│                 │                 │  HTTPS Proxy     │
└─────────────────┘                 │  (Port 3000)     │
                                    └──────────────────┘
                                            │
                                            ▼ HTTP
                                    ┌──────────────────┐
                                    │  Go Backend      │
                                    │  (Port 8080)     │
                                    └──────────────────┘
```

## How It Works (Not a Real Website!)

### Local Domain Resolution

1. **Hosts File Entry**: Maps `local-dev.jcvolpe.me` to 127.0.0.1 (your computer)
2. **Local Only**: This domain ONLY works on YOUR computer - it's not on the internet
3. **DNS Override**: Your browser checks `/etc/hosts` before the internet
4. **Apple Verification**: Apple accepts the domain because you own `jcvolpe.me`
5. **The Magic**: Apple validates the domain NAME, not WHERE it's hosted

### HTTPS Certificates

1. **mkcert**: Creates a local Certificate Authority (CA) on your machine
2. **Trusted Certificates**: Generates certificates trusted by your system
3. **Browser Trust**: No security warnings in Chrome/Safari/Firefox

### Backend HTTPS Proxy

The Go backend runs in two modes:

```go
// Normal HTTP mode
go run ./cmd/local-server

// HTTPS proxy mode for Apple Sign In
go run ./cmd/local-server --https --https-port=3000
```

The HTTPS proxy:
- Listens on port 3000 with HTTPS
- Forwards requests to the HTTP backend on port 8080
- Preserves headers and handles CORS

### Frontend HTTPS

Astro automatically detects certificates and enables HTTPS:

```javascript
// astro.config.mjs
const httpsConfig = fs.existsSync('./certs/cert.pem') ? {
  cert: fs.readFileSync('./certs/cert.pem'),
  key: fs.readFileSync('./certs/key.pem')
} : null;

export default defineConfig({
  server: {
    https: httpsConfig
  }
});
```

## Manual Setup Steps

If you prefer manual setup over the automated script:

### 1. Add Domain to Hosts File

```bash
echo "127.0.0.1 local-dev.jcvolpe.me" | sudo tee -a /etc/hosts
sudo dscacheutil -flushcache
```

### 2. Install mkcert

```bash
brew install mkcert
mkcert -install
```

### 3. Generate Certificates

```bash
mkdir -p certs packages/backend/certs
cd certs
mkcert local-dev.jcvolpe.me 127.0.0.1 localhost
mv local-dev.jcvolpe.me+2.pem cert.pem
mv local-dev.jcvolpe.me+2-key.pem key.pem
cp *.pem ../packages/backend/certs/
```

### 4. Start Servers

Backend with HTTPS:
```bash
cd packages/backend
go run ./cmd/local-server --https --https-port=3000
```

Frontend:
```bash
pnpm run dev
```

## Testing Apple Sign In

1. Navigate to: https://local-dev.jcvolpe.me:4321
2. Click "Sign in with Apple"
3. Authenticate with your Apple ID
4. Verify redirect to callback URL
5. Check JWT token verification in backend logs

## Troubleshooting

### Certificate Issues

**Problem**: Browser shows certificate warning
**Solution**:
```bash
mkcert -install
# Restart browser
```

**Problem**: Backend can't find certificates
**Solution**:
```bash
ls -la packages/backend/certs/
# Should show cert.pem and key.pem
```

### Domain Resolution

**Problem**: local-dev.jcvolpe.me doesn't resolve
**Solution**:
```bash
# Check hosts file
cat /etc/hosts | grep local-dev
# Flush DNS
sudo dscacheutil -flushcache
# Test resolution
ping local-dev.jcvolpe.me
```

### Apple Sign In Errors

**Problem**: "invalid_redirect_uri" error
**Solution**: Ensure exact match in Apple Developer Portal:
- `https://local-dev.jcvolpe.me:4321/auth/callback`

**Problem**: "invalid_client" error
**Solution**: Check PUBLIC_APPLE_CLIENT_ID in .env matches Services ID

### Port Conflicts

**Problem**: Port already in use
**Solution**:
```bash
# Find process using port
lsof -i :3000
lsof -i :4321
lsof -i :8080
# Kill if needed
kill -9 <PID>
```

## Benefits Over ngrok

1. **No External Dependencies**: Everything runs locally
2. **Consistent URLs**: Same URLs every development session
3. **Better Performance**: No internet roundtrip
4. **Enhanced Security**: Traffic never leaves your machine
5. **Free Forever**: No ngrok subscription needed
6. **Offline Development**: Works without internet connection

## Production Deployment

For production:

1. **Update URLs**: Change from `local-dev.jcvolpe.me` to your production domain
2. **Real Certificates**: Use AWS Certificate Manager or Let's Encrypt
3. **Environment Variables**: Update all PUBLIC_* variables
4. **Apple Configuration**: Add production URLs to Apple Developer Portal

## Related Files

- `/scripts/setup-all.sh` - Complete setup script
- `/scripts/start-dev.sh` - Start development servers
- `/scripts/setup-local-domain.sh` - Configure local domain
- `/scripts/generate-certs.sh` - Generate HTTPS certificates
- `/packages/backend/cmd/local-server/https_proxy.go` - HTTPS proxy implementation
- `/astro.config.mjs` - Astro HTTPS configuration
- `/.env.local.example` - Example environment configuration