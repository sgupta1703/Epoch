import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getClassrooms, createClassroom } from '../../api/classrooms';
import {
  updateProfile,
  changePassword,
  getTeacherStats,
  getTeacherClasses,
  deleteTeacherClass,
  renameTeacherClass,
} from '../../api/profile';
import '../../styles/pages.css';
import './TeacherProfile.css';

const ACCENT_COLORS = [
  { bg: 'linear-gradient(135deg,#b5451b,#d4845a)', light: '#fef0eb' },
  { bg: 'linear-gradient(135deg,#1e4d8c,#4a7fc4)', light: '#eaf1fb' },
  { bg: 'linear-gradient(135deg,#166534,#4ead72)', light: '#eafaf1' },
  { bg: 'linear-gradient(135deg,#6b21a8,#a855f7)', light: '#f5eeff' },
  { bg: 'linear-gradient(135deg,#9a3412,#f97316)', light: '#fff3eb' },
];

function scoreColor(score) {
  if (score === null || score === undefined) return 'var(--muted)';
  if (score >= 80) return '#1e7a3a';
  if (score >= 60) return '#b8860b';
  return '#c0392b';
}

function scoreBg(score) {
  if (score === null || score === undefined) return 'transparent';
  if (score >= 80) return '#eaf6ea';
  if (score >= 60) return '#fdf8ec';
  return '#fdecea';
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div className={`tp-stat tp-stat--${accent}`}>
      <span className="tp-stat-icon">{icon}</span>
      <div>
        <p className="tp-stat-value">{value ?? '—'}</p>
        <p className="tp-stat-label">{label}</p>
      </div>
    </div>
  );
}

