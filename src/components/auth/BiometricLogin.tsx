/**
 * Biometric Login Component
 * Main authentication interface with Apple Sign In and biometric support
 */

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@stores/authStore';

interface BiometricLoginProps {
  onSuccess?: () => void;
}

export const BiometricLogin: React.FC<BiometricLoginProps> = ({ onSuccess }) => {
  const {
    isLoading,
    error,
    biometricAvailable,
    signInWithApple,
    checkBiometricAvailability,
    clearError,
  } = useAuthStore();

  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if app is running as PWA
    const checkPWAStatus = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSPWA = (window.navigator as Navigator & { standalone?: boolean }).standalone;
      setIsPWA(isStandalone || isIOSPWA || false);
    };

    checkPWAStatus();
    checkBiometricAvailability();

    // Check if should show install prompt
    if (!isPWA && 'BeforeInstallPromptEvent' in window) {
      setShowInstallPrompt(true);
    }

    // Listen for app install
    window.addEventListener('appinstalled', () => {
      setShowInstallPrompt(false);
      setIsPWA(true);
    });

    return () => {
      window.removeEventListener('appinstalled', () => {});
    };
  }, [checkBiometricAvailability, isPWA]);

  const handleSignIn = async () => {
    clearError();
    await signInWithApple();
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleInstallPWA = async () => {
    // This would trigger the PWA install prompt
    // Implementation depends on the browser's beforeinstallprompt event
    const deferredPrompt = (window as Window & { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallPrompt(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 animate-fade-in">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-primary rounded-2xl flex items-center justify-center mb-6">
            <svg
              className="w-14 h-14 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Central Analytics</h1>
          <p className="mt-2 text-text-secondary">Monitor your apps, optimize performance</p>
        </div>

        {/* Install PWA Prompt */}
        {showInstallPrompt && !isPWA && (
          <div className="bg-surface-light border border-primary/20 rounded-xl p-4 animate-slide-up">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-text-primary font-medium">Install for Better Experience</p>
                <p className="text-xs text-text-secondary mt-1">
                  Install the app for full biometric support and offline access
                </p>
                <button
                  onClick={handleInstallPWA}
                  className="mt-3 text-xs font-medium text-primary hover:text-primary-light transition-colors"
                >
                  Install Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sign In Card */}
        <div className="bg-surface rounded-2xl p-8 shadow-xl">
          <div className="space-y-6">
            {/* Biometric Status */}
            {biometricAvailable && (
              <div className="flex items-center justify-center space-x-2 text-text-secondary">
                <svg
                  className="w-5 h-5 text-success"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm">Face ID / Touch ID Available</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-error/10 border border-error/30 rounded-lg p-3 animate-slide-up">
                <p className="text-sm text-error">{error}</p>
              </div>
            )}

            {/* Apple Sign In Button */}
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full min-h-touch bg-white text-black font-medium rounded-xl
                       flex items-center justify-center space-x-3 py-3 px-6
                       hover:bg-gray-50 active:bg-gray-100 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.44-1.09-.47-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.44C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.75 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.13zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <span>Sign in with Apple</span>
                </>
              )}
            </button>

            {/* Alternative Sign In Info */}
            <div className="text-center">
              <p className="text-xs text-text-tertiary">
                Secure authentication with {biometricAvailable ? 'biometric' : 'Apple ID'}
              </p>
            </div>
          </div>
        </div>

        {/* Security Info */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-4 text-text-tertiary">
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span className="text-xs">End-to-end encrypted</span>
            </div>
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span className="text-xs">Secure Enclave protected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Type declaration for PWA install prompt
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}