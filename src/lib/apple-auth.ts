/**
 * Apple Authentication SDK Integration
 * Handles Sign in with Apple and biometric authentication for iOS 26 / iPhone 17 Pro
 */

import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie';

// Apple ID Token payload structure
interface AppleIDTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string; // Unique identifier for the user
  c_hash?: string;
  email?: string;
  email_verified?: string;
  is_private_email?: boolean;
  auth_time: number;
  nonce_supported?: boolean;
  real_user_status?: number;
}

// User credentials from Apple Sign In
export interface AppleAuthCredentials {
  idToken: string;
  authorizationCode: string;
  email?: string;
  fullName?: {
    givenName?: string;
    familyName?: string;
  };
  user: string; // Apple's unique user identifier
  state?: string;
}

// Biometric authentication result
export interface BiometricAuthResult {
  success: boolean;
  error?: BiometricError;
  authenticationType?: 'faceID' | 'touchID';
}

// Biometric error types
export interface BiometricError {
  code: BiometricErrorCode;
  message: string;
}

export enum BiometricErrorCode {
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  NOT_ENROLLED = 'NOT_ENROLLED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  USER_CANCELLED = 'USER_CANCELLED',
  LOCKOUT = 'LOCKOUT',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

// WebAuthn credential for biometric authentication
interface PublicKeyCredentialCreationOptionsJSON {
  challenge: string;
  rp: {
    name: string;
    id?: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number;
  }>;
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform';
    requireResidentKey?: boolean;
    userVerification?: 'required' | 'preferred' | 'discouraged';
  };
  timeout?: number;
  attestation?: 'none' | 'indirect' | 'direct';
}

// Admin Apple ID (configure this with your specific Apple ID sub)
const ADMIN_APPLE_SUB = process.env.PUBLIC_ADMIN_APPLE_SUB || '';

class AppleAuthenticationSDK {
  private static instance: AppleAuthenticationSDK;
  private appleAuthScriptLoaded = false;
  private biometricSupported = false;

  private constructor() {
    this.checkBiometricSupport();
  }

  static getInstance(): AppleAuthenticationSDK {
    if (!AppleAuthenticationSDK.instance) {
      AppleAuthenticationSDK.instance = new AppleAuthenticationSDK();
    }
    return AppleAuthenticationSDK.instance;
  }

  /**
   * Check if biometric authentication is supported on the device
   */
  private async checkBiometricSupport(): Promise<void> {
    // Check for WebAuthn support (required for biometric auth in PWA)
    if (window.PublicKeyCredential &&
        window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      try {
        this.biometricSupported = await window.PublicKeyCredential
          .isUserVerifyingPlatformAuthenticatorAvailable();
      } catch {
        this.biometricSupported = false;
      }
    }
  }

