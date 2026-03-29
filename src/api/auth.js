import api from './axiosInstance';

/**
 * Register a new user.
 * @param {{ email: string, password: string, display_name: string, role: 'teacher'|'student' }} data
 * @returns {{ message: string, user_id: string }}
 */
export async function register({ email, password, display_name, role }) {
  const res = await api.post('/api/auth/register', { email, password, display_name, role });
  return res.data;
}

/**
 * Log in and store tokens.
 * @param {{ email: string, password: string }} credentials
 * @returns {{ user: object, access_token: string, refresh_token: string }}
 */
export async function login({ email, password }) {
  const res = await api.post('/api/auth/login', { email, password });
  const { access_token, refresh_token, user } = res.data;

  localStorage.setItem('access_token', access_token);
  localStorage.setItem('refresh_token', refresh_token);

  return { user, access_token, refresh_token };
}

/**
 * Clear tokens from storage (client-side logout).
 */
export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

/**
 * Fetch the currently authenticated user's profile.
 * @returns {{ user: object }}
 */
export async function getMe() {
  const res = await api.get('/api/auth/me');
  return res.data;
}

/**
 * Send a password reset email.
 * @param {{ email: string }} data
 */
export async function forgotPassword({ email }) {
  const redirectTo = `${window.location.origin}/reset-password`;
  const res = await api.post('/api/auth/forgot-password', { email, redirectTo });
  return res.data;
}

/**
 * Reset password using the raw OTP token from the email link.
 * @param {{ token: string, new_password: string }} data
 */
export async function resetPassword({ token, new_password }) {
  const res = await api.post('/api/auth/reset-password', { token, new_password });
  return res.data;
}