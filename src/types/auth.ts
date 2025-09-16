/**
 * Authentication Types
 * Shared type definitions for authentication across the application
 */

export interface User {
  id: string;
  email?: string;
  name?: string;
  appleUserSub: string;
  isAdmin: boolean;
  biometricEnabled: boolean;
  lastAuthenticated?: Date;
}

export interface AppleAuthCredentials {
  user: string;
  identityToken: string;
  authorizationCode: string;
  email?: string;
  fullName?: {
    givenName?: string;
    familyName?: string;
  };
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}