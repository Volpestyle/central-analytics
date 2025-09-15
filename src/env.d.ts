/// <reference types="astro/client" />

interface ImportMetaEnv {
  // AWS Configuration
  readonly AWS_REGION: string;
  readonly AWS_ACCOUNT_ID: string;
  readonly AWS_ACCESS_KEY_ID: string;
  readonly AWS_SECRET_ACCESS_KEY: string;

  // API Gateway Configuration
  readonly API_GATEWAY_REST_API_ID: string;

  // App Store Connect Configuration
  readonly APPSTORE_CONNECT_ISSUER_ID: string;
  readonly APPSTORE_CONNECT_KEY_ID: string;
  readonly APPSTORE_CONNECT_PRIVATE_KEY: string;
  readonly APPSTORE_APP_ID: string;
  readonly APPSTORE_VENDOR_NUMBER: string;

  // Optional Configuration
  readonly LAMBDA_FUNCTION_PREFIX?: string;
  readonly DYNAMODB_TABLE_PREFIX?: string;
  readonly ENVIRONMENT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}