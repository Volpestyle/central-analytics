/**
 * Zustand Authentication Store
 * Manages authentication state across the application
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appleAuth } from '@lib/apple-auth';
import type { AppleAuthCredentials, BiometricAuthResult } from '@lib/apple-auth';

export interface User {
  id: string;
  email?: string;
  name?: string;
  appleUserSub: string;
  isAdmin: boolean;
  biometricEnabled: boolean;
  lastAuthenticated?: Date;
}

export interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  biometricAvailable: boolean;
  twoFactorRequired: boolean;
  twoFactorChallenge: string | null;

  // Actions
  signInWithApple: () => Promise<void>;
  completeTwoFactorAuth: (method: 'biometric' | 'backup') => Promise<void>;
  signOut: () => void;
  checkBiometricAvailability: () => void;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => void;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

// API endpoints (configure these based on your backend)
// If PUBLIC_API_URL is empty, use relative URLs (same origin)
const API_BASE_URL = import.meta.env.PUBLIC_API_URL || '';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      biometricAvailable: false,
      twoFactorRequired: false,
      twoFactorChallenge: null,

      // Sign in with Apple
      signInWithApple: async () => {
        set({ isLoading: true, error: null });

        try {
          // Initialize Apple Sign In with proper redirect URI from env
          const redirectUri = import.meta.env.PUBLIC_APPLE_REDIRECT_URI || `${window.location.origin}/auth/callback`;
          console.log('Initializing Apple Sign In with redirect:', redirectUri);

          await appleAuth.initializeAppleSignIn(
            import.meta.env.PUBLIC_APPLE_CLIENT_ID || '',
            redirectUri
          );

          // Trigger Apple Sign In flow
          const credentials: AppleAuthCredentials = await appleAuth.signInWithApple();

          // Verify the ID token
          const tokenPayload = appleAuth.verifyAppleIDToken(credentials.idToken);

          // Send credentials to backend for verification and user creation/login
          const response = await fetch(`${API_BASE_URL}/api/auth/apple`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              idToken: credentials.idToken,
              authorizationCode: credentials.authorizationCode,
              user: credentials.user,
              email: credentials.email,
              fullName: credentials.fullName,
            }),
          });

          if (!response.ok) {
            throw new Error('Authentication failed');
          }

          const data = await response.json();

          // Check if 2FA is required
          if (data.twoFactorRequired) {
            set({
              twoFactorRequired: true,
              twoFactorChallenge: data.challenge,
              isLoading: false,
            });
            return;
          }

          // Store auth tokens
          appleAuth.storeAuthTokens(data.accessToken, data.refreshToken);

          // Create user object
          const user: User = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            appleUserSub: tokenPayload.sub,
            isAdmin: appleAuth.isAdminUser(tokenPayload.sub),
            biometricEnabled: data.user.biometricEnabled || false,
            lastAuthenticated: new Date(),
          };

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Check if biometric should be enabled for this user
          if (!user.biometricEnabled && get().biometricAvailable) {
            // Prompt user to enable biometric authentication
            setTimeout(() => {
              get().enableBiometric();
            }, 1000);
          }
        } catch (error) {
          console.error('Apple Sign In error:', error);
          const errorMessage = (error as Error).message || 'Authentication failed';

          // Provide more helpful error messages
          let userFriendlyMessage = errorMessage;
          if (errorMessage.includes('load') || errorMessage.includes('SDK')) {
            userFriendlyMessage = 'Unable to load Apple Sign In. Please check your internet connection and refresh the page.';
          } else if (errorMessage.includes('cancelled')) {
            userFriendlyMessage = 'Sign in was cancelled.';
          } else if (errorMessage.includes('popup')) {
            userFriendlyMessage = 'Sign in popup was blocked. Please allow popups for this site.';
          }

          set({
            isLoading: false,
            error: userFriendlyMessage,
            isAuthenticated: false,
          });
        }
      },

      // Complete 2FA authentication
      completeTwoFactorAuth: async (method: 'biometric' | 'backup') => {
        set({ isLoading: true, error: null });

        const { twoFactorChallenge } = get();
        if (!twoFactorChallenge) {
          set({ error: 'No 2FA challenge found', isLoading: false });
          return;
        }

        try {
          let verificationData: { method: string; signature?: string; code?: string };

          if (method === 'biometric') {
            // Authenticate with biometric
            const result: BiometricAuthResult = await appleAuth.authenticateWithBiometric(
              twoFactorChallenge
            );

            if (!result.success) {
              throw new Error(result.error?.message || 'Biometric authentication failed');
            }

            verificationData = {
              method: 'biometric',
              signature: twoFactorChallenge, // In production, this would be a signed challenge
            };
          } else {
            // Handle backup code verification (UI would collect this)
            set({ error: 'Backup code verification not implemented', isLoading: false });
            return;
          }

          // Send 2FA verification to backend
          const response = await fetch(`${API_BASE_URL}/api/auth/2fa/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              challenge: twoFactorChallenge,
              ...verificationData,
            }),
          });

          if (!response.ok) {
            throw new Error('2FA verification failed');
          }

          const data = await response.json();

          // Store auth tokens
          appleAuth.storeAuthTokens(data.accessToken, data.refreshToken);

          // Create user object
          const user: User = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            appleUserSub: data.user.appleUserSub,
            isAdmin: data.user.isAdmin,
            biometricEnabled: data.user.biometricEnabled || false,
            lastAuthenticated: new Date(),
          };

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            twoFactorRequired: false,
            twoFactorChallenge: null,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: (error as Error).message,
          });
        }
      },

      // Sign out
      signOut: () => {
        // Clear auth tokens
        appleAuth.clearAuthTokens();

        // Notify backend
        fetch(`${API_BASE_URL}/api/auth/signout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appleAuth.getAccessToken()}`,
          },
        }).catch(() => {
          // Silent fail - user is signing out anyway
        });

        // Clear state
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          twoFactorRequired: false,
          twoFactorChallenge: null,
        });
      },

      // Check biometric availability
      checkBiometricAvailability: () => {
        const available = appleAuth.isBiometricAvailable();
        set({ biometricAvailable: available });
      },

      // Enable biometric authentication
      enableBiometric: async () => {
        const { user } = get();
        if (!user) return;

        set({ isLoading: true, error: null });

        try {
          // Generate challenge from backend
          const response = await fetch(`${API_BASE_URL}/api/auth/biometric/challenge`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${appleAuth.getAccessToken()}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Failed to generate biometric challenge');
          }

          const { challenge } = await response.json();

          // Register biometric credential
          const credential = await appleAuth.registerBiometricCredential(user.id, challenge);

          if (!credential) {
            throw new Error('Failed to register biometric credential');
          }

          // Send credential to backend for storage
          const saveResponse = await fetch(`${API_BASE_URL}/api/auth/biometric/register`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${appleAuth.getAccessToken()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              credentialId: credential.id,
              challenge,
            }),
          });

          if (!saveResponse.ok) {
            throw new Error('Failed to save biometric credential');
          }

          // Update user state
          set({
            user: { ...user, biometricEnabled: true },
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: (error as Error).message,
          });
        }
      },

      // Disable biometric authentication
      disableBiometric: () => {
        const { user } = get();
        if (!user) return;

        // Clear local biometric data
        localStorage.removeItem('biometric_credential_id');

        // Notify backend
        fetch(`${API_BASE_URL}/api/auth/biometric/disable`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appleAuth.getAccessToken()}`,
          },
        }).catch(() => {
          // Silent fail
        });

        // Update user state
        set({
          user: { ...user, biometricEnabled: false },
        });
      },

      // Refresh session
      refreshSession: async () => {
        const { user } = get();
        if (!user) return;

        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${appleAuth.getAccessToken()}`,
            },
          });

          if (!response.ok) {
            throw new Error('Session refresh failed');
          }

          const data = await response.json();

          // Update tokens
          appleAuth.storeAuthTokens(data.accessToken, data.refreshToken);

          // Update last authenticated time
          set({
            user: { ...user, lastAuthenticated: new Date() },
          });
        } catch (error) {
          // If refresh fails, sign out user
          get().signOut();
        }
      },

      // Clear error
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Auto-refresh session every 30 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useAuthStore.getState();
    if (state.isAuthenticated && state.user) {
      state.refreshSession();
    }
  }, 30 * 60 * 1000);
}