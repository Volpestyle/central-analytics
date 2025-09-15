// Dashboard Layout Component with Authentication for iOS 26
import React, { useEffect } from 'react';
import useAuthStore from '@/stores/auth.store';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const {
    isAuthenticated,
    profile,
    session,
    logout,
    refreshSession,
    lastAuthMethod
  } = useAuthStore();

  useEffect(() => {
    // Set up session refresh interval
    const refreshInterval = setInterval(() => {
      if (isAuthenticated && session) {
        refreshSession();
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, session]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const getAuthMethodIcon = () => {
    switch (lastAuthMethod) {
      case 'faceId':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="5" y="3" width="14" height="18" rx="2" strokeWidth="2"/>
            <circle cx="9" cy="9" r="1" fill="currentColor"/>
            <circle cx="15" cy="9" r="1" fill="currentColor"/>
            <path d="M8 15 Q12 17 16 15" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'touchId':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <ellipse cx="12" cy="12" rx="7" ry="9" strokeWidth="2"/>
            <ellipse cx="12" cy="12" rx="4" ry="6" strokeWidth="1.5" opacity="0.7"/>
            <ellipse cx="12" cy="12" rx="2" ry="3" strokeWidth="1" opacity="0.5"/>
          </svg>
        );
      case 'twoFactor':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (!isAuthenticated || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-apple-gray-950 border-b border-apple-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-apple-blue to-blue-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold">Central Analytics</h1>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* Auth Method Indicator */}
              {lastAuthMethod && (
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-apple-gray-900 rounded-lg">
                  <div className="text-apple-blue">
                    {getAuthMethodIcon()}
                  </div>
                  <span className="text-xs text-apple-gray-400">
                    {lastAuthMethod === 'faceId' ? 'Face ID' :
                     lastAuthMethod === 'touchId' ? 'Touch ID' : '2FA'}
                  </span>
                </div>
              )}

              {/* User Profile */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium">{profile.displayName}</p>
                  <p className="text-xs text-apple-gray-500">{profile.email}</p>
                </div>

                {/* User Avatar */}
                <div className="w-10 h-10 bg-gradient-to-br from-apple-blue to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {profile.firstName?.[0]}{profile.lastName?.[0]}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-2 text-apple-gray-400 hover:text-white transition-colors"
                title="Sign Out"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Session Status Bar */}
      {session && (
        <div className="bg-apple-gray-900 border-b border-apple-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-2 text-xs">
              <div className="flex items-center space-x-4">
                <span className="flex items-center text-green-400">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"/>
                  Secure Session Active
                </span>
                <span className="text-apple-gray-500">
                  Device: {session.deviceInfo.deviceModel}
                </span>
                <span className="text-apple-gray-500">
                  iOS {session.deviceInfo.osVersion}
                </span>
              </div>
              <div className="text-apple-gray-500">
                Session expires: {new Date(session.expiresAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-apple-gray-950 border-t border-apple-gray-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-xs text-apple-gray-500">
            <span>Central Analytics Dashboard</span>
            <span>Optimized for iOS 26 and iPhone 17 Pro</span>
          </div>
        </div>
      </footer>
    </div>
  );
};