import appleSignin from 'apple-signin-auth';
import jwt from 'jsonwebtoken';
import http from 'http';
import { URL } from 'url';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const APPLE_SERVICE_ID = process.env.APPLE_SERVICE_ID || 'your.service.id.from.apple';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:4321';
const PORT = process.env.PORT || 3001;

// In-memory storage for sessions and allowed users
interface Session {
  user_id: string;
  email?: string;
  name?: string;
  token: string;
  created_at: Date;
  expires_at: Date;
}

interface AllowedUser {
  apple_sub: string;
  email?: string;
  name?: string;
  added_at: Date;
  added_by?: string;
  is_admin: boolean;
}

const sessions = new Map<string, Session>();
const allowedUsers = new Map<string, AllowedUser>();

// Server-side whitelist - ONLY hardcode here, never on client
// To get your sub: Comment out the whitelist check, log in once, check logs, then add it
const ALLOWED_APPLE_SUBS = new Set<string>([
  // Add your Apple sub here after first login
  // 'your-apple-sub-here', // e.g., '001234.abcde.5678'
]);

// Add default admin if env variable is set
if (process.env.ADMIN_APPLE_SUB) {
  ALLOWED_APPLE_SUBS.add(process.env.ADMIN_APPLE_SUB);
}

// Helper to check if user is whitelisted
async function isUserAllowed(sub: string): Promise<boolean> {
  // Check hardcoded whitelist first
  if (ALLOWED_APPLE_SUBS.has(sub)) {
    return true;
  }

  // Check in-memory whitelist
  return allowedUsers.has(sub);
}

// Helper to create JWT
function createToken(userId: string, email?: string): string {
  return jwt.sign(
    {
      sub: userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    },
    JWT_SECRET
  );
}

// Helper to verify JWT
function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Clean up expired sessions periodically
setInterval(() => {
  const now = new Date();
  for (const [token, session] of sessions.entries()) {
    if (session.expires_at < now) {
      sessions.delete(token);
    }
  }
}, 60 * 60 * 1000); // Every hour

// CORS headers helper
function setCorsHeaders(res: http.ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

// Parse JSON body
async function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);

  // Set CORS headers
  setCorsHeaders(res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Apple Sign In verification endpoint
  if (url.pathname === '/auth/apple/verify' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { id_token, user } = body;

      // Verify the Apple ID token
      const payload = await appleSignin.verifyIdToken(id_token, {
        audience: APPLE_SERVICE_ID,
        // In production, remove ignoreExpiration
        ignoreExpiration: process.env.NODE_ENV === 'development'
      });

      const { sub: userId, email } = payload;

      // Log for initial setup (remove in production)
      console.log('Apple Sign In attempt:', { userId, email });

      // Check if user is allowed
      const isAllowed = await isUserAllowed(userId);
      if (!isAllowed) {
        console.warn('Unauthorized access attempt:', { userId, email });
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Access denied. This dashboard is restricted to authorized users only.'
        }));
        return;
      }

      // Create session
      const token = createToken(userId, email);
      const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days

      // Store session in memory
      sessions.set(token, {
        user_id: userId,
        email: email || user?.email,
        name: user?.name,
        token,
        created_at: new Date(),
        expires_at: expiresAt
      });

      // If first time user and they provided name/email, update allowed_users
      if ((user?.email || user?.name) && allowedUsers.has(userId)) {
        const existingUser = allowedUsers.get(userId)!;
        existingUser.email = existingUser.email || user?.email;
        existingUser.name = existingUser.name || user?.name;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        token,
        user: {
          id: userId,
          email: email || user?.email,
          name: user?.name
        }
      }));

    } catch (error) {
      console.error('Apple verification error:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid Apple ID token' }));
    }
    return;
  }

  // Verify session endpoint
  if (url.pathname === '/auth/verify' && req.method === 'POST') {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No token provided' }));
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid token' }));
      return;
    }

    // Check if session exists and is valid
    const session = sessions.get(token);
    if (!session || session.expires_at < new Date()) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session expired' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      valid: true,
      user: {
        id: decoded.sub,
        email: decoded.email
      }
    }));
    return;
  }

  // Logout endpoint
  if (url.pathname === '/auth/logout' && req.method === 'POST') {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      sessions.delete(token);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Admin endpoints (protected)
  if (url.pathname.startsWith('/admin/')) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid token' }));
      return;
    }

    // Check if user is admin
    const adminUser = allowedUsers.get(decoded.sub);
    const isAdmin = (adminUser?.is_admin) || ALLOWED_APPLE_SUBS.has(decoded.sub);

    if (!isAdmin) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }

    // Add user to whitelist
    if (url.pathname === '/admin/add-user' && req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const { apple_sub, email, name, is_admin } = body;

        allowedUsers.set(apple_sub, {
          apple_sub,
          email,
          name,
          added_at: new Date(),
          added_by: decoded.sub,
          is_admin: is_admin || false
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to add user' }));
      }
      return;
    }

    // Remove user from whitelist
    if (url.pathname === '/admin/remove-user' && req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const { apple_sub } = body;

        // Don't allow removing hardcoded admins
        if (ALLOWED_APPLE_SUBS.has(apple_sub)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Cannot remove primary admin' }));
          return;
        }

        allowedUsers.delete(apple_sub);

        // Remove any sessions for this user
        for (const [token, session] of sessions.entries()) {
          if (session.user_id === apple_sub) {
            sessions.delete(token);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to remove user' }));
      }
      return;
    }

    // List allowed users
    if (url.pathname === '/admin/users' && req.method === 'GET') {
      const users = Array.from(allowedUsers.values());
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ users }));
      return;
    }
  }

  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200);
    res.end('OK');
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Auth server running on http://localhost:${PORT}`);
});