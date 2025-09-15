# Central Analytics Dashboard

A secure admin dashboard with Apple Sign In authentication, built with Astro, React, and TypeScript.

## Features

- 🔐 **Apple Sign In** with Face ID/Touch ID support on iOS 26 and iPhone 17 Pro
- 🚀 **Server-side authentication** with JWT tokens
- 📊 **Analytics dashboard** with ECharts visualizations
- 📱 **PWA support** for installation on mobile devices
- 🎨 **Tailwind CSS** for modern UI design
- ⚡ **Fast development** with pnpm and Vite

## Tech Stack

- **Frontend**: Astro, React, TypeScript, Tailwind CSS
- **Authentication**: Apple Sign In, JWT
- **Charts**: ECharts
- **Server**: Node.js with TypeScript (tsx)
- **Package Manager**: pnpm

## Quick Start

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Apple Service ID and JWT secret
   ```

3. **Start development servers**
   ```bash
   pnpm run dev
   ```
   - Astro dev server: http://localhost:4321
   - Auth server: http://localhost:3001

## Authentication Setup

See [APPLE_AUTH_SETUP.md](./APPLE_AUTH_SETUP.md) for detailed instructions on:
- Setting up Apple Developer account
- Configuring Sign in with Apple
- Getting your Apple sub for whitelist
- Adding additional authorized users

## Available Scripts

- `pnpm run dev` - Start both Astro and auth servers concurrently
- `pnpm run dev:astro` - Start only the Astro dev server
- `pnpm run dev:server` - Start only the auth server
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build
- `pnpm run server` - Run auth server (without watch mode)

## Project Structure

```
central-analytics/
├── src/
│   ├── components/      # React components
│   ├── pages/           # Astro pages
│   ├── layouts/         # Layout components
│   └── stores/          # Zustand stores
├── server/
│   └── index.ts         # Auth server with Apple Sign In
├── public/              # Static assets
└── astro.config.mjs     # Astro configuration
```

## Security

- All authentication logic runs server-side
- Whitelist of authorized Apple IDs is maintained on the server
- JWT tokens expire after 7 days
- CORS configured per environment
- HTTPS required in production

## Deployment

1. Set production environment variables
2. Build the project: `pnpm run build`
3. Deploy the Astro app to your hosting provider
4. Deploy the auth server with Node.js support
5. Configure HTTPS and domain settings

## License

Private - All rights reserved