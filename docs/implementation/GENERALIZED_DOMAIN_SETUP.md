# Generalized Domain Setup for Local HTTPS Development

This guide explains how to use ANY domain you own for local Apple Sign In testing without ngrok.

## Quick Start with Any Domain

### 1. Configure Your Domain

Run the domain configuration script with your domain:

```bash
# Interactive mode (prompts for all values)
./scripts/configure-domain.sh

# Or with command-line arguments
./scripts/configure-domain.sh example.com local-dev 4321 8080 3000
```

Arguments:
1. `domain` - Your base domain (e.g., `example.com`)
2. `subdomain` - Local subdomain (default: `local-dev`)
3. `frontend_port` - Frontend port (default: `4321`)
4. `backend_http_port` - Backend HTTP port (default: `8080`)
5. `backend_https_port` - Backend HTTPS port (default: `3000`)

### 2. Run Complete Setup

```bash
# Uses the domain configuration you just created
./scripts/setup-all.sh
```

### 3. Start Development

```bash
./scripts/start-dev.sh
```

## Examples with Different Domains

### Example 1: Using your-company.com

```bash
# Configure
./scripts/configure-domain.sh your-company.com dev

# This creates:
# - Local URL: https://dev.your-company.com:4321
# - Backend API: https://dev.your-company.com:3000
# - Callback URL: https://dev.your-company.com:4321/auth/callback
```

### Example 2: Using personal-site.io with custom ports

```bash
# Configure with custom ports
./scripts/configure-domain.sh personal-site.io local 3000 8080 8443

# This creates:
# - Local URL: https://local.personal-site.io:3000
# - Backend API: https://local.personal-site.io:8443
# - Callback URL: https://local.personal-site.io:3000/auth/callback
```

### Example 3: Using subdomain.mydomain.org

```bash
# Configure
./scripts/configure-domain.sh mydomain.org test-auth

# This creates:
# - Local URL: https://test-auth.mydomain.org:4321
# - Backend API: https://test-auth.mydomain.org:3000
# - Callback URL: https://test-auth.mydomain.org:4321/auth/callback
```

## How Domain Configuration Works

### 1. Configuration File (.domain.config)

When you run `configure-domain.sh`, it creates a `.domain.config` file:

```bash
# Domain Configuration for Local HTTPS Development
BASE_DOMAIN=example.com
LOCAL_SUBDOMAIN=local-dev
LOCAL_DOMAIN=local-dev.example.com
FRONTEND_PORT=4321
BACKEND_HTTP_PORT=8080
BACKEND_HTTPS_PORT=3000
CERT_PATH=certs/cert.pem
KEY_PATH=certs/key.pem
```

### 2. Automatic Environment Updates

The script automatically updates your `.env` file with the correct URLs:

```env
PUBLIC_APPLE_REDIRECT_URI=https://local-dev.example.com:4321/auth/callback
PUBLIC_API_URL=https://local-dev.example.com:3000
PUBLIC_LOCAL_DOMAIN=local-dev.example.com
```

### 3. Dynamic Certificate Generation

Certificates are generated specifically for your configured domain:

```bash
mkcert local-dev.example.com 127.0.0.1 localhost
```

### 4. Automatic CORS Configuration

The backend automatically configures CORS for your domain:

```go
// Dynamically adds:
// - https://local-dev.example.com:4321
// - https://local-dev.example.com:3000
```

## Requirements for Domain Selection

### Domain Ownership

You must own the domain you're using because:
1. Apple requires domain verification for Sign In with Apple
2. The domain must be added to your Apple Services ID configuration

### Domain Verification in Apple Developer Portal

1. Go to Certificates, Identifiers & Profiles
2. Select your Services ID
3. Click "Configure" next to Sign In with Apple
4. Add your domain (e.g., `example.com`)
5. Download the verification file
6. Add the TXT record to your DNS:
   - For Route 53: Create TXT record with Apple's verification string
   - For other providers: Follow Apple's instructions

### Local Subdomain Strategy

Using a subdomain like `local-dev.example.com` allows:
- Local-only traffic (never leaves your machine)
- Valid SSL certificates via mkcert
- Apple domain verification (inherited from parent domain)

## Switching Between Domains

### To change domains:

