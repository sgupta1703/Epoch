import { createContext, useState, useEffect, useCallback } from 'react';
import { getMe, logout as apiLogout } from '../api/auth';

/**
 * AuthContext shape:
 *   user          – profile object | null
 *   role          – 'teacher' | 'student' | null
 *   loading       – true while the initial session check is running
 *   isAuthenticated – boolean
 *   setUser       – (user) => void  — call after login/register
 *   logout        – () => void      — clears tokens + user state
 */
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true); // true until first auth check resolves

  // On mount: if a token exists in localStorage, verify it and rehydrate user
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then(({ user }) => setUserState(user))
      .catch(() => {
        // Token invalid or expired and refresh failed — axiosInstance already cleared storage
        setUserState(null);
      })
      .finally(() => setLoading(false));
  }, []);

  /**
   * Call this after a successful login or registration to hydrate the context.
   * Accepts the user profile object returned by the API.
   */
  const setUser = useCallback((user) => {
    setUserState(user);
  }, []);

  /**
   * Clear auth state and tokens.
   */
  const logout = useCallback(() => {
    apiLogout(); // removes tokens from localStorage
    setUserState(null);
  }, []);

  const value = {
    user,
    role: user?.role ?? null,
    loading,
    isAuthenticated: !!user,
    setUser,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}