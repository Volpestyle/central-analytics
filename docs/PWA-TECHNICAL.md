# PWA Technical Implementation Guide

## Overview
This document outlines the technical implementation details for building the Analytics Dashboard as a Progressive Web App (PWA), enabling cross-platform deployment from a single codebase without app store dependencies.

## Core PWA Technologies

### 1. Web App Manifest
```json
{
  "name": "Analytics Dashboard",
  "short_name": "Analytics",
  "description": "Business intelligence and metrics visualization platform",
  "start_url": "/dashboard?source=pwa",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#000000",
  "background_color": "#000000",
  "categories": ["business", "productivity", "finance"],
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/dashboard.png",
      "sizes": "1280x720",
      "type": "image/png",
      "label": "Main Dashboard View"
    },
    {
      "src": "/screenshots/analytics.png",
      "sizes": "1280x720",
      "type": "image/png",
      "label": "Analytics View"
    }
  ],
  "shortcuts": [
    {
      "name": "View Dashboard",
      "short_name": "Dashboard",
      "description": "Open main dashboard",
      "url": "/dashboard",
      "icons": [{ "src": "/icons/dashboard.png", "sizes": "192x192" }]
    },
    {
      "name": "Reports",
      "short_name": "Reports",
      "description": "View reports",
      "url": "/reports",
      "icons": [{ "src": "/icons/reports.png", "sizes": "192x192" }]
    }
  ],
  "share_target": {
    "action": "/share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url",
      "files": [
        {
          "name": "file",
          "accept": ["image/*", "application/pdf"]
        }
      ]
    }
  },
  "prefer_related_applications": false
}
```

### 2. Service Worker Implementation

#### Registration Strategy
```typescript
// app/layout.tsx or _app.tsx
useEffect(() => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration);

          // Check for updates every 5 minutes
          setInterval(() => {
            registration.update();
          }, 5 * 60 * 1000);

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available, show update prompt
                showUpdatePrompt();
              }
            });
          });
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });
    });
  }
}, []);
```

#### Service Worker Configuration
```javascript
// public/sw.js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// API caching strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
      }),
    ],
  })
);

// AWS data caching
registerRoute(
  ({ url }) => url.hostname.includes('amazonaws.com'),
  new StaleWhileRevalidate({
    cacheName: 'aws-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60, // 1 hour
      }),
    ],
  })
);

// Static assets caching
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font',
  new CacheFirst({
    cacheName: 'static-resources',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// Image caching
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
      }),
    ],
  })
);

// Background sync for failed requests
const bgSyncPlugin = new BackgroundSyncPlugin('failed-requests', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours
});

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/metrics/'),
  new NetworkFirst({
    plugins: [bgSyncPlugin],
  }),
  'POST'
);

// Offline fallback
const FALLBACK_URL = '/offline.html';
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.open('offline').then((cache) => {
          return cache.match(FALLBACK_URL);
        });
      })
    );
  }
});
```

### 3. Next.js PWA Configuration

#### Installation
```bash
npm install next-pwa workbox-window
npm install -D @types/workbox-window
```

#### next.config.js
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  publicExcludes: ['!robots.txt', '!sitemap.xml'],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        },
      },
    },
    {
      urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'jsdelivr-cdn',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
  ],
});

module.exports = withPWA({
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['amazonaws.com'],
  },
});
```

### 4. Offline Data Storage

#### IndexedDB Implementation
```typescript
// lib/offline-storage.ts
import Dexie, { Table } from 'dexie';

export interface CachedMetric {
  id?: number;
  metricId: string;
  timestamp: number;
  data: any;
  synced: boolean;
}

export interface PendingAction {
  id?: number;
  action: string;
  payload: any;
  timestamp: number;
  retries: number;
}

class OfflineDatabase extends Dexie {
  metrics!: Table<CachedMetric>;
  pendingActions!: Table<PendingAction>;

  constructor() {
    super('AnalyticsDashboard');
    this.version(1).stores({
      metrics: '++id, metricId, timestamp, synced',
      pendingActions: '++id, timestamp, retries',
    });
  }

  async cacheMetric(metricId: string, data: any) {
    return this.metrics.add({
      metricId,
      timestamp: Date.now(),
      data,
      synced: navigator.onLine,
    });
  }

  async getLatestMetric(metricId: string) {
    return this.metrics
      .where('metricId')
      .equals(metricId)
      .last();
  }

  async queueAction(action: string, payload: any) {
    return this.pendingActions.add({
      action,
      payload,
      timestamp: Date.now(),
      retries: 0,
    });
  }

  async syncPendingActions() {
    const pending = await this.pendingActions.toArray();

    for (const action of pending) {
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        });

        await this.pendingActions.delete(action.id!);
      } catch (error) {
        await this.pendingActions.update(action.id!, {
          retries: action.retries + 1,
        });
      }
    }
  }
}

