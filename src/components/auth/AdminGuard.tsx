/**
 * Admin Guard Component
 * Restricts access to admin-only sections based on Apple ID
 */

import React, { useEffect } from 'react';
import { useAuthStore } from '@stores/authStore';

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({
  children,
  fallback,
  redirectTo = '/unauthorized'
}) => {
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // If user is not authenticated or not admin, handle redirect
    if (isAuthenticated && user && !user.isAdmin && redirectTo) {
      // In Astro, we'll use window.location for client-side navigation
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, user, redirectTo]);

  // Not authenticated - show loading or redirect to login
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-text-secondary">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Not admin - show fallback or access denied
  if (!user.isAdmin) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-6 text-center">
          {/* Access Denied Icon */}
          <div className="mx-auto w-24 h-24 bg-error/10 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-error"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Error Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-text-primary">Access Denied</h1>
            <p className="text-text-secondary">
              You don't have permission to access this area.
            </p>
            <p className="text-sm text-text-tertiary">
              Admin access is restricted to authorized Apple IDs only.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full min-h-touch bg-primary text-white font-medium rounded-xl
                       py-3 px-6 hover:bg-primary-dark active:bg-primary-dark/90
                       transition-colors focus:outline-none focus:ring-2 focus:ring-primary
                       focus:ring-offset-2 focus:ring-offset-background"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => useAuthStore.getState().signOut()}
              className="w-full text-sm text-text-secondary hover:text-text-primary
                       transition-colors focus:outline-none"
            >
              Sign out and try different account
            </button>
          </div>

          {/* Contact Info */}
          <div className="pt-6 border-t border-surface-light">
            <p className="text-xs text-text-tertiary">
              If you believe you should have access, contact your administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // User is admin - render children
  return <>{children}</>;
};

/**
 * Hook to check admin status
 * Useful for conditional rendering in components
 */
export const useAdminStatus = (): {
  isAdmin: boolean;
  isLoading: boolean;
  user: ReturnType<typeof useAuthStore>['user'];
} => {
  const { user, isAuthenticated } = useAuthStore();

  return {
    isAdmin: user?.isAdmin || false,
    isLoading: !isAuthenticated,
    user
  };
};

/**
 * HOC for admin-protected components
 * Wraps a component with AdminGuard
 */
export function withAdminAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: React.ReactNode;
    redirectTo?: string;
  }
): React.FC<P> {
  return (props: P) => (
    <AdminGuard fallback={options?.fallback} redirectTo={options?.redirectTo}>
      <Component {...props} />
    </AdminGuard>
  );
}