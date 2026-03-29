import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resetPassword } from '../../api/auth';
import './Auth.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [tokenError, setTokenError] = useState(false);

  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Email template link: {{ .RedirectTo }}?token={{ .Token }}&type=recovery
  // SafeLinks pre-fetches our React app harmlessly; token only consumed on submit
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tok  = params.get('token');
    const type = params.get('type');

    if (!tok || type !== 'recovery') {
      setTokenError(true);
    } else {
      setToken(tok);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  function pwStrength(pw) {
    if (pw.length === 0) return null;
    if (pw.length < 6) return 'weak';
    if (pw.length < 10) return 'ok';
    return 'strong';
  }

  const strength = pwStrength(newPw);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPw.length < 6) return setError('Password must be at least 6 characters.');
    if (newPw !== confirmPw) return setError('Passwords do not match.');

    setLoading(true);
    try {
      await resetPassword({ token, new_password: newPw });
      setDone(true);
      // Redirect to login after a short delay
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  // ── Invalid / missing token ──
  if (tokenError) {
    return (
      <div className="auth-page">
        <div className="auth-panel">
          <div className="auth-brand">
            <Link to="/" className="auth-brand-name">Epoch</Link>
          </div>
          <div className="auth-sent-icon" style={{ fontSize: 40, marginBottom: 16 }}>&#9888;</div>
          <h1 className="auth-title">Invalid reset link</h1>
          <p className="auth-subtitle">
            This password reset link is invalid or has already been used.
            Reset links expire after 1 hour.
          </p>
          <details open style={{ marginTop: 16, marginBottom: 8 }}>
            <summary style={{ fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>Debug info (share this)</summary>
            <div style={{ marginTop: 8, padding: '10px 12px', background: '#f5f0e8', borderRadius: 6, fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.8 }}>
              <div><strong>search:</strong> {window.location.search || '(empty)'}</div>
              <div><strong>hash:</strong> {window.location.hash || '(empty)'}</div>
              <div><strong>full url:</strong> {window.location.href}</div>
            </div>
          </details>
          <Link to="/forgot-password" className="auth-submit" style={{ display: 'block', textAlign: 'center', marginTop: 12, textDecoration: 'none' }}>
            Request a new link
          </Link>
          <p className="auth-switch" style={{ marginTop: 16 }}>
            <Link to="/login">Back to Sign In</Link>
          </p>
        </div>
        <div className="auth-aside">
          <blockquote className="auth-quote quote-fade-in">
            "Every setback is a setup for a comeback."
            <cite>— Unknown</cite>
          </blockquote>
        </div>
      </div>
    );
  }

  // ── Success state ──
  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-panel">
          <div className="auth-brand">
            <Link to="/" className="auth-brand-name">Epoch</Link>
          </div>
          <div className="auth-sent-icon">&#10003;</div>
          <h1 className="auth-title">Password reset!</h1>
          <p className="auth-subtitle">
            Your password has been updated. Redirecting you to sign in…
          </p>
          <Link to="/login" className="auth-submit" style={{ display: 'block', textAlign: 'center', marginTop: 24, textDecoration: 'none' }}>
            Sign In Now
          </Link>
        </div>
        <div className="auth-aside">
          <blockquote className="auth-quote quote-fade-in">
            "A fresh start is not a new chapter — it's a new book."
            <cite>— Unknown</cite>
          </blockquote>
        </div>
      </div>
    );
  }

  // ── Main form ──
  return (
    <div className="auth-page">
      <div className="auth-panel">
        <div className="auth-brand">
          <Link to="/" className="auth-brand-name">Epoch</Link>
        </div>

        <h1 className="auth-title">Set new password</h1>
        <p className="auth-subtitle">
          Choose a strong password you haven't used before.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>New Password</label>
            <div className="auth-pw-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="At least 6 characters"
                required
                autoFocus
              />
              <button
                type="button"
                className="auth-pw-toggle"
                onClick={() => setShowPw(v => !v)}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
            {strength && (
              <div className="auth-pw-strength">
                <div className={`auth-pw-bar auth-pw-bar--${strength}`} />
                <span className="auth-pw-strength-label">
                  {strength === 'weak' ? 'Too short' : strength === 'ok' ? 'Acceptable' : 'Strong'}
                </span>
              </div>
            )}
          </div>

          <div className="auth-field">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="Re-enter new password"
              required
            />
            {confirmPw && newPw && confirmPw !== newPw && (
              <p style={{ fontSize: 12, color: '#c0392b', margin: '4px 0 0' }}>
                Passwords do not match
              </p>
            )}
          </div>

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Resetting…' : 'Reset Password'}
          </button>
        </form>

        <p className="auth-switch">
          <Link to="/login">Back to Sign In</Link>
        </p>
      </div>

      <div className="auth-aside">
        <blockquote className="auth-quote quote-fade-in">
          "The secret of getting ahead is getting started."
          <cite>— Mark Twain</cite>
        </blockquote>
      </div>
    </div>
  );
}
