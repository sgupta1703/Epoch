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
    // Check for an error Supabase embedded in the URL before doing anything else
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get('error_description') || params.get('error');
    if (urlError) {
      setError(decodeURIComponent(urlError.replace(/\+/g, ' ')));
      return;
    }

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

    // INITIAL_SESSION fires immediately with the existing session (if any).
    // SIGNED_IN fires once the PKCE code exchange completes.
    // We handle both so it works regardless of timing.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session) {
        subscription.unsubscribe();
        processSession(session);
      }
    });

    // Safety timeout — show an error if nothing resolves in 15 seconds
    const timeout = setTimeout(() => {
      if (!handled.current) {
        setError('Sign-in timed out. Please try again.');
      }
    }, 15000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
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
