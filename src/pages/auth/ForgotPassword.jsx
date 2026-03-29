import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../api/auth';
import './Auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword({ email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <div className="auth-brand">
          <Link to="/" className="auth-brand-name">Epoch</Link>
        </div>

        {sent ? (
          <div className="auth-sent-state">
            <div className="auth-sent-icon">&#9993;</div>
            <h1 className="auth-title">Check your email</h1>
            <p className="auth-subtitle">
              If an account exists for <strong>{email}</strong>, we've sent a password reset link.
              Check your inbox — it may take a minute.
            </p>
            <p className="auth-subtitle" style={{ marginTop: 0 }}>
              Didn't receive it? Check your spam folder or{' '}
              <button
                className="auth-inline-btn"
                onClick={() => setSent(false)}
              >
                try again
              </button>
              .
            </p>
            <Link to="/login" className="auth-submit" style={{ display: 'block', textAlign: 'center', marginTop: 24, textDecoration: 'none' }}>
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <h1 className="auth-title">Forgot password?</h1>
            <p className="auth-subtitle">
              Enter your email and we'll send you a link to reset your password.
            </p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                  required
                  autoFocus
                />
              </div>

              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <p className="auth-switch">
              Remember your password?{' '}
              <Link to="/login">Sign in</Link>
            </p>
          </>
        )}
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
