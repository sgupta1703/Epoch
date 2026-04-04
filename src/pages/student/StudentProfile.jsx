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

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 14.015 17.64 11.707 17.64 9.2z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A9.009 9.009 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="1" y="1" width="7.5" height="7.5" fill="#f25022"/>
      <rect x="9.5" y="1" width="7.5" height="7.5" fill="#7fba00"/>
      <rect x="1" y="9.5" width="7.5" height="7.5" fill="#00a4ef"/>
      <rect x="9.5" y="9.5" width="7.5" height="7.5" fill="#ffb900"/>
    </svg>
  );
}

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
                  <div className="sp-field">
                    <label htmlFor="sp-email">Email Address</label>
                    <input
                      id="sp-email"
                      type="email"
                      value={email}
                      onChange={isOAuth ? undefined : e => setEmail(e.target.value)}
                      readOnly={isOAuth}
                      disabled={isOAuth}
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

            {/* ── Security ── */}
            <section className="sp-card">
              <div className="sp-card-head">
                <span className="sp-card-kicker">Security</span>
                <h2 className="sp-card-title">{isOAuth ? 'Connected Account' : 'Change Password'}</h2>
                <p className="sp-card-desc">
                  {isOAuth
                    ? `Your identity is verified and secured by ${providerName}.`
                    : "Use a strong password with at least 6 characters. You'll need your current password to confirm."}
                </p>
              </div>

              {isOAuth ? (
                <>
                  <div className="sp-connected-account">
                    <div className="sp-connected-provider">
                      {provider === 'google' ? <GoogleIcon /> : <MicrosoftIcon />}
                      <div>
                        <p className="sp-connected-name">{providerName}</p>
                        <p className="sp-connected-email">{user?.email}</p>
                      </div>
                    </div>
                    <div className="sp-connected-badge">Connected</div>
                  </div>
                  <p className="sp-connected-note">
                    Sign-in is handled by {providerName}. Your session is protected by your {providerName} account's security settings, including two-factor authentication if you have it enabled.
                  </p>
                </>
              ) : (
                <>
                  {pwMsg && (
                    <div className={`sp-toast sp-toast--${pwMsg.type}`}>{pwMsg.text}</div>
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
                        <button type="button" className="sp-pw-toggle" onClick={() => setShowCurrentPw(v => !v)} aria-label={showCurrentPw ? 'Hide password' : 'Show password'}>
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
                        <button type="button" className="sp-pw-toggle" onClick={() => setShowNewPw(v => !v)} aria-label={showNewPw ? 'Hide password' : 'Show password'}>
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