function formatMonthYear(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function TeacherProfile({ user }) {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [classes, setClasses] = useState([]);
  const [activeTab, setActiveTab] = useState('info');

  // Personal info
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);

  // Password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Classes management
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const editInputRef = useRef(null);

  // New class
  const [showNewClass, setShowNewClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassSaving, setNewClassSaving] = useState(false);
  const [newClassMsg, setNewClassMsg] = useState(null);
  const [classQuery, setClassQuery] = useState('');
  const [classSort, setClassSort] = useState('recent');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getClassrooms(), getTeacherStats(), getTeacherClasses()])
      .then(([cr, st, cl]) => {
        if (cancelled) return;
        setClassrooms(cr.classrooms || []);
        setStats(st);
        setClasses(cl.classes || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus();
  }, [editingId]);

  async function refreshTeacherData() {
    const [cr, st, cl] = await Promise.all([getClassrooms(), getTeacherStats(), getTeacherClasses()]);
    setClassrooms(cr.classrooms || []);
    setStats(st);
    setClasses(cl.classes || []);
  }

  // ── Save profile ──
  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileMsg(null);
    const trimName = displayName.trim();
    const trimEmail = email.trim().toLowerCase();
    if (!trimName) return setProfileMsg({ type: 'error', text: 'Name cannot be empty.' });
    if (!trimEmail.includes('@')) return setProfileMsg({ type: 'error', text: 'Enter a valid email.' });
    if (trimName === user.display_name && trimEmail === user.email)
      return setProfileMsg({ type: 'info', text: 'No changes to save.' });

    setProfileSaving(true);
    try {
      const updates = {};
      if (trimName !== user.display_name) updates.display_name = trimName;
      if (trimEmail !== user.email) updates.email = trimEmail;
      const { user: updated } = await updateProfile(updates);
      setUser(updated);
      setProfileMsg({ type: 'success', text: 'Profile updated.' });
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
    if (newPw !== confirmPw) return setPwMsg({ type: 'error', text: 'Passwords do not match.' });
    if (currentPw === newPw) return setPwMsg({ type: 'error', text: 'New password must differ from current.' });

    setPwSaving(true);
    try {
      await changePassword({ current_password: currentPw, new_password: newPw });
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password.' });
    } finally {
      setPwSaving(false);
    }
  }

  // ── Copy join code ──
  function handleCopy(classroomId, code) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(classroomId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  // ── Delete class ──
  async function handleDelete(classroomId) {
    setDeletingId(classroomId);
    try {
      await deleteTeacherClass(classroomId);
      await refreshTeacherData();
      setConfirmDeleteId(null);
    } catch { /* silent */ }
    finally { setDeletingId(null); }
  }

  // ── Rename class ──
  function startEdit(c) {
    setEditingId(c.id);
    setEditName(c.name);
  }

  async function handleRename(classroomId) {
    const nextName = editName.trim();
    if (!nextName || nextName === classes.find(c => c.id === classroomId)?.name) {
      return setEditingId(null);
    }
    setRenameSaving(true);
    try {
      await renameTeacherClass(classroomId, nextName);
      setClasses(prev => prev.map(c => c.id === classroomId ? { ...c, name: nextName } : c));
      setClassrooms(prev => prev.map(c => c.id === classroomId ? { ...c, name: nextName } : c));
      setEditingId(null);
    } catch { /* silent */ }
    finally { setRenameSaving(false); }
  }

  // ── Create class ──
  async function handleCreateClass(e) {
    e.preventDefault();
    setNewClassMsg(null);
    if (!newClassName.trim()) return setNewClassMsg({ type: 'error', text: 'Class name is required.' });

    setNewClassSaving(true);
    try {
      await createClassroom({ name: newClassName.trim() });
      await refreshTeacherData();
      setNewClassName('');
      setShowNewClass(false);
      setActiveTab('classes');
    } catch (err) {
      setNewClassMsg({ type: 'error', text: err.response?.data?.error || 'Failed to create class.' });
    } finally {
      setNewClassSaving(false);
    }
  }

  function pwStrength(pw) {
    if (!pw.length) return null;
    if (pw.length < 6) return 'weak';
    if (pw.length < 10) return 'ok';
    return 'strong';
  }

  const provider = user?.app_metadata?.provider;
  const isOAuth = provider === 'google' || provider === 'azure';
  const providerName = provider === 'google' ? 'Google' : provider === 'azure' ? 'Microsoft' : null;

  const memberDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—';

  const activeClassesCount = classes.filter(c => (c.student_count || 0) > 0).length;
  const unpublishedClassesCount = classes.filter(c => (c.unit_count || 0) > 0 && (c.published_unit_count || 0) === 0).length;
  const avgStudentsPerClass = classes.length
    ? Math.round(classes.reduce((sum, c) => sum + (c.student_count || 0), 0) / classes.length)
    : 0;
  const publishRate = (stats?.total_units || 0) > 0
    ? Math.round(((stats?.total_published_units || 0) / stats.total_units) * 100)
    : 0;
  const filteredClasses = [...classes]
    .filter(c => {
      const query = classQuery.trim().toLowerCase();
      if (!query) return true;
      return (
        c.name?.toLowerCase().includes(query) ||
        c.join_code?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (classSort === 'name') return a.name.localeCompare(b.name);
      if (classSort === 'students') return (b.student_count || 0) - (a.student_count || 0) || a.name.localeCompare(b.name);
      if (classSort === 'progress') {
        const aProgress = a.unit_count ? a.published_unit_count / a.unit_count : -1;
        const bProgress = b.unit_count ? b.published_unit_count / b.unit_count : -1;
        return bProgress - aProgress || (b.published_unit_count || 0) - (a.published_unit_count || 0);
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });
  const spotlightClass = classes.reduce((best, current) => {
    if (!best) return current;
    if ((current.student_count || 0) !== (best.student_count || 0)) {
      return (current.student_count || 0) > (best.student_count || 0) ? current : best;
    }
    if ((current.published_unit_count || 0) !== (best.published_unit_count || 0)) {
      return (current.published_unit_count || 0) > (best.published_unit_count || 0) ? current : best;
    }
    return new Date(current.created_at) > new Date(best.created_at) ? current : best;
  }, null);

  if (loading) {
    return (
      <>
        <Navbar user={user} />
        <div className="app-shell">
          <Sidebar classrooms={classrooms} role="teacher" />
          <main className="page-main"><LoadingSpinner label="Loading profile…" /></main>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar user={user} />
      <div className="app-shell">
        <Sidebar classrooms={classrooms} role="teacher" />
        <main className="page-main tp-main">
          <p
            className="page-eyebrow"
            style={{ marginBottom: 8, cursor: 'pointer' }}
            onClick={() => navigate('/teacher')}
          >
            &larr; Back to Dashboard
          </p>

          {/* ── Hero header ── */}
          <div className="tp-hero">
            <div className="tp-hero-avatar">{user?.display_name?.[0]?.toUpperCase()}</div>
            <div className="tp-hero-info">
              <p className="page-eyebrow">Your Profile</p>
              <h1 className="page-title">{user?.display_name}</h1>
              <div className="tp-hero-meta">
                <span className="tp-role-badge">Teacher</span>
                <span className="tp-meta-sep">&middot;</span>
                <span>{user?.email}</span>
                <span className="tp-meta-sep">&middot;</span>
                <span>Member since {memberDate}</span>
              </div>
            </div>
          </div>

          {/* ── Stats row ── */}
          <div className="tp-stats-row">
            <StatCard icon="🏛" label="Classes" value={stats?.total_classes ?? 0} accent="warm" />
            <StatCard icon="👥" label="Students Taught" value={stats?.total_students ?? 0} accent="cool" />
            <StatCard icon="📚" label="Units Created" value={stats?.total_units ?? 0} accent="default" />
            <StatCard icon="✅" label="Published Units" value={stats?.total_published_units ?? 0} accent="success" />
            <StatCard icon="📝" label="Submissions Received" value={stats?.graded_submissions ?? 0} accent="gold" />
          </div>

          {/* ── Tab navigation ── */}
          <div className="tp-tabs">
            {[
              { key: 'info',     label: 'Personal Info' },
              { key: 'password', label: 'Password' },
              { key: 'classes',  label: `Classes (${classes.length})` },
            ].map(t => (
              <button
                key={t.key}
                className={`tp-tab${activeTab === t.key ? ' tp-tab--active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ══ TAB: Personal Info ══ */}
          {activeTab === 'info' && (
            <div className="tp-section">
              <div className="tp-section-grid">

                <div className="tp-card">
                  <div className="tp-card-head">
                    <span className="tp-card-kicker">Account</span>
                    <h2 className="tp-card-title">Personal Information</h2>
                    <p className="tp-card-desc">Update your name or email. Changes appear across the platform.</p>
                  </div>
                  {isOAuth && (
                    <div className="tp-oauth-notice">
                      Signed in with {providerName}. Your email is managed by {providerName} and cannot be changed here.
                    </div>
                  )}
                  {profileMsg && <div className={`tp-toast tp-toast--${profileMsg.type}`}>{profileMsg.text}</div>}
                  <form onSubmit={handleSaveProfile} className="tp-form">
                    <div className="tp-field">
                      <label>Display Name</label>
                      <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
                    </div>
                    {!isOAuth && (
                      <div className="tp-field">
                        <label>Email Address</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@school.edu" />
                      </div>
                    )}
                    <div className="tp-form-actions">
                      <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                        {profileSaving ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Account summary card */}
                <div className="tp-card tp-card--summary">
                  <div className="tp-card-head">
                    <span className="tp-card-kicker">Summary</span>
                    <h2 className="tp-card-title">Teaching Overview</h2>
                  </div>
                  <div className="tp-summary-list">
                    {[
                      { label: 'Role',              value: 'Teacher' },
                      { label: 'Member Since',       value: memberDate },
                      { label: 'Classes',            value: stats?.total_classes ?? 0 },
                      { label: 'Total Students',     value: stats?.total_students ?? 0 },
                      { label: 'Units Created',      value: stats?.total_units ?? 0 },
                      { label: 'Published Units',    value: stats?.total_published_units ?? 0 },
                      { label: 'Assignments Created',value: stats?.total_assignments ?? 0 },
                      { label: 'Quizzes Created',    value: stats?.total_quizzes ?? 0 },
                      { label: 'Submissions',        value: stats?.graded_submissions ?? 0 },
                    ].map(row => (
                      <div key={row.label} className="tp-summary-row">
                        <span className="tp-summary-label">{row.label}</span>
                        <strong className="tp-summary-value">{row.value}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="tp-snapshot-grid">
                    <div className="tp-snapshot-card">
                      <span className="tp-snapshot-label">Average class size</span>
                      <strong className="tp-snapshot-value">{avgStudentsPerClass}</strong>
                      <p className="tp-snapshot-meta">{activeClassesCount} active classes with students enrolled</p>
                    </div>
                    <div className="tp-snapshot-card">
                      <span className="tp-snapshot-label">Publish progress</span>
                      <strong className="tp-snapshot-value">{publishRate}%</strong>
                      <p className="tp-snapshot-meta">{stats?.total_published_units ?? 0} of {stats?.total_units ?? 0} units are live</p>
                    </div>
                  </div>

                  {spotlightClass && (
                    <div className="tp-spotlight">
                      <span className="tp-spotlight-kicker">Classroom spotlight</span>
                      <strong className="tp-spotlight-title">{spotlightClass.name}</strong>
                      <p className="tp-spotlight-meta">
                        {spotlightClass.student_count} students | {spotlightClass.published_unit_count}/{spotlightClass.unit_count} units published | Created {formatMonthYear(spotlightClass.created_at)}
                      </p>
                    </div>
                  )}

                  <div className="tp-action-grid">
                    <button type="button" className="tp-action-btn" onClick={() => { setActiveTab('classes'); setShowNewClass(true); setNewClassMsg(null); }}>
                      Create a Class
                    </button>
                    <button type="button" className="tp-action-btn" onClick={() => setActiveTab('classes')}>
                      Manage Classes
                    </button>
                    <button type="button" className="tp-action-btn" onClick={() => navigate('/teacher')}>
                      Open Dashboard
                    </button>
                    <button type="button" className="tp-action-btn" onClick={() => navigate('/teacher/settings')}>
                      Teaching Settings
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ══ TAB: Password ══ */}
          {activeTab === 'password' && (
            <div className="tp-section">
              <div className="tp-section-grid tp-section-grid--narrow">
                <div className="tp-card">
                  <div className="tp-card-head">
                    <span className="tp-card-kicker">Security</span>
                    <h2 className="tp-card-title">Change Password</h2>
                    {!isOAuth && <p className="tp-card-desc">Choose a strong password you haven't used before.</p>}
                  </div>
                  {isOAuth ? (
                    <div className="tp-oauth-notice">
                      Your password is managed by {providerName}. To change it, visit your {providerName} account settings.
                    </div>
                  ) : (
                    <>
                      {pwMsg && <div className={`tp-toast tp-toast--${pwMsg.type}`}>{pwMsg.text}</div>}
                      <form onSubmit={handleChangePassword} className="tp-form">
                        <div className="tp-field">
                          <label>Current Password</label>
                          <div className="tp-pw-wrap">
                            <input type={showCurrentPw ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Enter current password" />
                            <button type="button" className="tp-pw-toggle" onClick={() => setShowCurrentPw(v => !v)}>{showCurrentPw ? 'Hide' : 'Show'}</button>
                          </div>
                        </div>
                        <div className="tp-field">
                          <label>New Password</label>
                          <div className="tp-pw-wrap">
                            <input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="At least 6 characters" />
                            <button type="button" className="tp-pw-toggle" onClick={() => setShowNewPw(v => !v)}>{showNewPw ? 'Hide' : 'Show'}</button>
                          </div>
                          {newPw.length > 0 && (
                            <div className="tp-pw-strength">
                              <div className={`tp-pw-bar tp-pw-bar--${pwStrength(newPw)}`} />
                              <span className="tp-pw-label">
                                {pwStrength(newPw) === 'weak' ? 'Too short' : pwStrength(newPw) === 'ok' ? 'Acceptable' : 'Strong'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="tp-field">
                          <label>Confirm New Password</label>
                          <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter new password" />
                          {confirmPw && newPw && confirmPw !== newPw && (
                            <p className="tp-field-error">Passwords do not match</p>
                          )}
                        </div>
                        <div className="tp-form-actions">
                          <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                            {pwSaving ? 'Updating…' : 'Update Password'}
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB: Classes ══ */}
          {activeTab === 'classes' && (
            <div className="tp-section">

              {/* Create class */}
              <div className="tp-classes-header">
                <div>
                  <h2 className="tp-section-title">Your Classes</h2>
                  <p className="tp-section-desc">Manage all your classes, rename them, copy join codes, or remove old ones.</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setShowNewClass(v => !v); setNewClassMsg(null); }}>
                  {showNewClass ? 'Cancel' : '+ New Class'}
                </button>
              </div>

              <div className="tp-class-toolbar">
                <label className="tp-class-search">
                  <span className="tp-class-search-label">Search</span>
                  <input
                    type="text"
                    value={classQuery}
                    onChange={e => setClassQuery(e.target.value)}
                    placeholder="Search by class name or join code"
                  />
                </label>
                <label className="tp-class-sort">
                  <span className="tp-class-search-label">Sort by</span>
                  <select value={classSort} onChange={e => setClassSort(e.target.value)}>
                    <option value="recent">Most recent</option>
                    <option value="name">Name</option>
                    <option value="students">Students</option>
                    <option value="progress">Publish progress</option>
                  </select>
                </label>
              </div>

              <div className="tp-class-chip-row">
                <span className="tp-class-chip">Showing {filteredClasses.length} of {classes.length}</span>
                <span className="tp-class-chip">{activeClassesCount} active classes</span>
                <span className="tp-class-chip">{unpublishedClassesCount} without published units</span>
                <span className="tp-class-chip">{(stats?.total_assignments ?? 0) + (stats?.total_quizzes ?? 0)} total activities</span>
              </div>

              {showNewClass && (
                <form onSubmit={handleCreateClass} className="tp-new-class-form">
                  <div className="tp-new-class-inner">
                    <input
                      type="text"
                      className="tp-new-class-input"
                      placeholder="Class name, e.g. AP World History Period 3"
                      value={newClassName}
                      onChange={e => setNewClassName(e.target.value)}
                      autoFocus
                    />
                    <button type="submit" className="btn btn-primary" disabled={newClassSaving}>
                      {newClassSaving ? 'Creating…' : 'Create'}
                    </button>
                  </div>
                  {newClassMsg && <p className={`tp-new-class-msg tp-new-class-msg--${newClassMsg.type}`}>{newClassMsg.text}</p>}
                </form>
              )}

              {classes.length === 0 ? (
                <div className="tp-empty">
                  <p className="tp-empty-icon">🏛</p>
                  <p>You haven't created any classes yet.</p>
                  <button className="btn btn-primary" onClick={() => setShowNewClass(true)}>Create your first class</button>
                </div>
              ) : filteredClasses.length === 0 ? (
                <div className="tp-empty">
                  <p className="tp-empty-icon">?</p>
                  <p>No classes match your search.</p>
                  <button className="btn btn-ghost" onClick={() => setClassQuery('')}>Clear search</button>
                </div>
              ) : (
                <div className="tp-class-list">
                  {filteredClasses.map((c, i) => {
                    const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];
                    return (
                      <div key={c.id} className="tp-class-row">

                        {/* Accent bar */}
                        <div className="tp-class-accent" style={{ background: accent.bg }} />

                        {/* Avatar */}
                        <div className="tp-class-avatar" style={{ background: accent.light }}>
                          <span style={{ background: accent.bg, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {c.name?.[0]?.toUpperCase()}
                          </span>
                        </div>

                        {/* Name + join code */}
                        <div className="tp-class-info">
                          {editingId === c.id ? (
                            <div className="tp-class-edit-row">
                              <input
                                ref={editInputRef}
                                className="tp-class-edit-input"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleRename(c.id);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                              />
                              <button className="btn btn-primary" style={{ padding: '5px 14px', fontSize: 12 }} disabled={renameSaving} onClick={() => handleRename(c.id)}>
                                {renameSaving ? '…' : 'Save'}
                              </button>
                              <button className="btn btn-ghost" style={{ padding: '5px 14px', fontSize: 12 }} onClick={() => setEditingId(null)}>Cancel</button>
                            </div>
                          ) : (
                            <p className="tp-class-name">{c.name}</p>
                          )}
                          <div className="tp-class-code-row">
                            <code className="tp-class-code">{c.join_code}</code>
                            <button
                              className={`tp-copy-btn${copiedId === c.id ? ' tp-copy-btn--copied' : ''}`}
                              onClick={() => handleCopy(c.id, c.join_code)}
                            >
                              {copiedId === c.id ? '✓ Copied' : 'Copy code'}
                            </button>
                          </div>
                        </div>

                        {/* Per-class metrics */}
                        <div className="tp-class-metrics">
                          <div className="tp-class-metric">
                            <span className="tp-class-metric-value">{c.student_count}</span>
                            <span className="tp-class-metric-label">Students</span>
                          </div>
                          <div className="tp-class-metric">
                            <span className="tp-class-metric-value">{c.published_unit_count}<span className="tp-class-metric-of">/{c.unit_count}</span></span>
                            <span className="tp-class-metric-label">Units published</span>
                          </div>
                          {c.avg_score !== null ? (
                            <div className="tp-class-metric">
                              <span className="tp-class-metric-value" style={{ color: scoreColor(c.avg_score), background: scoreBg(c.avg_score), padding: '2px 8px', borderRadius: 6 }}>
                                {c.avg_score}%
                              </span>
                              <span className="tp-class-metric-label">Class avg</span>
                            </div>
                          ) : (
                            <div className="tp-class-metric">
                              <span className="tp-class-metric-value" style={{ color: 'var(--muted)' }}>—</span>
                              <span className="tp-class-metric-label">No submissions</span>
                            </div>
                          )}
                          <div className="tp-class-metric">
                            <span className="tp-class-metric-value" style={{ color: 'var(--muted)', fontSize: 12 }}>
                              {formatMonthYear(c.created_at)}
                            </span>
                            <span className="tp-class-metric-label">Created</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="tp-class-actions">
                          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate(`/teacher/classroom/${c.id}`)}>
                            Open
                          </button>
                          <button className="tp-edit-btn" onClick={() => startEdit(c)} title="Rename">
                            ✎
                          </button>
                          {confirmDeleteId === c.id ? (
                            <div className="tp-delete-confirm">
                              <span className="tp-delete-warn">Delete class?</span>
                              <button className="btn btn-danger" style={{ fontSize: 12, padding: '5px 12px' }} disabled={deletingId === c.id} onClick={() => handleDelete(c.id)}>
                                {deletingId === c.id ? '…' : 'Confirm'}
                              </button>
                              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setConfirmDeleteId(null)}>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button className="tp-delete-btn" onClick={() => setConfirmDeleteId(c.id)} title="Delete class">
                              ✕
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </>
  );
}
