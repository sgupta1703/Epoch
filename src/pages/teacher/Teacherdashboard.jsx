import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import Modal, { ModalActions } from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  getClassrooms,
  createClassroom,
  deleteClassroom,
} from '../../api/classrooms';
import '../../styles/pages.css';
import './Teacher.css';

export default function TeacherDashboard({ user }) {
  const navigate = useNavigate();
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

  useEffect(() => {
    fetchClassrooms();
  }, []);

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
              <p className="page-subtitle">
                Manage your courses and create units for your students.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
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
            <div className="cards-grid">
              {classrooms.map(c => (
                <div key={c.id} className="classroom-card" onClick={() => navigate(`/teacher/classroom/${c.id}`)}>
                  <div className="classroom-card-top">
                    <h2 className="classroom-card-name">{c.name}</h2>
                    <span className="classroom-card-code">{c.join_code}</span>
                  </div>
                  <p className="classroom-card-meta">
                    Created {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <div className="classroom-card-footer">
                    <button
                      className="btn btn-dark"
                      onClick={e => { e.stopPropagation(); navigate(`/teacher/classroom/${c.id}`); }}
                    >
                      Open →
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={e => { e.stopPropagation(); setDeleteTarget(c); }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
