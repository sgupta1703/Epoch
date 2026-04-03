import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import api from '../../api/axiosInstance';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AuthCallback({ onLogin }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const handled = useRef(false);

  useEffect(() => {
    async function processSession(session) {
      if (handled.current) return;
      handled.current = true;

      localStorage.setItem('access_token', session.access_token);
      localStorage.setItem('refresh_token', session.refresh_token);

      try {
        const { data } = await api.get('/api/auth/me');
        const user = data.user;

        if (!user.role) {
          onLogin(user);
          navigate('/setup', { replace: true });
          return;
        }

        onLogin(user);
        navigate(user.role === 'teacher' ? '/teacher' : '/student', { replace: true });
      } catch {
        // Profile doesn't exist yet — pass partial user to setup
        const partialUser = {
          id: session.user.id,
          email: session.user.email,
          display_name:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            '',
          role: null,
        };
        onLogin(partialUser);
        navigate('/setup', { replace: true });
      }
    }

    // Listen for the SIGNED_IN event that fires once the code exchange completes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe();
        processSession(session);
      }
    });

    // Also check immediately in case the session was already resolved
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        processSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ color: 'var(--rust)', marginBottom: 16, fontSize: 15 }}>{error}</p>
          <a href="/login" style={{ color: 'var(--rust)', fontSize: 14 }}>Back to Sign In</a>
        </div>
      </div>
    );
  }

  return <LoadingSpinner fullPage label="Signing you in…" />;
}