  /**
   * Load Apple Sign In JavaScript SDK
   */
  private async loadAppleAuthScript(): Promise<void> {
    if (this.appleAuthScriptLoaded) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.appleAuthScriptLoaded = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load Apple Sign In SDK'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Initialize Apple Sign In
   */
  async initializeAppleSignIn(clientId: string, redirectUri: string): Promise<void> {
    await this.loadAppleAuthScript();

    if (!window.AppleID) {
      throw new Error('Apple Sign In SDK not available');
    }

    window.AppleID.auth.init({
      clientId,
      scope: 'name email',
      redirectURI: redirectUri,
      state: this.generateState(),
      usePopup: true
    });
  }

  /**
   * Trigger Apple Sign In flow
   */
  async signInWithApple(): Promise<AppleAuthCredentials> {
    if (!window.AppleID) {
      throw new Error('Apple Sign In not initialized');
    }

    try {
      const response = await window.AppleID.auth.signIn();

      // Store the auth state for later verification
      if (response.authorization.state) {
        sessionStorage.setItem('apple_auth_state', response.authorization.state);
      }

      return {
        idToken: response.authorization.id_token,
        authorizationCode: response.authorization.code,
        email: response.user?.email,
        fullName: response.user?.name,
        user: response.authorization.user,
        state: response.authorization.state
      };
    } catch (error) {
      if ((error as Error).message?.includes('popup_closed_by_user')) {
        throw new Error('Sign in cancelled by user');
      }
      throw error;
    }
  }

  /**
   * Verify Apple ID token and extract user information
   */
  verifyAppleIDToken(idToken: string): AppleIDTokenPayload {
    try {
      const decoded = jwtDecode<AppleIDTokenPayload>(idToken);

      // Verify token hasn't expired
      const now = Date.now() / 1000;
      if (decoded.exp < now) {
        throw new Error('Apple ID token has expired');
      }

      // Verify issuer
      if (decoded.iss !== 'https://appleid.apple.com') {
        throw new Error('Invalid token issuer');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Failed to verify Apple ID token: ${(error as Error).message}`);
    }
  }

  /**
   * Check if user has admin privileges based on Apple ID
   */
  isAdminUser(appleUserSub: string): boolean {
    return appleUserSub === ADMIN_APPLE_SUB;
  }

  /**
   * Register biometric credentials for 2FA
   */
  async registerBiometricCredential(userId: string, challenge: string): Promise<Credential | null> {
    if (!this.biometricSupported) {
      throw new Error('Biometric authentication not available on this device');
    }

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptionsJSON = {
      challenge: this.base64URLEncode(challenge),
      rp: {
        name: 'Central Analytics Dashboard',
        id: window.location.hostname
      },
      user: {
        id: this.base64URLEncode(userId),
        name: userId,
        displayName: 'Analytics User'
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required'
      },
      timeout: 60000,
      attestation: 'none'
    };

    try {
      const credential = await navigator.credentials.create({
        publicKey: this.convertToArrayBuffer(publicKeyCredentialCreationOptions)
      });

      // Store credential ID for future authentication
      if (credential && credential.id) {
        localStorage.setItem('biometric_credential_id', credential.id);
      }

      return credential;
    } catch (error) {
      throw this.mapBiometricError(error as Error);
    }
  }

  /**
   * Authenticate using biometrics for 2FA
   */
  async authenticateWithBiometric(challenge: string): Promise<BiometricAuthResult> {
    if (!this.biometricSupported) {
      return {
        success: false,
        error: {
          code: BiometricErrorCode.NOT_AVAILABLE,
          message: 'Biometric authentication is not available on this device'
        }
      };
    }

    const credentialId = localStorage.getItem('biometric_credential_id');
    if (!credentialId) {
      return {
        success: false,
        error: {
          code: BiometricErrorCode.NOT_ENROLLED,
          message: 'No biometric credentials found. Please register first.'
        }
      };
    }

    try {
      const publicKeyCredentialRequestOptions = {
        challenge: this.base64URLEncode(challenge),
        allowCredentials: [{
          id: this.base64URLDecode(credentialId),
          type: 'public-key' as const,
          transports: ['internal'] as AuthenticatorTransport[]
        }],
        userVerification: 'required' as UserVerificationRequirement,
        timeout: 60000
      };

      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      });

      if (credential) {
        // Determine authentication type based on device capabilities
        const authenticationType = this.detectAuthenticationType();

        return {
          success: true,
          authenticationType
        };
      }

      return {
        success: false,
        error: {
          code: BiometricErrorCode.AUTHENTICATION_FAILED,
          message: 'Biometric authentication failed'
        }
      };
    } catch (error) {
      const biometricError = this.mapBiometricError(error as Error);
      return {
        success: false,
        error: biometricError
      };
    }
  }

  /**
   * Detect whether device uses Face ID or Touch ID
   */
  private detectAuthenticationType(): 'faceID' | 'touchID' {
    // For iPhone 17 Pro, it will use Face ID
    // Check device model and iOS version
    const userAgent = navigator.userAgent.toLowerCase();

    // iPhone X and later models use Face ID
    if (userAgent.includes('iphone')) {
      // Simple heuristic: newer iPhones use Face ID
      // In production, you'd want more sophisticated detection
      const hasNotch = window.screen.height >= 812; // iPhone X and later screen heights
      return hasNotch ? 'faceID' : 'touchID';
    }

    // iPad Pro with Face ID
    if (userAgent.includes('ipad') && window.screen.height >= 1024) {
      return 'faceID';
    }

    // Default to Touch ID for older devices
    return 'touchID';
  }

  /**
   * Map native errors to biometric error types
   */
  private mapBiometricError(error: Error): BiometricError {
    const message = error.message.toLowerCase();

    if (message.includes('not allowed') || message.includes('permission')) {
      return {
        code: BiometricErrorCode.PERMISSION_DENIED,
        message: 'Permission to use biometric authentication was denied'
      };
    }

    if (message.includes('cancelled') || message.includes('abort')) {
      return {
        code: BiometricErrorCode.USER_CANCELLED,
        message: 'Authentication was cancelled'
      };
    }

    if (message.includes('timeout')) {
      return {
        code: BiometricErrorCode.AUTHENTICATION_FAILED,
        message: 'Authentication timed out'
      };
    }

    if (message.includes('lockout') || message.includes('locked')) {
      return {
        code: BiometricErrorCode.LOCKOUT,
        message: 'Device is locked due to too many failed attempts'
      };
    }

    return {
      code: BiometricErrorCode.SYSTEM_ERROR,
      message: `System error: ${error.message}`
    };
  }

  /**
   * Generate secure state parameter for CSRF protection
   */
  private generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64URLEncode(String.fromCharCode.apply(null, Array.from(array)));
  }

  /**
   * Base64 URL encoding
   */
  private base64URLEncode(str: string): string {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Base64 URL decoding
   */
  private base64URLDecode(str: string): ArrayBuffer {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Convert credential options to ArrayBuffer format
   */
  private convertToArrayBuffer(options: PublicKeyCredentialCreationOptionsJSON): PublicKeyCredentialCreationOptions {
    return {
      ...options,
      challenge: this.base64URLDecode(options.challenge),
      user: {
        ...options.user,
        id: this.base64URLDecode(options.user.id)
      }
    } as PublicKeyCredentialCreationOptions;
  }

  /**
   * Check if biometric authentication is available
   */
  isBiometricAvailable(): boolean {
    return this.biometricSupported;
  }

  /**
   * Store authentication tokens securely
   */
  storeAuthTokens(accessToken: string, refreshToken?: string): void {
    // Store access token in memory and cookie for SSR
    Cookies.set('access_token', accessToken, {
      secure: true,
      sameSite: 'strict',
      expires: 1 // 1 day
    });

    // Store refresh token in httpOnly cookie (server should handle this)
    if (refreshToken) {
      // This should be set by the server as httpOnly
      sessionStorage.setItem('has_refresh_token', 'true');
    }
  }

  /**
   * Clear authentication tokens
   */
  clearAuthTokens(): void {
    Cookies.remove('access_token');
    sessionStorage.removeItem('has_refresh_token');
    sessionStorage.removeItem('apple_auth_state');
    localStorage.removeItem('biometric_credential_id');
  }

  /**
   * Get stored access token
   */
  getAccessToken(): string | undefined {
    return Cookies.get('access_token');
  }
}

// Export singleton instance
export const appleAuth = AppleAuthenticationSDK.getInstance();

// Type declarations for Apple Sign In SDK
declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          state: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: {
            code: string;
            id_token: string;
            state: string;
            user: string;
          };
          user?: {
            email?: string;
            name?: {
              firstName?: string;
              lastName?: string;
            };
          };
        }>;
      };
    };
  }
}