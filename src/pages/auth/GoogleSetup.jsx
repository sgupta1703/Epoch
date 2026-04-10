import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/axiosInstance';
import { isValidStudentNumber, normalizeStudentNumber } from '../../utils/studentNumber';
import './Auth.css';

export default function GoogleSetup() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  async function handleBack() {
    logout();
    navigate('/login', { replace: true });
  }
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [role, setRole] = useState('student');
  const [studentNumber, setStudentNumber] = useState(user?.student_number || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!displayName.trim()) return;
    if (role === 'student' && !isValidStudentNumber(studentNumber)) {
      setError('Student number must be exactly 7 digits.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/profile/setup', {
        display_name: displayName.trim(),
        role,
        student_number: role === 'student' ? normalizeStudentNumber(studentNumber) : undefined,
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
      <main className="auth-panel">
        <div className="auth-header">
          <span className="auth-brand-name">Epoch</span>
          <button
            type="button"
            onClick={handleBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
          >
            ← Back
          </button>
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
              <label htmlFor="setup-display-name">Your Name</label>
              <input
                id="setup-display-name"
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
              <div className="auth-role-toggle" role="group" aria-label="Choose your role">
                {['student', 'teacher'].map(r => (
                  <button
                    key={r}
                    type="button"
                    className={`auth-role-btn ${role === r ? 'auth-role-btn--active' : ''}`}
                    onClick={() => setRole(r)}
                    aria-pressed={role === r}
                  >
                    {r === 'teacher' ? 'Educator' : 'Student'}
                  </button>
                ))}
              </div>
            </div>

            {role === 'student' && (
              <div className="auth-field">
                <label htmlFor="setup-student-number">Student Number</label>
                <input
                  id="setup-student-number"
                  type="text"
                  value={studentNumber}
                  onChange={e => setStudentNumber(normalizeStudentNumber(e.target.value))}
                  placeholder="7-digit student number"
                  inputMode="numeric"
                  pattern="[0-9]{7}"
                  maxLength={7}
                  required
                />
                <p className="auth-field-note">Required for student accounts. Use your 7-digit school number.</p>
              </div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading || !displayName.trim() || (role === 'student' && !isValidStudentNumber(studentNumber))}
            >
              {loading ? 'Setting up…' : 'Continue to Epoch'}
            </button>
          </form>
        </div>
      </main>

      <aside className="auth-aside" aria-label="Inspirational quote">
        <blockquote className="auth-quote quote-fade-in">
          <p className="auth-quote-text">"The secret of getting ahead is getting started."</p>
          <cite>— Mark Twain</cite>
        </blockquote>
      </aside>
    </div>
  );
}
