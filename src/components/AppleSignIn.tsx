import React, { useEffect } from 'react';
import AppleSignIn from 'react-apple-signin-auth';
import useAuthStore from '@/stores/auth.store';

interface AppleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const AppleSignInButton: React.FC<AppleSignInButtonProps> = ({
  onSuccess,
  onError
}) => {
  const { setAuthenticated, setUser, setToken } = useAuthStore();

  useEffect(() => {
    // Load Apple Sign In script
    const script = document.createElement('script');
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleSuccess = async (response: any) => {
    try {
      const { authorization, user } = response;

      // Send to backend for verification
      const verifyResponse = await fetch('http://localhost:3001/auth/apple/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          id_token: authorization.id_token,
          user: user // This is only provided on first sign-in
        })
      });

      const data = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Store auth data
      setToken(data.token);
      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name
      });
      setAuthenticated(true);

      // Store token in localStorage for persistence
      localStorage.setItem('auth_token', data.token);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Apple Sign In error:', error);
      if (onError) {
        onError(error instanceof Error ? error.message : 'Authentication failed');
      }
    }
  };

  const handleError = (error: any) => {
    console.error('Apple Sign In error:', error);
    if (onError) {
      onError('Sign in was cancelled or failed');
    }
  };

  return (
    <div className="apple-signin-container">
      <AppleSignIn
        authOptions={{
          clientId: import.meta.env.PUBLIC_APPLE_SERVICE_ID || 'your.service.id',
          scope: 'name email',
          redirectURI: window.location.origin + '/auth/apple/callback',
          state: Math.random().toString(36).substring(7),
          nonce: Math.random().toString(36).substring(7),
          usePopup: true,
        }}
        onSuccess={handleSuccess}
        onError={handleError}
        uiType="dark"
        className="apple-auth-btn"
        render={(props: any) => (
          <button
            {...props}
            className="w-full px-6 py-4 bg-black text-white rounded-xl font-medium
                     flex items-center justify-center gap-3 transition-all
                     hover:bg-gray-900 active:scale-95 border border-gray-800"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Sign in with Apple
          </button>
        )}
      />
    </div>
  );
};