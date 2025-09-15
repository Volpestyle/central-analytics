import appleSignin from 'apple-signin-auth';
import jwt from 'jsonwebtoken';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Table names from environment
const SESSIONS_TABLE = process.env.SESSIONS_TABLE || 'central-analytics-sessions';
const USERS_TABLE = process.env.USERS_TABLE || 'central-analytics-users';

// Cache for secrets
let cachedSecrets: { JWT_SECRET?: string; APPLE_SERVICE_ID?: string; ADMIN_APPLE_SUB?: string } = {};

// Get secrets from AWS Secrets Manager
async function getSecrets() {
  if (cachedSecrets.JWT_SECRET) {
    return cachedSecrets;
  }

  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: process.env.SECRETS_ARN || 'central-analytics-secrets'
      })
    );

    if (response.SecretString) {
      cachedSecrets = JSON.parse(response.SecretString);
    }
  } catch (error) {
    console.error('Failed to get secrets:', error);
    // Fallback to environment variables
    cachedSecrets = {
      JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      APPLE_SERVICE_ID: process.env.APPLE_SERVICE_ID || 'your.service.id.from.apple',
      ADMIN_APPLE_SUB: process.env.ADMIN_APPLE_SUB
    };
  }

  return cachedSecrets;
}

// Helper to check if user is whitelisted
async function isUserAllowed(sub: string): Promise<boolean> {
  const secrets = await getSecrets();

  // Check if admin
  if (secrets.ADMIN_APPLE_SUB === sub) {
    return true;
  }

  // Check DynamoDB users table
  try {
    const response = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { apple_sub: sub }
    }));

    return !!response.Item && response.Item.active !== false;
  } catch (error) {
    console.error('Error checking user whitelist:', error);
    return false;
  }
}

// Helper to create JWT
async function createToken(userId: string, email?: string): Promise<string> {
  const secrets = await getSecrets();
  return jwt.sign(
    {
      sub: userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    },
    secrets.JWT_SECRET!
  );
}

