import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, login, loginWithGoogle } from '../../api/auth';
import './Auth.css';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 14.015 17.64 11.707 17.64 9.2z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A9.009 9.009 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

const quotes = [
  { text: "Those who cannot remember the past are condemned to repeat it.", source: "George Santayana" },
  { text: "History is written by the victors.", source: "Winston Churchill" },
  { text: "The more you know about the past, the better prepared you are for the future.", source: "Theodore Roosevelt" },
  { text: "Study the past if you would define the future.", source: "Confucius" },
  { text: "History is a set of lies agreed upon.", source: "Napoleon Bonaparte" },
];

export default function Register({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    display_name: '',
    email: '',
    password: '',
    role: 'student',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      const { user } = await login({ email: form.email, password: form.password });
      if (user.role === 'teacher') {
        localStorage.setItem('epoch_teacher_onboarding', 'needed');
      } else if (user.role === 'student') {
        localStorage.setItem('epoch_student_onboarding', 'needed');
      }
      onLogin(user);
      navigate(user.role === 'teacher' ? '/teacher' : '/student');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-panel">

        <div className="auth-header">
          <Link to="/" className="auth-brand-name">Epoch</Link>
        </div>

        <div className="auth-body">
          <p className="auth-eyebrow">Get started</p>
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Join Epoch and bring history to life.</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label>Full Name</label>
              <input
                type="text"
                name="display_name"
                value={form.display_name}
                onChange={handleChange}
                placeholder="Jane Smith"
                required
                autoFocus
              />
            </div>

            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@school.edu"
                required
              />
            </div>

            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 6 characters"
                required
              />
            </div>

            <div className="auth-field">
              <label>I am a…</label>
              <div className="auth-role-toggle">
                {['student', 'teacher'].map(r => (
                  <button
                    key={r}
                    type="button"
                    className={`auth-role-btn ${form.role === r ? 'auth-role-btn--active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, role: r }))}
                  >
                    {r === 'teacher' ? 'Educator' : 'Student'}
                  </button>
                ))}
              </div>
            </div>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <button className="auth-google-btn" type="button" onClick={loginWithGoogle}>
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="auth-switch">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>

      <div className="auth-aside">
        <blockquote className={`auth-quote ${quoteVisible ? 'quote-fade-in' : 'quote-fade-out'}`}>
          <p className="auth-quote-text">"{quotes[quoteIndex].text}"</p>
          <cite>— {quotes[quoteIndex].source}</cite>
        </blockquote>
      </div>
    </div>
  );
}
