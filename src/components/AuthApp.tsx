/**
 * Authentication App Component
 * Main authentication flow controller
 */

import React, { useEffect } from 'react';
import { BiometricLogin } from './auth/BiometricLogin';
import { TwoFactorAuth } from './auth/TwoFactorAuth';
import { useAuthStore } from '@stores/authStore';

export const AuthApp: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const twoFactorRequired = useAuthStore((state) => state.twoFactorRequired);

  useEffect(() => {
    // Check authentication status on mount
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('access_token='))
      ?.split('=')[1];

    if (token && isAuthenticated) {
      // User is already authenticated, redirect to dashboard
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated]);

  // Show 2FA if required
  if (twoFactorRequired) {
    return (
      <TwoFactorAuth
        onSuccess={() => {
          window.location.href = '/dashboard';
        }}
        onCancel={() => {
          // State will be reset by signOut in TwoFactorAuth
          // Component will re-render automatically
        }}
      />
    );
  }

  // Show login screen
  return (
    <BiometricLogin
      onSuccess={() => {
        // Check if 2FA is required after login
        // Using getState() is correct here - it's not a hook
        const state = useAuthStore.getState();
        if (!state.twoFactorRequired) {
          window.location.href = '/dashboard';
        }
      }}
    />
  );
};