// Helper to verify JWT
async function verifyToken(token: string): Promise<any> {
  try {
    const secrets = await getSecrets();
    return jwt.verify(token, secrets.JWT_SECRET!);
  } catch {
    return null;
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
};

// Lambda handler
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  const path = event.path;
  const method = event.httpMethod;

  try {
    // Apple Sign In verification
    if (path === '/auth/apple/verify' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { id_token, user } = body;

      const secrets = await getSecrets();

      // Verify the Apple ID token
      const payload = await appleSignin.verifyIdToken(id_token, {
        audience: secrets.APPLE_SERVICE_ID!,
        ignoreExpiration: process.env.NODE_ENV === 'development'
      });

      const { sub: userId, email } = payload;

      console.log('Apple Sign In attempt:', { userId, email });

      // Check if user is allowed
      const isAllowed = await isUserAllowed(userId);
      if (!isAllowed) {
        console.warn('Unauthorized access attempt:', { userId, email });
        return {
          statusCode: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Access denied. This dashboard is restricted to authorized users only.'
          })
        };
      }

      // Create session
      const token = await createToken(userId, email);
      const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days

      // Store session in DynamoDB
      await docClient.send(new PutCommand({
        TableName: SESSIONS_TABLE,
        Item: {
          token,
          user_id: userId,
          email: email || user?.email,
          name: user?.name,
          created_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          ttl: Math.floor(expiresAt.getTime() / 1000) // DynamoDB TTL in seconds
        }
      }));

      // Update user info if first time
      if (user?.email || user?.name) {
        await docClient.send(new PutCommand({
          TableName: USERS_TABLE,
          Item: {
            apple_sub: userId,
            email: user?.email || email,
            name: user?.name,
            updated_at: new Date().toISOString()
          },
          ConditionExpression: 'attribute_exists(apple_sub)' // Only update if exists
        })).catch(() => {
          // Ignore if user doesn't exist in whitelist
        });
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          token,
          user: {
            id: userId,
            email: email || user?.email,
            name: user?.name
          }
        })
      };
    }

    // Verify session
    if (path === '/auth/verify' && method === 'POST') {
      const authHeader = event.headers.Authorization || event.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'No token provided' })
        };
      }

      const token = authHeader.substring(7);
      const decoded = await verifyToken(token);

      if (!decoded) {
        return {
          statusCode: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid token' })
        };
      }

      // Check if session exists in DynamoDB
      const response = await docClient.send(new GetCommand({
        TableName: SESSIONS_TABLE,
        Key: { token }
      }));

      if (!response.Item) {
        return {
          statusCode: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Session expired' })
        };
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valid: true,
          user: {
            id: decoded.sub,
            email: decoded.email
          }
        })
      };
    }

    // Logout
    if (path === '/auth/logout' && method === 'POST') {
      const authHeader = event.headers.Authorization || event.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        // Delete session from DynamoDB
        await docClient.send(new DeleteCommand({
          TableName: SESSIONS_TABLE,
          Key: { token }
        }));
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true })
      };
    }

    // Admin endpoints
    if (path.startsWith('/admin/')) {
      const authHeader = event.headers.Authorization || event.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Unauthorized' })
        };
      }

      const token = authHeader.substring(7);
      const decoded = await verifyToken(token);

      if (!decoded) {
        return {
          statusCode: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid token' })
        };
      }

      // Check if admin
      const secrets = await getSecrets();
      const isAdmin = decoded.sub === secrets.ADMIN_APPLE_SUB;

      if (!isAdmin) {
        // Check if user is admin in DynamoDB
        const userResponse = await docClient.send(new GetCommand({
          TableName: USERS_TABLE,
          Key: { apple_sub: decoded.sub }
        }));

        if (!userResponse.Item?.is_admin) {
          return {
            statusCode: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Admin access required' })
          };
        }
      }

      // Add user to whitelist
      if (path === '/admin/add-user' && method === 'POST') {
        const body = JSON.parse(event.body || '{}');
        const { apple_sub, email, name, is_admin } = body;

        await docClient.send(new PutCommand({
          TableName: USERS_TABLE,
          Item: {
            apple_sub,
            email,
            name,
            is_admin: is_admin || false,
            active: true,
            added_at: new Date().toISOString(),
            added_by: decoded.sub
          }
        }));

        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true })
        };
      }

      // Remove user from whitelist
      if (path === '/admin/remove-user' && method === 'POST') {
        const body = JSON.parse(event.body || '{}');
        const { apple_sub } = body;

        // Don't allow removing primary admin
        if (apple_sub === secrets.ADMIN_APPLE_SUB) {
          return {
            statusCode: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Cannot remove primary admin' })
          };
        }

        // Soft delete - mark as inactive
        await docClient.send(new PutCommand({
          TableName: USERS_TABLE,
          Item: {
            apple_sub,
            active: false,
            removed_at: new Date().toISOString(),
            removed_by: decoded.sub
          }
        }));

        // Delete user's sessions
        const sessionsResponse = await docClient.send(new QueryCommand({
          TableName: SESSIONS_TABLE,
          IndexName: 'user_id-index', // You'll need to create this GSI
          KeyConditionExpression: 'user_id = :uid',
          ExpressionAttributeValues: {
            ':uid': apple_sub
          }
        }));

        if (sessionsResponse.Items) {
          for (const session of sessionsResponse.Items) {
            await docClient.send(new DeleteCommand({
              TableName: SESSIONS_TABLE,
              Key: { token: session.token }
            }));
          }
        }

        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true })
        };
      }

      // List allowed users
      if (path === '/admin/users' && method === 'GET') {
        const response = await docClient.send(new ScanCommand({
          TableName: USERS_TABLE,
          FilterExpression: 'active = :active',
          ExpressionAttributeValues: {
            ':active': true
          }
        }));

        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: response.Items || [] })
        };
      }
    }

    // Health check
    if (path === '/health') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: 'OK'
      };
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: 'Not Found'
    };

  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};