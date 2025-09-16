import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vitePWA from '@vite-pwa/astro';
import fs from 'fs';
import { config } from 'dotenv';

// Load environment variables
config();

// Load domain configuration if available
const loadDomainConfig = () => {
  try {
    if (fs.existsSync('.domain.config')) {
      const configContent = fs.readFileSync('.domain.config', 'utf-8');
      const config = {};
      configContent.split('\n').forEach(line => {
        if (line && !line.startsWith('#') && line.includes('=')) {
          const [key, value] = line.split('=');
          config[key.trim()] = value.trim();
        }
      });
      return config;
    }
  } catch (e) {
    console.log('Domain configuration not found. Using defaults.');
  }
  return {
    LOCAL_DOMAIN: process.env.PUBLIC_LOCAL_DOMAIN || 'local-dev.jcvolpe.me',
    FRONTEND_PORT: process.env.FRONTEND_PORT || '4321',
    BACKEND_HTTPS_PORT: process.env.BACKEND_HTTPS_PORT || '3000'
  };
};

const domainConfig = loadDomainConfig();

// Check if certificates exist for HTTPS mode
const httpsConfig = (() => {
  try {
    const certPath = './certs/cert.pem';
    const keyPath = './certs/key.pem';
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      return {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath)
      };
    }
  } catch (e) {
    console.log('HTTPS certificates not found. Run ./scripts/generate-certs.sh to enable HTTPS.');
  }
  return null;
})();

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    tailwind(),
    vitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Central Analytics Dashboard',
        short_name: 'Analytics',
        description: 'Centralized analytics platform for monitoring applications',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff,woff2,ttf,eot,ico}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallbackDenylist: [/^\/src\//], // Exclude source files
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false // Disable PWA in development to avoid caching issues
      }
    })
  ],
  output: 'static',
  server: {
    host: true, // Bind to 0.0.0.0 for domain access
    port: parseInt(domainConfig.FRONTEND_PORT),
    https: false // Disabled - proxy handles SSL termination
  },
  vite: {
    ssr: {
      noExternal: ['zustand']
    },
    server: {
      host: true,
      port: parseInt(domainConfig.FRONTEND_PORT),
      https: false, // Disabled - proxy handles SSL termination
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: parseInt(domainConfig.FRONTEND_PORT) // Use frontend port for HMR
      },
      proxy: {
        '/api': {
          target: httpsConfig
            ? `https://${domainConfig.LOCAL_DOMAIN}:${domainConfig.BACKEND_HTTPS_PORT}`
            : 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  }
});