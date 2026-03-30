import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import Modal, { ModalActions } from '../../components/Modal';
import TeacherOnboarding from '../../components/TeacherOnboarding';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  getClassrooms,
  createClassroom,
  deleteClassroom,
} from '../../api/classrooms';
import { useSettings } from '../../hooks/useSettings';
import '../../styles/pages.css';
import './Teacher.css';

const DEFAULT_TEACHER_SETTINGS = {
  default_landing: 'dashboard',
  show_course_stats: true,
};

export default function TeacherDashboard({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { settings } = useSettings(DEFAULT_TEACHER_SETTINGS);
  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem('epoch_teacher_onboarding') === 'needed'
  );

  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    function handleClassroomsChanged() { fetchClassrooms(); }
    window.addEventListener('epoch:classrooms-changed', handleClassroomsChanged);
    return () => window.removeEventListener('epoch:classrooms-changed', handleClassroomsChanged);
  }, []);

  useEffect(() => {
    if (!location.state?.applyDefaultLanding) return;
    if (loading || classrooms.length === 0) return;
    if (settings.default_landing === 'dashboard') return;

    const lastClassroomId = localStorage.getItem('epoch_last_teacher_classroom_id');
    const target = classrooms.find(classroom => classroom.id === lastClassroomId) || classrooms[0];
    if (!target?.id) return;

    if (settings.default_landing === 'last-course') {
      navigate(`/teacher/classroom/${target.id}`, { replace: true });
      return;
    }

    if (settings.default_landing === 'analytics') {
      navigate(`/teacher/classroom/${target.id}`, {
        replace: true,
        state: { autoOpenClassPerformance: true },
      });
    }
  }, [classrooms, loading, location.state, navigate, settings.default_landing]);

  async function fetchClassrooms() {
    setLoading(true);
    try {
      const { classrooms } = await getClassrooms();
      setClassrooms(classrooms);
    } catch {
      setError('Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) { setCreateError('Name is required.'); return; }
    setCreating(true);
    setCreateError('');
    try {
      const { classroom } = await createClassroom({ name: newName.trim() });
      setClassrooms(c => [classroom, ...c]);
      window.dispatchEvent(new CustomEvent('epoch:classrooms-changed'));
      setCreateOpen(false);
      setNewName('');
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create classroom.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteClassroom(deleteTarget.id);
      setClassrooms(c => c.filter(x => x.id !== deleteTarget.id));
      window.dispatchEvent(new CustomEvent('epoch:classrooms-changed'));
      setDeleteTarget(null);
    } catch {
      // keep modal open, show nothing — simple
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Navbar user={user} />
      <div className="app-shell">
        <Sidebar
          classrooms={classrooms}
          role="teacher"
          loading={loading}
          onNewClass={() => setCreateOpen(true)}
        />

        <main className="page-main">
          <div className="page-header">
            <div className="page-header-left">
              <p className="page-eyebrow">Educator Portal</p>
              <h1 className="page-title">My Courses</h1>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setCreateOpen(true)}
              data-onboarding="new-course"
            >
              + New Course
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <LoadingSpinner fullPage label="Loading classrooms…" />
          ) : classrooms.length === 0 ? (
            <div className="empty-state">
              <h3>No courses yet</h3>
              <p>Create your first course to start building units and inviting students.</p>
              <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
                Create Course
              </button>
            </div>
          ) : (
            <>
              {/* Summary bar */}
              <div className="dashboard-summary-bar">
                <div className="dashboard-summary-item">
                  <span className="dashboard-summary-value">{classrooms.length}</span>
                  <span className="dashboard-summary-label">Course{classrooms.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="dashboard-summary-divider" />
                <div className="dashboard-summary-item">
                  <span className="dashboard-summary-value">{classrooms.reduce((s, c) => s + (c.student_count ?? 0), 0)}</span>
                  <span className="dashboard-summary-label">Total Students</span>
                </div>
                <div className="dashboard-summary-divider" />
                <div className="dashboard-summary-item">
                  <span className="dashboard-summary-value">{classrooms.reduce((s, c) => s + (c.unit_count ?? 0), 0)}</span>
                  <span className="dashboard-summary-label">Total Units</span>
                </div>
                <div className="dashboard-summary-divider" />
                <div className="dashboard-summary-item">
                  <span className="dashboard-summary-value">{classrooms.reduce((s, c) => s + (c.visible_unit_count ?? 0), 0)}</span>
                  <span className="dashboard-summary-label">Published</span>
                </div>
              </div>

              <div className="cards-grid">
                {classrooms.map((c, idx) => (
                  <div key={c.id} className="classroom-card" onClick={() => navigate(`/teacher/classroom/${c.id}`)}>
                    <div className={`classroom-card-accent classroom-card-accent--${idx % 5}`} />

                    <div className="classroom-card-top">
                      <h2 className="classroom-card-name">{c.name}</h2>
                    </div>

                    <div className="classroom-card-join-row">
                      <span className="classroom-card-join-label">Join code</span>
                      <span className="classroom-card-code">{c.join_code}</span>
                    </div>

                    {settings.show_course_stats && (
                      <div className="classroom-card-stats">
                        <div className="classroom-card-stat">
                          <strong className="classroom-card-stat-value">{c.student_count ?? 0}</strong>
                          <span className="classroom-card-stat-label">Students</span>
                        </div>
                        <div className="classroom-card-stat">
                          <strong className="classroom-card-stat-value">{c.unit_count ?? 0}</strong>
                          <span className="classroom-card-stat-label">Units</span>
                        </div>
                        <div className="classroom-card-stat">
                          <strong className="classroom-card-stat-value">{c.visible_unit_count ?? 0}</strong>
                          <span className="classroom-card-stat-label">Published</span>
                        </div>
                      </div>
                    )}

                    <div className="classroom-card-footer">
                      <span className="classroom-card-meta">
                        Created {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: 12, padding: '5px 12px' }}
                          onClick={e => { e.stopPropagation(); setDeleteTarget(c); }}
                        >
                          Delete
                        </button>
                        <button
                          className="btn btn-dark"
                          style={{ fontSize: 13 }}
                          onClick={e => { e.stopPropagation(); navigate(`/teacher/classroom/${c.id}`); }}
                        >
                          Open →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); setNewName(''); setCreateError(''); }}
        title="New Classroom"
        size="sm"
        footer={
          <ModalActions
            onCancel={() => { setCreateOpen(false); setNewName(''); setCreateError(''); }}
            onConfirm={handleCreate}
            confirmLabel="Create"
            loading={creating}
          />
        }
      >
        {createError && <div className="alert alert-error">{createError}</div>}
        <div className="field">
          <label>Classroom Name</label>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="e.g. Period 3 — US History"
            autoFocus
          />
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -8 }}>
          A unique join code will be generated automatically.
        </p>
      </Modal>

      {showOnboarding && (
        <TeacherOnboarding onDone={() => setShowOnboarding(false)} />
      )}

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Classroom"
        size="sm"
        footer={
          <ModalActions
            onCancel={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            confirmLabel="Delete"
            danger
            loading={deleting}
          />
        }
      >
        <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will
          permanently remove all units, notes, personas, and quizzes inside it.
        </p>
      </Modal>
    </>
  );
}
