import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email?: string;
  name?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  error: string | null;

  // Actions
  setAuthenticated: (value: boolean) => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  initializeAuth: () => Promise<void>;
  verifySession: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3001';

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      token: null,
      error: null,

      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setLoading: (value) => set({ isLoading: value }),
      setError: (error) => set({ error }),

      initializeAuth: async () => {
        set({ isLoading: true, error: null });

        try {
          // Check for existing token
          const storedToken = localStorage.getItem('auth_token') || get().token;

          if (!storedToken) {
            set({ isAuthenticated: false, isLoading: false });
            return;
          }

          // Verify token with backend
          const response = await fetch(`${API_URL}/auth/verify`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            set({
              isAuthenticated: true,
              token: storedToken,
              user: data.user,
              isLoading: false
            });
          } else {
            // Token invalid or expired
            localStorage.removeItem('auth_token');
            set({
              isAuthenticated: false,
              token: null,
              user: null,
              isLoading: false
            });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({
            isAuthenticated: false,
            error: 'Failed to initialize authentication',
            isLoading: false
          });
        }
      },

      verifySession: async () => {
        const token = get().token;
        if (!token) return false;

        try {
          const response = await fetch(`${API_URL}/auth/verify`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            set({ user: data.user });
            return true;
          } else {
            await get().logout();
            return false;
          }
        } catch (error) {
          console.error('Session verification error:', error);
          return false;
        }
      },

      logout: async () => {
        const token = get().token;

        if (token) {
          try {
            await fetch(`${API_URL}/auth/logout`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
          } catch (error) {
            console.error('Logout error:', error);
          }
        }

        // Clear local state
        localStorage.removeItem('auth_token');
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          error: null
        });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user
      })
    }
  )
);

export default useAuthStore;