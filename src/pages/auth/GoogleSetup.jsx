import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/axiosInstance';
import './Auth.css';

export default function GoogleSetup() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/profile/setup', {
        display_name: displayName.trim(),
        role,
      });

      if (role === 'teacher') {
        localStorage.setItem('epoch_teacher_onboarding', 'needed');
      } else {
        localStorage.setItem('epoch_student_onboarding', 'needed');
      }

      setUser(data.user);
      navigate(role === 'teacher' ? '/teacher' : '/student', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <div className="auth-header">
          <span className="auth-brand-name">Epoch</span>
        </div>

        <div className="auth-body">
          <p className="auth-eyebrow">One last step</p>
          <h1 className="auth-title">Set up your profile</h1>
          <p className="auth-subtitle">
            Tell us your name and how you'll be using Epoch.
          </p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label>Your Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Jane Smith"
                required
                autoFocus
              />
            </div>

            <div className="auth-field">
              <label>I am a…</label>
              <div className="auth-role-toggle">
                {['student', 'teacher'].map(r => (
                  <button
                    key={r}
                    type="button"
                    className={`auth-role-btn ${role === r ? 'auth-role-btn--active' : ''}`}
                    onClick={() => setRole(r)}
                  >
                    {r === 'teacher' ? 'Educator' : 'Student'}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="auth-submit"
              type="submit"
              disabled={loading || !displayName.trim()}
            >
              {loading ? 'Setting up…' : 'Continue to Epoch'}
            </button>
          </form>
        </div>
      </div>

      <div className="auth-aside">
        <blockquote className="auth-quote quote-fade-in">
          <p className="auth-quote-text">"The secret of getting ahead is getting started."</p>
          <cite>— Mark Twain</cite>
        </blockquote>
      </div>
    </div>
  );
}
