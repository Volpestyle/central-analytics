/**
 * Two-Factor Authentication Component
 * Handles 2FA flow with biometric authentication as the primary method
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@stores/authStore';

interface TwoFactorAuthProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({ onSuccess, onCancel }) => {
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const biometricAvailable = useAuthStore((state) => state.biometricAvailable);
  const twoFactorChallenge = useAuthStore((state) => state.twoFactorChallenge);
  const completeTwoFactorAuth = useAuthStore((state) => state.completeTwoFactorAuth);
  const clearError = useAuthStore((state) => state.clearError);
  const signOut = useAuthStore((state) => state.signOut);

  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [authMethod, setAuthMethod] = useState<'faceID' | 'touchID' | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  useEffect(() => {
    // Detect authentication method on mount
    if (biometricAvailable) {
      const userAgent = navigator.userAgent.toLowerCase();
      const hasNotch = window.screen.height >= 812;
      setAuthMethod(
        userAgent.includes('iphone') && hasNotch ? 'faceID' : 'touchID'
      );

      // Auto-trigger biometric authentication
      if (attemptCount === 0) {
        handleBiometricAuth();
      }
    }
  }, [biometricAvailable]);

  const handleBiometricAuth = async () => {
    clearError();
    setAttemptCount(prev => prev + 1);

    await completeTwoFactorAuth('biometric');

    if (onSuccess && useAuthStore.getState().isAuthenticated) {
      onSuccess();
    }
  };

  const handleBackupCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupCode.trim()) return;

    clearError();
    // In production, this would handle backup code verification
    // For now, we'll show it's not implemented
    useAuthStore.setState({
      error: 'Backup code verification requires backend implementation'
    });
  };

  const handleCancel = () => {
    signOut();
    if (onCancel) {
      onCancel();
    }
  };

  const getAuthIcon = () => {
    if (authMethod === 'faceID') {
      return (
        <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="16" y="12" width="32" height="40" rx="8" />
          <circle cx="32" cy="26" r="4" />
          <path d="M24 38 C24 34, 28 32, 32 32 C36 32, 40 34, 40 38" />
          <path d="M20 20 L20 16" />
          <path d="M44 20 L44 16" />
          <path d="M20 44 L20 48" />
          <path d="M44 44 L44 48" />
        </svg>
      );
    } else {
      return (
        <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="32" cy="32" r="20" />
          <path d="M32 20 C25 20, 20 25, 20 32 C20 39, 25 44, 32 44 C39 44, 44 39, 44 32 C44 28, 42 24, 38 22" />
          <circle cx="32" cy="32" r="3" fill="currentColor" />
        </svg>
      );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 animate-fade-in">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary">Two-Factor Authentication</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Verify your identity to continue
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-surface rounded-2xl p-8 shadow-xl">
          {!useBackupCode ? (
            // Biometric Authentication
            <div className="space-y-6">
              {/* Biometric Icon */}
              <div className="flex justify-center text-primary animate-pulse-subtle">
                {getAuthIcon()}
              </div>

              {/* Status Message */}
              <div className="text-center space-y-2">
                <h2 className="text-lg font-medium text-text-primary">
                  {authMethod === 'faceID' ? 'Use Face ID' : 'Use Touch ID'}
                </h2>
                <p className="text-sm text-text-secondary">
                  {isLoading
                    ? 'Authenticating...'
                    : `Place your ${authMethod === 'faceID' ? 'face in view' : 'finger on the sensor'}`
                  }
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-error/10 border border-error/30 rounded-lg p-3 animate-slide-up">
                  <p className="text-sm text-error text-center">{error}</p>
                </div>
              )}

              {/* Retry Button */}
              {error && attemptCount > 0 && (
                <button
                  onClick={handleBiometricAuth}
                  disabled={isLoading}
                  className="w-full min-h-touch bg-primary text-white font-medium rounded-xl
                           py-3 px-6 hover:bg-primary-dark active:bg-primary-dark/90
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                           focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                           focus:ring-offset-background"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  ) : (
                    'Try Again'
                  )}
                </button>
              )}

              {/* Alternative Options */}
              <div className="pt-4 border-t border-surface-light space-y-3">
                <button
                  onClick={() => setUseBackupCode(true)}
                  className="w-full text-sm text-text-secondary hover:text-text-primary
                           transition-colors focus:outline-none"
                >
                  Use backup code instead
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full text-sm text-text-tertiary hover:text-text-secondary
                           transition-colors focus:outline-none"
                >
                  Cancel and sign out
                </button>
              </div>
            </div>
          ) : (
            // Backup Code Entry
            <div className="space-y-6">
              {/* Back Button */}
              <button
                onClick={() => setUseBackupCode(false)}
                className="flex items-center space-x-2 text-text-secondary hover:text-text-primary
                         transition-colors focus:outline-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm">Back to biometric</span>
              </button>

              {/* Backup Code Form */}
              <form onSubmit={handleBackupCodeSubmit} className="space-y-4">
                <div>
                  <label htmlFor="backup-code" className="block text-sm font-medium text-text-primary mb-2">
                    Enter Backup Code
                  </label>
                  <input
                    id="backup-code"
                    type="text"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX-XXXX"
                    maxLength={14}
                    className="w-full px-4 py-3 bg-surface-light border border-surface-light
                             rounded-lg text-text-primary placeholder-text-tertiary
                             focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                             font-mono text-center text-lg tracking-wider"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                  />
                  <p className="mt-2 text-xs text-text-tertiary">
                    Use one of your 8-digit backup codes
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-error/10 border border-error/30 rounded-lg p-3 animate-slide-up">
                    <p className="text-sm text-error text-center">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !backupCode.trim()}
                  className="w-full min-h-touch bg-primary text-white font-medium rounded-xl
                           py-3 px-6 hover:bg-primary-dark active:bg-primary-dark/90
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                           focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                           focus:ring-offset-background"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  ) : (
                    'Verify Code'
                  )}
                </button>
              </form>

              {/* Cancel Option */}
              <button
                onClick={handleCancel}
                className="w-full text-sm text-text-tertiary hover:text-text-secondary
                         transition-colors focus:outline-none"
              >
                Cancel and sign out
              </button>
            </div>
          )}
        </div>

        {/* Security Info */}
        <div className="text-center">
          <p className="text-xs text-text-tertiary">
            Your biometric data never leaves your device's Secure Enclave
          </p>
        </div>
      </div>
    </div>
  );
};