import React, { useEffect, useState } from 'react';
import useAuthStore from '@/stores/auth.store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallbackUrl?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallbackUrl = '/login'
}) => {
  const { isAuthenticated, isLoading, initializeAuth, verifySession } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated) {
        await initializeAuth();
      } else {
        // Verify session is still valid
        const isValid = await verifySession();
        if (!isValid) {
          window.location.href = fallbackUrl;
          return;
        }
      }
      setIsChecking(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!isChecking && !isLoading && !isAuthenticated) {
      window.location.href = fallbackUrl;
    }
  }, [isChecking, isLoading, isAuthenticated, fallbackUrl]);

  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <p className="text-gray-400">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
};