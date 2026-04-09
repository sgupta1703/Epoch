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
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  const aside = (
    <aside className="auth-aside" aria-label="Inspirational quote">
      <blockquote className="auth-quote quote-fade-in">
        <p className="auth-quote-text">"A fresh start is not a new chapter — it's a new book."</p>
        <cite>— Unknown</cite>
      </blockquote>
    </aside>
  );

  // ── Invalid token ──
  if (tokenError) {
    return (
      <div className="auth-page">
        <main className="auth-panel">
          <div className="auth-header">
            <Link to="/" className="auth-brand-name">Epoch</Link>
          </div>
          <div className="auth-body">
            <div className="auth-sent-icon">⚠</div>
            <p className="auth-eyebrow">Invalid link</p>
            <h1 className="auth-title">Reset link expired</h1>
            <p className="auth-subtitle">
              This password reset link is invalid or has already been used.
              Reset links expire after 1 hour.
            </p>
            <details style={{ marginBottom: 24 }}>
              <summary style={{ fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>Debug info</summary>
              <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--parchment)', borderRadius: 6, fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.8 }}>
                <div><strong>search:</strong> {window.location.search || '(empty)'}</div>
                <div><strong>hash:</strong> {window.location.hash || '(empty)'}</div>
                <div><strong>url:</strong> {window.location.href}</div>
              </div>
            </details>
            <Link to="/forgot-password" className="auth-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Request a new link
            </Link>
            <p className="auth-switch" style={{ marginTop: 16 }}>
              <Link to="/login">Back to Sign In</Link>
            </p>
          </div>
        </main>
        {aside}
      </div>
    );
  }

  // ── Success ──
  if (done) {
    return (
      <div className="auth-page">
        <main className="auth-panel">
          <div className="auth-header">
            <Link to="/" className="auth-brand-name">Epoch</Link>
          </div>
          <div className="auth-body">
            <div className="auth-sent-icon">✓</div>
            <p className="auth-eyebrow">All done</p>
            <h1 className="auth-title">Password updated</h1>
            <p className="auth-subtitle">
              Your password has been reset. Redirecting you to sign in…
            </p>
            <Link to="/login" className="auth-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Sign In Now
            </Link>
          </div>
        </main>
        {aside}
      </div>
    );
  }

  // ── Main form ──
  return (
    <div className="auth-page">
      <main className="auth-panel">
        <div className="auth-header">
          <Link to="/" className="auth-brand-name">Epoch</Link>
        </div>

        <div className="auth-body">
          <p className="auth-eyebrow">New password</p>
          <h1 className="auth-title">Set a new password</h1>
          <p className="auth-subtitle">
            Choose something strong that you haven't used before.
          </p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="reset-new-password">New Password</label>
              <div className="auth-pw-wrap">
                <input
                  id="reset-new-password"
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
                  aria-controls="reset-new-password"
                  aria-pressed={showPw}
                  aria-label={showPw ? 'Hide new password' : 'Show new password'}
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
              <label htmlFor="reset-confirm-password">Confirm New Password</label>
              <input
                id="reset-confirm-password"
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Re-enter your new password"
                required
              />
              {confirmPw && newPw && confirmPw !== newPw && (
                <p style={{ fontSize: 12, color: '#c0392b', margin: '6px 0 0' }}>
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
      </main>
      {aside}
    </div>
  );
}
