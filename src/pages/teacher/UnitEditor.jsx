import { useState, useEffect } from 'react';
import AppDatePicker from '../../components/AppDatePicker';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import NotesEditor from './NotesEditor';
import PersonasEditor from './PersonasEditor';
import QuizEditor from './QuizEditor';
import AssignmentEditor from './AssignmentEditor';
import { getClassrooms, getClassroomStudents } from '../../api/classrooms';
import { getUnit, updateUnit } from '../../api/units';
import '../../styles/pages.css';
import './Teacher.css';

const TABS = [
  { key: 'notes',      label: 'Notes' },
  { key: 'personas',   label: 'Personas' },
  { key: 'quiz',       label: 'Quizzes' },
  { key: 'assignment', label: 'Assignment' },
];

export default function UnitEditor({ user }) {
  const { classroomId, unitId } = useParams();
  const navigate = useNavigate();

  const [classrooms, setClassrooms] = useState([]);
  const [unit, setUnit] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notes');

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', context: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAll(); }, [unitId]);
  useEffect(() => {
    localStorage.setItem('epoch_last_teacher_classroom_id', classroomId);
  }, [classroomId]);
  useEffect(() => {
    function handleUnitsChanged() { fetchAll(); }
    function handleClassroomsChanged() { fetchAll(); }
    window.addEventListener('epoch:units-changed', handleUnitsChanged);
    window.addEventListener('epoch:classrooms-changed', handleClassroomsChanged);
    return () => {
      window.removeEventListener('epoch:units-changed', handleUnitsChanged);
      window.removeEventListener('epoch:classrooms-changed', handleClassroomsChanged);
    };
  }, [unitId, classroomId]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [{ classrooms }, { unit }, { students }] = await Promise.all([
        getClassrooms(),
        getUnit(unitId),
        getClassroomStudents(classroomId),
      ]);
      setClassrooms(classrooms);
      setUnit(unit);
      setStudents(students || []);
      setEditForm({ title: unit.title, context: unit.context || '', due_date: unit.due_date?.slice(0, 10) || '' });
    } catch {
      navigate(`/teacher/classroom/${classroomId}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveUnit() {
    setSaving(true);
    try {
      const { unit: updated } = await updateUnit(unitId, {
        title: editForm.title.trim(),
        context: editForm.context.trim() || null,
        due_date: editForm.due_date || null,
      });
      setUnit(updated);
      window.dispatchEvent(new CustomEvent('epoch:units-changed'));
      setEditing(false);
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  }

  async function handleToggleVisibility() {
    try {
      const { unit: updated } = await updateUnit(unitId, { is_visible: !unit.is_visible });
      setUnit(updated);
      window.dispatchEvent(new CustomEvent('epoch:units-changed'));
    } catch { /* silent */ }
  }

  if (loading) return (
    <>
      <Navbar user={user} />
      <div className="app-shell">
        <Sidebar classrooms={[]} activeId={classroomId} role="teacher" loading={loading} />
        <main className="page-main"><LoadingSpinner fullPage label="Loading unit…" /></main>
      </div>
    </>
  );

  return (
    <>
      <Navbar user={user} />
      <div className="app-shell">
        <Sidebar classrooms={classrooms} activeId={classroomId} role="teacher" loading={loading} />

        <main className="page-main">
          <p className="page-eyebrow" style={{ marginBottom: 8, cursor: 'pointer' }}
            onClick={() => navigate(`/teacher/classroom/${classroomId}`)}>
            ← Back to Course
          </p>

          {editing ? (
            <div className="panel" style={{ marginBottom: 24 }}>
              <div className="unit-editor-meta">
                <div className="field">
                  <label>Unit Title</label>
                  <input type="text" value={editForm.title}
                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} autoFocus />
                </div>
                <div className="field">
                  <label>Due Date</label>
                  <AppDatePicker value={editForm.due_date} onChange={val => setEditForm(f => ({ ...f, due_date: val }))} />
                </div>
              </div>
              <div className="field">
                <label>Context (AI source material)</label>
                <textarea rows={4} value={editForm.context}
                  onChange={e => setEditForm(f => ({ ...f, context: e.target.value }))}
                  placeholder="Describe the unit topic in detail…" />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-dark" onClick={handleSaveUnit} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="page-header">
              <div className="page-header-left">
                <h1 className="page-title">{unit?.title}</h1>
                {unit?.context && <p className="page-subtitle">{unit.context}</p>}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  className={`btn ${unit?.is_visible ? 'btn-ghost' : 'btn-primary'}`}
                  onClick={handleToggleVisibility}
                >
                  {unit?.is_visible ? '👁 Visible' : '👁 Publish'}
                </button>
                <button className="btn btn-ghost" onClick={() => setEditing(true)}>Edit</button>
              </div>
            </div>
          )}

          <div className="tabs">
            {TABS.map(t => (
              <button
                key={t.key}
                className={`tab-btn ${activeTab === t.key ? 'tab-btn--active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'notes'      && <NotesEditor      unit={unit} />}
          {activeTab === 'personas'   && <PersonasEditor   unit={unit} />}
          {activeTab === 'quiz'       && <QuizEditor       unit={unit} students={students} />}
          {activeTab === 'assignment' && <AssignmentEditor unit={unit} students={students} />}
        </main>
      </div>
    </>
  );
}