1. **Reconfigure the domain:**
   ```bash
   ./scripts/configure-domain.sh new-domain.com
   ```

2. **Regenerate certificates:**
   ```bash
   ./scripts/generate-certs.sh
   ```

3. **Update Apple Developer Portal:**
   - Add new domain if not already verified
   - Update Return URL to match new configuration

4. **Restart development servers:**
   ```bash
   ./scripts/start-dev.sh
   ```

## Multiple Domain Configurations

You can maintain multiple domain configurations:

### Save current configuration:
```bash
cp .domain.config .domain.config.personal
cp .env .env.personal
```

### Switch configurations:
```bash
# Switch to work domain
cp .domain.config.work .domain.config
cp .env.work .env
./scripts/generate-certs.sh
./scripts/start-dev.sh

# Switch back to personal
cp .domain.config.personal .domain.config
cp .env.personal .env
./scripts/generate-certs.sh
./scripts/start-dev.sh
```

## CI/CD Integration

For automated testing with different domains:

```bash
#!/bin/bash
# ci-test.sh

# Test with staging domain
./scripts/configure-domain.sh staging.company.com test-ci 4321 8080 3000
./scripts/setup-all.sh
./scripts/start-dev.sh &
npm run test:e2e

# Test with production-like domain
./scripts/configure-domain.sh company.com local-test 443 8080 443
./scripts/setup-all.sh
./scripts/start-dev.sh &
npm run test:integration
```

## Troubleshooting Different Domains

### Issue: "Domain not verified by Apple"

**Solution:** Ensure parent domain is verified in Apple Developer Portal

### Issue: "Certificate not trusted"

**Solution:** Run `mkcert -install` after changing domains

### Issue: "Cannot resolve domain"

**Solution:** Check `/etc/hosts` has entry for your new domain:
```bash
cat /etc/hosts | grep your-domain
# Should show: 127.0.0.1 local-dev.your-domain.com
```

### Issue: "CORS errors with new domain"

**Solution:** Restart backend with new domain configuration:
```bash
# Backend reads from environment
export LOCAL_DOMAIN=local-dev.new-domain.com
export FRONTEND_PORT=4321
export BACKEND_HTTPS_PORT=3000
cd packages/backend
go run ./cmd/local-server --https
```

## Security Considerations

1. **Private Domains**: Never commit `.domain.config` with sensitive internal domains
2. **Certificates**: Local certificates are for development only
3. **DNS**: Entries in `/etc/hosts` only affect your local machine
4. **Apple Credentials**: Keep Services ID and secrets secure

## Advanced Configuration

### Custom Certificate Paths

Edit `.domain.config`:
```bash
CERT_PATH=/custom/path/cert.pem
KEY_PATH=/custom/path/key.pem
```

### Multiple Subdomains

```bash
# Development
./scripts/configure-domain.sh company.com dev

# Staging
./scripts/configure-domain.sh company.com staging

# QA
./scripts/configure-domain.sh company.com qa
```

### Port Forwarding for Team Development

If team members need to access your local instance:

1. Configure with team-accessible subdomain:
   ```bash
   ./scripts/configure-domain.sh team.company.com john-dev
   ```

2. Add to team DNS (if you have internal DNS):
   ```
   john-dev.team.company.com → John's IP
   ```

3. Open firewall ports (be careful!):
   ```bash
   # macOS
   sudo pfctl -e
   # Add rules for ports 4321 and 3000
   ```

## Benefits of Generalized Setup

1. **Flexibility**: Use any domain you own
2. **Portability**: Easy to move between projects
3. **Team Friendly**: Each developer can use their subdomain
4. **CI/CD Ready**: Scriptable for automation
5. **No External Dependencies**: No ngrok, no tunnels
6. **Security**: Traffic never leaves your machine
7. **Cost**: Free (no paid services needed)

## Summary

The generalized domain setup allows you to:
- Use any domain you own for local HTTPS development
- Configure ports and subdomains to your preference
- Switch between multiple configurations easily
- Maintain consistency with production-like URLs
- Eliminate ngrok dependency completely

Simply run:
```bash
./scripts/configure-domain.sh your-domain.com
./scripts/setup-all.sh
./scripts/start-dev.sh
```

And you're ready to develop with Apple Sign In locally!