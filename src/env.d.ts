/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_APPLE_CLIENT_ID: string;
  readonly PUBLIC_ADMIN_APPLE_SUB: string;
  readonly PUBLIC_API_URL: string;
  readonly PUBLIC_APP_NAME: string;
  readonly PUBLIC_APP_SHORT_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}