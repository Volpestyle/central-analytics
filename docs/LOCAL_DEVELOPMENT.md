# Understanding Local Development with Custom Domains

This guide explains how local development works with custom domains for Apple Sign-In without deploying anything to the internet.

## The Challenge

Apple Sign-In requires:
- HTTPS (not HTTP)
- A valid domain name (not localhost or IP addresses)
- The redirect URL must match what's configured in Apple Developer Console

Traditional solutions like ngrok create internet tunnels, but we can solve this entirely locally!

## How Our Local Setup Works

### 1. Domain Resolution (DNS)

When you run `pnpm setup:dev`, we add an entry to your `/etc/hosts` file:
```
127.0.0.1 local-dev.jcvolpe.me
```

This tells your computer: "When anyone asks for `local-dev.jcvolpe.me`, direct them to `127.0.0.1` (this computer)"

**Important:** This ONLY works on your computer. Nobody else on the internet can access `local-dev.jcvolpe.me` - it's not a real website!

### 2. The Three Servers

When you run `pnpm dev`, three servers start on your Mac:

```
┌──────────────────────────────────────────┐
│           Your Mac (localhost)           │
├──────────────────────────────────────────┤
│                                          │
│  Frontend (Astro)                        │
│  Port: 4321                              │
│  http://localhost:4321                   │
│                                          │
│  Backend API (Go)                        │
│  Port: 8080                              │
│  http://localhost:8080                   │
│                                          │
│  HTTPS Proxy                             │
│  Port: 3000                              │
│  https://localhost:3000                  │
│  https://local-dev.jcvolpe.me:3000  ←──── You access here!
│                                          │
└──────────────────────────────────────────┘
```

### 3. How Requests Flow

```
Your Browser
    ↓
https://local-dev.jcvolpe.me:3000
    ↓
/etc/hosts lookup → 127.0.0.1:3000
    ↓
HTTPS Proxy (port 3000)
    ↓
Routes requests:
    /api/* → Backend (port 8080)
    /*     → Frontend (port 4321)
```

### 4. Apple Sign-In Flow

1. **You click "Sign in with Apple"**
   - Your browser is on `https://local-dev.jcvolpe.me:3000`

2. **Redirect to Apple**
   - App sends you to Apple's login page
   - Apple sees the redirect URL: `https://local-dev.jcvolpe.me:3000/auth/callback`
   - Apple validates that `local-dev.jcvolpe.me` is configured in your Service ID

3. **Apple redirects back**
   - After login, Apple sends you to: `https://local-dev.jcvolpe.me:3000/auth/callback`
   - Your browser looks up `local-dev.jcvolpe.me` → finds `127.0.0.1` in `/etc/hosts`
   - Request goes to your local HTTPS proxy on port 3000
   - Proxy forwards to frontend on port 4321
   - Frontend handles the callback!

## Why This Works

### Apple's Perspective:
- ✅ Valid domain name: `local-dev.jcvolpe.me` (subdomain of your real domain)
- ✅ HTTPS with valid certificate (thanks to mkcert)
- ✅ Redirect URL matches configuration

### Your Browser's Perspective:
- Resolves `local-dev.jcvolpe.me` to `127.0.0.1` (your computer)
- Trusts the local certificate (mkcert added it to your system)
- Makes HTTPS connection to your local proxy

### The Magic:
- Apple only validates the domain NAME, not where it's hosted
- Your browser does the DNS lookup locally BEFORE going to the internet
- The connection never leaves your computer!

## Port Reference

| Service | Internal Port | Access URL | Purpose |
|---------|--------------|------------|---------|
| Frontend | 4321 | http://localhost:4321 | Astro dev server (internal only) |
| Backend | 8080 | http://localhost:8080 | Go API server (internal only) |
| HTTPS Proxy | 3000 | https://local-dev.jcvolpe.me:3000 | Main access point (what you use) |

## Common Misconceptions

❌ **"I need to deploy to local-dev.jcvolpe.me"**
- No! This domain only exists on your computer via `/etc/hosts`

❌ **"Anyone can access local-dev.jcvolpe.me:3000"**
- No! It only resolves to 127.0.0.1 on YOUR computer

❌ **"I should access the app on port 4321"**
- No! Always use port 3000 (the HTTPS proxy) for proper SSL and routing

❌ **"This deploys my app to the internet"**
- No! Everything runs locally. `pnpm deploy` is for actual production deployment

## Troubleshooting

### "Can't access local-dev.jcvolpe.me:3000"

1. Check `/etc/hosts` has the entry:
   ```bash
   cat /etc/hosts | grep jcvolpe
   ```

2. Ensure all servers are running:
   ```bash
   pnpm dev  # Should start all three servers
   ```

3. Check ports aren't blocked:
   ```bash
   lsof -i :3000   # Should show node
   lsof -i :4321   # Should show node (astro)
   lsof -i :8080   # Should show go
   ```

### "Apple Sign-In redirect fails"

1. Verify Apple Developer configuration has:
   - Domain: `local-dev.jcvolpe.me`
   - Return URL: `https://local-dev.jcvolpe.me:3000/auth/callback`

2. Check `.env` has matching redirect URL:
   ```
   PUBLIC_APPLE_REDIRECT_URI=https://local-dev.jcvolpe.me:3000/auth/callback
   ```

### "Certificate warnings in browser"

Run setup again to regenerate certificates:
```bash
pnpm setup:dev:force
```

## Summary

- **local-dev.jcvolpe.me** = Your computer (via `/etc/hosts`)
- **Port 3000** = HTTPS proxy (what you access)
- **Port 4321** = Frontend (internal)
- **Port 8080** = Backend (internal)
- **Nothing is deployed** to the internet during development
- **Apple Sign-In works** because Apple validates the domain name, not the location