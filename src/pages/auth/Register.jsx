import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, login } from '../../api/auth';
import './Auth.css';

const quotes = [
  { text: "Those who cannot remember the past are condemned to repeat it.", source: "— George Santayana" },
  { text: "History is written by the victors.", source: "— Winston Churchill" },
  { text: "The more you know about the past, the better prepared you are for the future.", source: "— Theodore Roosevelt" },
  { text: "Study the past if you would define the future.", source: "— Confucius" },
  { text: "History is a set of lies agreed upon.", source: "— Napoleon Bonaparte" },
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
    }, 2300);
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
      // Auto-login after registration
      const { user } = await login({ email: form.email, password: form.password });
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
        <div className="auth-brand">
          <Link to="/" className="auth-brand-name">Epoch</Link>
        </div>

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

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>

      <div className="auth-aside">
        <blockquote className={`auth-quote ${quoteVisible ? 'quote-fade-in' : 'quote-fade-out'}`}>
          "{quotes[quoteIndex].text}"
          <cite>{quotes[quoteIndex].source}</cite>
        </blockquote>
      </div>
    </div>
  );
}