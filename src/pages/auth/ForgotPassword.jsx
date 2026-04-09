import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../api/auth';
import './Auth.css';

const quotes = [
  { text: "Those who cannot remember the past are condemned to repeat it.", source: "George Santayana" },
  { text: "History is written by the victors.", source: "Winston Churchill" },
  { text: "The more you know about the past, the better prepared you are for the future.", source: "Theodore Roosevelt" },
  { text: "Study the past if you would define the future.", source: "Confucius" },
  { text: "History is a set of lies agreed upon.", source: "Napoleon Bonaparte" },
];

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteVisible(false);
      setTimeout(() => {
        setQuoteIndex((i) => (i + 1) % quotes.length);
        setQuoteVisible(true);
      }, 450);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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
      <main className="auth-panel">

        <div className="auth-header">
          <Link to="/" className="auth-brand-name">Epoch</Link>
        </div>

        <div className="auth-body">
          {sent ? (
            <div className="auth-sent-state">
              <div className="auth-sent-icon">✉</div>
              <p className="auth-eyebrow">Email sent</p>
              <h1 className="auth-title">Check your inbox</h1>
              <p className="auth-subtitle">
                If an account exists for <strong>{email}</strong>, we've sent a reset link.
                It may take a minute — check your spam folder too.
              </p>
              <p className="auth-subtitle" style={{ marginBottom: 32 }}>
                Didn't get it?{' '}
                <button className="auth-inline-btn" type="button" onClick={() => setSent(false)}>
                  Try again
                </button>
              </p>
              <Link to="/login" className="auth-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <p className="auth-eyebrow">Account recovery</p>
              <h1 className="auth-title">Forgot your password?</h1>
              <p className="auth-subtitle">
                Enter your email and we'll send you a link to reset it.
              </p>

              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="forgot-email">Email Address</label>
                  <input
                    id="forgot-email"
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
                Remember it?{' '}
                <Link to="/login">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </main>

      <aside className="auth-aside" aria-label="Historical quote">
        <blockquote className={`auth-quote ${quoteVisible ? 'quote-fade-in' : 'quote-fade-out'}`}>
          <p className="auth-quote-text">"{quotes[quoteIndex].text}"</p>
          <cite>— {quotes[quoteIndex].source}</cite>
        </blockquote>
      </aside>
    </div>
  );
}
