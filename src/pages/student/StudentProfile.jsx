import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getClassrooms } from '../../api/classrooms';
import {
  getProfileStats,
  getEnrolledClasses,
  updateProfile,
  changePassword,
  leaveClassroom,
} from '../../api/profile';
import '../../styles/pages.css';
import './StudentProfile.css';

function StatCard({ label, value, icon }) {
  return (
    <div className="sp-stat">
      <span className="sp-stat-icon">{icon}</span>
      <div>
        <p className="sp-stat-value">{value ?? '—'}</p>
        <p className="sp-stat-label">{label}</p>
      </div>
    </div>
  );
}

export default function StudentProfile({ user }) {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState(null);
  const [enrolledClasses, setEnrolledClasses] = useState([]);

  // Personal info form
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);

  // Password form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Leave class
  const [leavingId, setLeavingId] = useState(null);
  const [confirmLeaveId, setConfirmLeaveId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getClassrooms(), getProfileStats(), getEnrolledClasses()])
      .then(([cr, st, cl]) => {
        if (cancelled) return;
        setClassrooms(cr.classrooms || []);
        setStats(st);
        setEnrolledClasses(cl.classes || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Save personal info ──
  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileMsg(null);
    const trimName = displayName.trim();
    const trimEmail = email.trim().toLowerCase();

    if (!trimName) return setProfileMsg({ type: 'error', text: 'Name cannot be empty.' });
    if (!trimEmail || !trimEmail.includes('@')) return setProfileMsg({ type: 'error', text: 'Enter a valid email address.' });
    if (trimName === user.display_name && trimEmail === user.email) return setProfileMsg({ type: 'info', text: 'No changes to save.' });

    setProfileSaving(true);
    try {
      const updates = {};
      if (trimName !== user.display_name) updates.display_name = trimName;
      if (trimEmail !== user.email) updates.email = trimEmail;
      const { user: updated } = await updateProfile(updates);
      setUser(updated);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update profile.' });
    } finally {
      setProfileSaving(false);
    }
  }

  // ── Change password ──
  async function handleChangePassword(e) {
    e.preventDefault();
    setPwMsg(null);

    if (!currentPw) return setPwMsg({ type: 'error', text: 'Enter your current password.' });
    if (newPw.length < 6) return setPwMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
    if (newPw !== confirmPw) return setPwMsg({ type: 'error', text: 'New passwords do not match.' });
    if (currentPw === newPw) return setPwMsg({ type: 'error', text: 'New password must be different from your current password.' });

    setPwSaving(true);
    try {
      await changePassword({ current_password: currentPw, new_password: newPw });
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password.' });
    } finally {
      setPwSaving(false);
    }
  }

  // ── Leave classroom ──
  async function handleLeave(classroomId) {
    setLeavingId(classroomId);
    try {
      await leaveClassroom(classroomId);
      setEnrolledClasses(prev => prev.filter(c => c.id !== classroomId));
      setConfirmLeaveId(null);
    } catch {
      // silent
    } finally {
      setLeavingId(null);
    }
  }

  const provider = user?.app_metadata?.provider;
  const isOAuth = provider === 'google' || provider === 'azure';
  const providerName = provider === 'google' ? 'Google' : provider === 'azure' ? 'Microsoft' : null;

  const memberDate = stats?.member_since
    ? new Date(stats.member_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—';

  const totalSubmissions = (stats?.assignments_submitted || 0) + (stats?.quizzes_submitted || 0);

  if (loading) {
    return (
      <>
        <Navbar user={user} />
        <div className="app-shell">
          <Sidebar classrooms={classrooms} role="student" />
          <main className="page-main"><LoadingSpinner label="Loading profile..." /></main>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar user={user} />
      <div className="app-shell">
        <Sidebar classrooms={classrooms} role="student" />
        <main className="page-main sp-main">

          {/* ── Header ── */}
          <div className="sp-header">
            <div className="sp-avatar-lg">
              {user?.display_name?.[0]?.toUpperCase()}
            </div>
            <div className="sp-header-info">
              <p className="page-eyebrow">Your Profile</p>
              <h1 className="page-title">{user?.display_name}</h1>
              <p className="sp-header-meta">
                <span className="sp-role-badge">Student</span>
                <span className="sp-meta-sep">&middot;</span>
                <span>{user?.email}</span>
                <span className="sp-meta-sep">&middot;</span>
                <span>Joined {memberDate}</span>
              </p>
            </div>
          </div>

          {/* ── Stats row ── */}
          <div className="sp-stats-row">
            <StatCard icon="&#128218;" label="Classes Enrolled" value={stats?.classes_enrolled || 0} />
            <StatCard icon="&#9998;" label="Submissions" value={totalSubmissions} />
            <StatCard icon="&#127942;" label="Average Score" value={stats?.avg_score != null ? `${stats.avg_score}%` : '—'} />
            <StatCard icon="&#128197;" label="Member Since" value={memberDate} />
          </div>

          <div className="sp-grid">

            {/* ── Personal Information ── */}
            <section className="sp-card">
              <div className="sp-card-head">
                <span className="sp-card-kicker">Account</span>
                <h2 className="sp-card-title">Personal Information</h2>
                <p className="sp-card-desc">Update your name or email address. Changes will appear across the platform.</p>
              </div>

              {profileMsg && (
                <div className={`sp-toast sp-toast--${profileMsg.type}`}>
                  {profileMsg.text}
                </div>
              )}

              {isOAuth && (
                <div className="sp-oauth-notice">
                  Signed in with {providerName}. Your email is managed by {providerName} and cannot be changed here.
                </div>
              )}
              <form onSubmit={handleSaveProfile} className="sp-form">
                <div className="sp-field">
                  <label htmlFor="sp-name">Display Name</label>
                  <input
                    id="sp-name"
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                {!isOAuth && (
                  <div className="sp-field">
                    <label htmlFor="sp-email">Email Address</label>
                    <input
                      id="sp-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>
                )}
                <div className="sp-form-actions">
                  <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                    {profileSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </section>

            {/* ── Change Password ── */}
            <section className="sp-card">
              <div className="sp-card-head">
                <span className="sp-card-kicker">Security</span>
                <h2 className="sp-card-title">Change Password</h2>
                {!isOAuth && <p className="sp-card-desc">Use a strong password with at least 6 characters. You'll need your current password to confirm.</p>}
              </div>

              {isOAuth ? (
                <div className="sp-oauth-notice">
                  Your password is managed by {providerName}. To change it, visit your {providerName} account settings.
                </div>
              ) : (
                <>
                  {pwMsg && (
                    <div className={`sp-toast sp-toast--${pwMsg.type}`}>
                      {pwMsg.text}
                    </div>
                  )}
                  <form onSubmit={handleChangePassword} className="sp-form">
                    <div className="sp-field">
                      <label htmlFor="sp-cur-pw">Current Password</label>
                      <div className="sp-pw-wrap">
                        <input
                          id="sp-cur-pw"
                          type={showCurrentPw ? 'text' : 'password'}
                          value={currentPw}
                          onChange={e => setCurrentPw(e.target.value)}
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          className="sp-pw-toggle"
                          onClick={() => setShowCurrentPw(v => !v)}
                          aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
                        >
                          {showCurrentPw ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                    <div className="sp-field">
                      <label htmlFor="sp-new-pw">New Password</label>
                      <div className="sp-pw-wrap">
                        <input
                          id="sp-new-pw"
                          type={showNewPw ? 'text' : 'password'}
                          value={newPw}
                          onChange={e => setNewPw(e.target.value)}
                          placeholder="At least 6 characters"
                        />
                        <button
                          type="button"
                          className="sp-pw-toggle"
                          onClick={() => setShowNewPw(v => !v)}
                          aria-label={showNewPw ? 'Hide password' : 'Show password'}
                        >
                          {showNewPw ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      {newPw.length > 0 && (
                        <div className="sp-pw-strength">
                          <div className={`sp-pw-bar ${newPw.length >= 10 ? 'sp-pw-bar--strong' : newPw.length >= 6 ? 'sp-pw-bar--ok' : 'sp-pw-bar--weak'}`} />
                          <span className="sp-pw-strength-label">
                            {newPw.length < 6 ? 'Too short' : newPw.length < 10 ? 'Acceptable' : 'Strong'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="sp-field">
                      <label htmlFor="sp-confirm-pw">Confirm New Password</label>
                      <input
                        id="sp-confirm-pw"
                        type="password"
                        value={confirmPw}
                        onChange={e => setConfirmPw(e.target.value)}
                        placeholder="Re-enter new password"
                      />
                      {confirmPw && newPw && confirmPw !== newPw && (
                        <p className="sp-field-error">Passwords do not match</p>
                      )}
                    </div>
                    <div className="sp-form-actions">
                      <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                        {pwSaving ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </section>
          </div>

          {/* ── Enrolled Classes ── */}
          <section className="sp-card sp-card--full">
            <div className="sp-card-head">
              <span className="sp-card-kicker">Classes</span>
              <h2 className="sp-card-title">Enrolled Classes</h2>
              <p className="sp-card-desc">View and manage your class enrollments. Leaving a class does not delete your submitted work.</p>
            </div>

            {enrolledClasses.length === 0 ? (
              <div className="sp-empty">
                <p className="sp-empty-icon">&#128218;</p>
                <p>You haven't joined any classes yet.</p>
                <button className="btn btn-primary" onClick={() => navigate('/student')}>
                  Go to Dashboard
                </button>
              </div>
            ) : (
              <div className="sp-class-list">
                {enrolledClasses.map(c => (
                  <div key={c.id} className="sp-class-row">
                    <div className="sp-class-avatar">
                      {c.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="sp-class-info">
                      <p className="sp-class-name">{c.name}</p>
                      <p className="sp-class-joined">
                        Joined {new Date(c.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="sp-class-actions">
                      <button
                        className="btn btn-ghost"
                        onClick={() => navigate(`/student/classroom/${c.id}`)}
                      >
                        View
                      </button>
                      {confirmLeaveId === c.id ? (
                        <div className="sp-leave-confirm">
                          <span className="sp-leave-warn">Leave this class?</span>
                          <button
                            className="btn btn-danger"
                            disabled={leavingId === c.id}
                            onClick={() => handleLeave(c.id)}
                          >
                            {leavingId === c.id ? 'Leaving...' : 'Confirm'}
                          </button>
                          <button
                            className="btn btn-ghost"
                            onClick={() => setConfirmLeaveId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="sp-leave-btn"
                          onClick={() => setConfirmLeaveId(c.id)}
                        >
                          Leave
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </main>
      </div>
    </>
  );
}
