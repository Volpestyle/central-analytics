import { fromNodeProviderChain } from '@aws-sdk/credential-provider-node';

// AWS Configuration
export const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
export const AWS_ACCOUNT_ID = process.env.AWS_ACCOUNT_ID || '';

// Resource names for ilikeyacut app
export const AWS_RESOURCES = {
  apiGateway: {
    restApiId: process.env.API_GATEWAY_REST_API_ID || '',
    apiName: 'ilikeyacut-api-dev'
  },
  lambda: {
    functions: [
      'ilikeyacut-gemini-proxy-dev',
      'ilikeyacut-auth-dev',
      'ilikeyacut-payment-handler-dev',
      'ilikeyacut-notification-service-dev'
    ]
  },
  dynamodb: {
    tables: [
      'ilikeyacut-users-dev',
      'ilikeyacut-transactions-dev',
      'ilikeyacut-sessions-dev',
      'ilikeyacut-barbers-dev',
      'ilikeyacut-appointments-dev'
    ]
  },
  cloudwatch: {
    logGroups: [
      '/aws/lambda/ilikeyacut-gemini-proxy-dev',
      '/aws/lambda/ilikeyacut-auth-dev',
      '/aws/lambda/ilikeyacut-payment-handler-dev',
      '/aws/lambda/ilikeyacut-notification-service-dev',
      '/aws/api-gateway/ilikeyacut-api-dev'
    ],
    namespaces: [
      'AWS/Lambda',
      'AWS/DynamoDB',
      'AWS/ApiGateway'
    ]
  }
} as const;

// AWS Credentials configuration
export const getAWSCredentials = () => {
  // Use credential provider chain for maximum flexibility
  // This will check in order:
  // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  // 2. Shared credentials file (~/.aws/credentials)
  // 3. ECS container credentials
  // 4. EC2 instance metadata
  return fromNodeProviderChain({
    clientConfig: { region: AWS_REGION }
  });
};

// Common AWS client configuration
export const getAWSClientConfig = () => ({
  region: AWS_REGION,
  credentials: getAWSCredentials(),
  maxAttempts: 3,
  requestTimeout: 10000
});

// Cache configuration for AWS responses
export const CACHE_CONFIG = {
  metrics: {
    ttl: 60 * 5, // 5 minutes for CloudWatch metrics
    staleWhileRevalidate: 60 * 2 // 2 minutes stale-while-revalidate
  },
  logs: {
    ttl: 60 * 2, // 2 minutes for CloudWatch logs
    staleWhileRevalidate: 60 // 1 minute stale-while-revalidate
  },
  costs: {
    ttl: 60 * 60 * 6, // 6 hours for Cost Explorer data
    staleWhileRevalidate: 60 * 60 * 2 // 2 hours stale-while-revalidate
  },
  dynamodb: {
    ttl: 60 * 10, // 10 minutes for DynamoDB queries
    staleWhileRevalidate: 60 * 5 // 5 minutes stale-while-revalidate
  }
} as const;

// Performance monitoring thresholds
export const THRESHOLDS = {
  lambda: {
    duration: {
      warning: 1000, // 1 second
      critical: 3000 // 3 seconds
    },
    errors: {
      warning: 0.01, // 1% error rate
      critical: 0.05 // 5% error rate
    },
    throttles: {
      warning: 0.001, // 0.1% throttle rate
      critical: 0.01 // 1% throttle rate
    }
  },
  apiGateway: {
    latency: {
      warning: 500, // 500ms
      critical: 2000 // 2 seconds
    },
    '4xxErrors': {
      warning: 0.05, // 5% client error rate
      critical: 0.1 // 10% client error rate
    },
    '5xxErrors': {
      warning: 0.01, // 1% server error rate
      critical: 0.05 // 5% server error rate
    }
  },
  dynamodb: {
    consumedReadCapacity: {
      warning: 0.8, // 80% of provisioned capacity
      critical: 0.95 // 95% of provisioned capacity
    },
    consumedWriteCapacity: {
      warning: 0.8, // 80% of provisioned capacity
      critical: 0.95 // 95% of provisioned capacity
    },
    throttledRequests: {
      warning: 1, // Any throttled requests
      critical: 10 // 10 throttled requests
    }
  }
} as const;