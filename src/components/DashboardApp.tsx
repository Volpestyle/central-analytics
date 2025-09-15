/**
 * Dashboard Application Component
 * Main dashboard interface after authentication
 */

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@stores/authStore';

export const DashboardApp: React.FC = () => {
  const { user, isAuthenticated, signOut, biometricAvailable, enableBiometric, disableBiometric } = useAuthStore();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Check authentication on mount
    if (!isAuthenticated) {
      window.location.href = '/';
    }
  }, [isAuthenticated]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const handleSignOut = () => {
    signOut();
    window.location.href = '/';
  };

  const toggleBiometric = async () => {
    if (user.biometricEnabled) {
      disableBiometric();
    } else {
      await enableBiometric();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-surface-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-text-primary">Central Analytics</h1>
            </div>

            <div className="flex items-center space-x-4">
              {user.isAdmin && (
                <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-medium rounded-full">
                  ADMIN
                </span>
              )}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg hover:bg-surface-light transition-colors"
              >
                <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <div className="bg-surface rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            Welcome back, {user.name || user.email || 'User'}
          </h2>
          <p className="text-text-secondary">
            Monitor your applications and track performance metrics in real-time.
          </p>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-surface rounded-2xl p-6 mb-6 animate-slide-up">
            <h3 className="text-lg font-medium text-text-primary mb-4">Security Settings</h3>

            {/* Biometric Toggle */}
            {biometricAvailable && (
              <div className="flex items-center justify-between py-3 border-b border-surface-light">
                <div>
                  <p className="text-text-primary font-medium">Biometric Authentication</p>
                  <p className="text-sm text-text-secondary">Use Face ID / Touch ID for 2FA</p>
                </div>
                <button
                  onClick={toggleBiometric}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    user.biometricEnabled ? 'bg-primary' : 'bg-surface-light'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      user.biometricEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* User Info */}
            <div className="py-3 border-b border-surface-light">
              <p className="text-sm text-text-secondary">Email</p>
              <p className="text-text-primary">{user.email || 'Not provided'}</p>
            </div>

            <div className="py-3 border-b border-surface-light">
              <p className="text-sm text-text-secondary">Apple ID</p>
              <p className="text-text-primary font-mono text-xs">{user.appleUserSub}</p>
            </div>

            <div className="py-3">
              <p className="text-sm text-text-secondary">Last Authentication</p>
              <p className="text-text-primary">
                {user.lastAuthenticated ? new Date(user.lastAuthenticated).toLocaleString() : 'Unknown'}
              </p>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="w-full mt-4 min-h-touch bg-error/10 text-error font-medium rounded-xl
                       py-3 px-6 hover:bg-error/20 active:bg-error/30 transition-colors
                       focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2
                       focus:ring-offset-background"
            >
              Sign Out
            </button>
          </div>
        )}

        {/* Application Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* ilikeyacut App Card */}
          <div className="bg-surface rounded-xl p-6 border border-surface-light hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="px-2 py-1 bg-success/20 text-success text-xs font-medium rounded">Active</span>
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-1">ilikeyacut</h3>
            <p className="text-sm text-text-secondary mb-4">iOS App - Hairstyle AI</p>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-tertiary">API Calls Today</span>
                <span className="text-text-primary font-medium">1,234</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-tertiary">Active Users</span>
                <span className="text-text-primary font-medium">856</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-tertiary">Revenue (MTD)</span>
                <span className="text-success font-medium">$2,458</span>
              </div>
            </div>
          </div>

          {/* Placeholder for future apps */}
          <div className="bg-surface/50 rounded-xl p-6 border border-surface-light border-dashed">
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-text-tertiary mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <p className="text-text-secondary text-sm">Add New Application</p>
              <p className="text-text-tertiary text-xs mt-1">Coming Soon</p>
            </div>
          </div>
        </div>

        {/* Admin Section */}
        {user.isAdmin && (
          <div className="mt-8 bg-surface rounded-xl p-6 border border-warning/30">
            <div className="flex items-center space-x-3 mb-4">
              <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="text-lg font-medium text-text-primary">Admin Controls</h3>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              You have administrator privileges. Access system configuration and user management.
            </p>
            <button
              onClick={() => window.location.href = '/admin'}
              className="min-h-touch bg-warning/20 text-warning font-medium rounded-lg
                       px-4 py-2 hover:bg-warning/30 transition-colors text-sm"
            >
              Open Admin Panel
            </button>
          </div>
        )}
      </main>
    </div>
  );
};