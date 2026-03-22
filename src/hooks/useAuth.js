import { useContext } from 'react';
import { AuthContext } from '../context/Authcontext';

/**
 * useAuth — consume the global auth context anywhere in the tree.
 *
 * Returns:
 *   user            – profile object | null
 *   role            – 'teacher' | 'student' | null
 *   loading         – true while initial session check is in flight
 *   isAuthenticated – boolean
 *   isTeacher       – boolean convenience flag
 *   isStudent       – boolean convenience flag
 *   setUser         – (user) => void
 *   logout          – () => void
 *
 * Usage:
 *   const { user, role, logout } = useAuth();
 */
export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }

  return {
    ...ctx,
    isTeacher: ctx.role === 'teacher',
    isStudent: ctx.role === 'student',
  };
}