export const db = new OfflineDatabase();
```

### 5. Push Notifications

#### Client Setup
```typescript
// hooks/usePushNotifications.ts
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_KEY!),
        });

        // Send subscription to server
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });
      }
    }
  };

  return { permission, requestPermission };
}
```

#### Service Worker Push Handler
```javascript
// In sw.js
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: 'explore',
        title: 'View Dashboard',
        icon: '/icons/checkmark.png',
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification('Analytics Alert', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});
```

### 6. Background Sync

```typescript
// hooks/useBackgroundSync.ts
export function useBackgroundSync() {
  const registerSync = async (tag: string) => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      try {
        await (registration as any).sync.register(tag);
        console.log('Background sync registered:', tag);
      } catch (error) {
        console.error('Background sync failed:', error);
        // Fallback to regular sync
        await performSync(tag);
      }
    }
  };

  const performSync = async (tag: string) => {
    switch (tag) {
      case 'metrics-sync':
        await db.syncPendingActions();
        break;
      case 'reports-sync':
        await syncReports();
        break;
      default:
        console.warn('Unknown sync tag:', tag);
    }
  };

  return { registerSync };
}
```

### 7. iOS-Specific Optimizations

```html
<!-- iOS PWA Meta Tags -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Analytics">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="apple-touch-startup-image" href="/splash/launch-640x1136.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)">
<link rel="apple-touch-startup-image" href="/splash/launch-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)">
<link rel="apple-touch-startup-image" href="/splash/launch-1242x2208.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)">
<link rel="apple-touch-startup-image" href="/splash/launch-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)">
<link rel="apple-touch-startup-image" href="/splash/launch-1536x2048.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)">
<link rel="apple-touch-startup-image" href="/splash/launch-1668x2224.png" media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)">
<link rel="apple-touch-startup-image" href="/splash/launch-2048x2732.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)">
```

### 8. Installation Prompt

```typescript
// components/InstallPrompt.tsx
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if app was installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 shadow-lg">
      <p className="text-white mb-2">Install Analytics Dashboard for quick access</p>
      <div className="flex gap-2">
        <button
          onClick={handleInstall}
          className="bg-white text-black px-4 py-2 rounded"
        >
          Install
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="text-white px-4 py-2"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
```

### 9. Performance Optimizations

#### Code Splitting
```typescript
// Lazy load heavy components
const DashboardCharts = dynamic(() => import('@/components/DashboardCharts'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

const ReportsModule = dynamic(() => import('@/modules/Reports'), {
  loading: () => <ModuleSkeleton />,
});
```

#### Preloading Critical Resources
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://your-api.amazonaws.com">
<link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
<link rel="preload" href="/fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin>
```

#### Route Prefetching
```typescript
// Prefetch routes on hover
import { useRouter } from 'next/router';

export function NavigationLink({ href, children }: Props) {
  const router = useRouter();

  return (
    <Link
      href={href}
      onMouseEnter={() => router.prefetch(href)}
      onFocus={() => router.prefetch(href)}
    >
      {children}
    </Link>
  );
}
```

### 10. Testing PWA Features

#### Lighthouse PWA Audit
```bash
# Run Lighthouse CLI
npm install -g lighthouse
lighthouse https://your-app.com --view

# Or use Chrome DevTools Lighthouse tab
```

#### Manual Testing Checklist
- [ ] App installs from browser
- [ ] App launches in standalone mode
- [ ] Offline mode works correctly
- [ ] Push notifications received
- [ ] Background sync works
- [ ] App updates properly
- [ ] All icons display correctly
- [ ] Splash screen appears on launch
- [ ] Share target works (if implemented)
- [ ] Shortcuts work from home screen

### 11. Deployment Considerations

#### Headers Configuration
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'application/manifest+json; charset=utf-8',
          },
        ],
      },
    ];
  },
};
```

#### HTTPS Requirement
PWAs require HTTPS in production. Ensure your deployment platform provides SSL certificates.

#### CDN Configuration
Configure CDN to bypass cache for:
- `/sw.js`
- `/manifest.json`
- `/offline.html`

## Browser Support

### Full PWA Support
- Chrome 73+
- Edge 79+
- Firefox 57+ (limited iOS support)
- Safari 11.3+ (iOS), 14+ (macOS)
- Samsung Internet 8.2+

### Graceful Degradation
For browsers without PWA support, the app falls back to standard web app functionality with all features except:
- Offline mode
- Push notifications
- Background sync
- Install prompts

## Monitoring & Analytics

### PWA Metrics to Track
```typescript
// Track PWA events
const trackPWAEvent = (event: string, data?: any) => {
  // Send to analytics service
  analytics.track(event, {
    ...data,
    isPWA: window.matchMedia('(display-mode: standalone)').matches,
    platform: navigator.platform,
    userAgent: navigator.userAgent,
  });
};

// Usage
trackPWAEvent('pwa_install_prompted');
trackPWAEvent('pwa_installed');
trackPWAEvent('pwa_offline_usage');
trackPWAEvent('pwa_notification_permission', { granted: true });
```

## Resources & Tools

### Development Tools
- [PWA Builder](https://www.pwabuilder.com/)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [Chrome DevTools PWA Features](https://developers.google.com/web/tools/chrome-devtools/progressive-web-apps)

### Testing Tools
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [WebPageTest](https://www.webpagetest.org/)

### Icon Generators
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Maskable.app](https://maskable.app/)

This technical guide provides a comprehensive foundation for implementing the Analytics Dashboard as a PWA, ensuring cross-platform compatibility and optimal user experience without app store dependencies.