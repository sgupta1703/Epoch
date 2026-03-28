import React, { useState, useEffect } from 'react';
import AppDatePicker from '../../components/AppDatePicker';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import UnitCard from '../../components/UnitCard';
import Modal, { ModalActions } from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getClassrooms, getClassroom, getClassroomStudents, removeStudent, getClassroomPerformance } from '../../api/classrooms';
import { getUnits, createUnit, deleteUnit, setUnitVisibility } from '../../api/units';
import CourseQuizResultsModal from './CourseQuizResults';
import { useSettings } from '../../hooks/useSettings';
import '../../styles/pages.css';
import './Teacher.css';

function scoreColor(score) {
  if (score === null || score === undefined) return 'var(--muted)';
  if (score >= 70) return '#2a7a2a';
  if (score >= 40) return '#b8860b';
  return '#c0392b';
}

function scoreBg(score) {
  if (score === null || score === undefined) return 'var(--cream)';
  if (score >= 70) return '#eaf6ea';
  if (score >= 40) return '#fdf8ec';
  return '#fdecea';
}

function ScorePill({ score }) {
  if (score === null || score === undefined)
    return <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>;
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 10,
      color: scoreColor(score), background: scoreBg(score), display: 'inline-block',
    }}>
      {score}%
    </span>
  );
}

function BackArrow({ onClick, label }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: 'none', border: 'none', padding: '0 0 14px 0',
      cursor: 'pointer', fontSize: 13, color: 'var(--muted)',
      fontFamily: 'var(--font-body)',
    }}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 3L5 8l5 5"/>
      </svg>
      {label}
    </button>
  );
}

function exportCSV(data, className) {
  if (!data) return;
  const unitHeaders = data.units.flatMap(u => [`"${u.title} — Quiz Avg"`, `"${u.title} — Assignment"`]);
  const headers = ['Student', 'Overall', ...unitHeaders];
  const rows = data.results.map(({ student, performance }) => {
    const unitCols = performance.units.flatMap(u => [u.quiz?.score ?? '', u.assignment?.score ?? '']);
    return [`"${student.display_name}"`, performance.overall ?? '', ...unitCols];
  });
  const avgCols = data.units.flatMap((_, i) => {
    const quizScores   = data.results.map(r => r.performance.units[i]?.quiz?.score).filter(s => s !== null && s !== undefined);
    const assignScores = data.results.map(r => r.performance.units[i]?.assignment?.score).filter(s => s !== null && s !== undefined);
    const quizAvg   = quizScores.length   > 0 ? Math.round(quizScores.reduce((a, b) => a + b, 0)   / quizScores.length)   : '';
    const assignAvg = assignScores.length > 0 ? Math.round(assignScores.reduce((a, b) => a + b, 0) / assignScores.length) : '';
    return [quizAvg, assignAvg];
  });
  const overallScores = data.results.map(r => r.performance.overall).filter(s => s !== null && s !== undefined);
  const overallAvg = overallScores.length > 0 ? Math.round(overallScores.reduce((a, b) => a + b, 0) / overallScores.length) : '';
  const avgRow = ['"Class Average"', overallAvg, ...avgCols];
  const csv = [headers, ...rows, avgRow].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${className.replace(/\s+/g, '_')}_grades.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const AVATAR_COLORS = [
  ['#7c3aed','#ede9fe'],['#b45309','#fef3c7'],['#0369a1','#e0f2fe'],
  ['#15803d','#dcfce7'],['#be185d','#fce7f3'],['#9a3412','#ffedd5'],
];
function avatarColor(name) {
  const i = (name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

function ClassPerformanceModal({ isOpen, onClose, onBack, classroomId, className }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setData(null); setError(''); setLoading(true);
    getClassroomPerformance(classroomId)
      .then(res => setData(res))
      .catch(() => setError('Failed to load class performance.'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const classAvg = data
    ? (() => {
        const s = data.results.map(r => r.performance.overall).filter(x => x !== null && x !== undefined);
        return s.length > 0 ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : null;
      })()
    : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Class Performance — ${className}`} size="lg">
      <BackArrow onClick={onBack} label="Back to Students" />
      {loading && <LoadingSpinner label="Loading class performance…" />}
      {error   && <div className="alert alert-error">{error}</div>}
      {data && data.results.length === 0 && <p style={{ fontSize: 14, color: 'var(--muted)' }}>No students enrolled yet.</p>}
      {data && data.results.length > 0 && (
        <>
          <div className="perf-overall-row" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>Class average</span>
              <ScorePill score={classAvg} />
            </div>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '5px 12px', gap: 6, display: 'flex', alignItems: 'center' }}
              onClick={() => exportCSV(data, className)}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2v9M4 7l4 4 4-4"/><path d="M2 13h12"/>
              </svg>
              Export CSV
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="perf-table">
              <thead>
                <tr>
                  <th className="perf-table-th perf-table-th--student">Student</th>
                  <th className="perf-table-th">Overall</th>
                  {data.units.map(u => (
                    <th key={u.id} className="perf-table-th" colSpan={2}>
                      <div className="perf-table-unit-name" title={u.title}>{u.title}</div>
                       <div className="perf-table-unit-sub">Quiz Avg · Assign</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.results.map(({ student, performance }) => (
                  <tr key={student.id} className="perf-table-row">
                    <td className="perf-table-td perf-table-td--student">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--cream)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--muted)', flexShrink: 0 }}>
                          {student.display_name?.[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{student.display_name}</span>
                      </div>
                    </td>
                    <td className="perf-table-td perf-table-td--center"><ScorePill score={performance.overall} /></td>
                    {performance.units.map(u => (
                      <React.Fragment key={u.unit_id}>
                        <td className="perf-table-td perf-table-td--center"><ScorePill score={u.quiz?.score ?? null} /></td>
                        <td className="perf-table-td perf-table-td--center"><ScorePill score={u.assignment?.score ?? null} /></td>
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}

export default function ClassroomView({ user }) {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const DEFAULT_TEACHER_SETTINGS = {
    show_course_stats: true,
  };
  const { settings } = useSettings(DEFAULT_TEACHER_SETTINGS);

  const [classrooms, setClassrooms] = useState([]);
  const [classroom, setClassroom] = useState(null);
  const [units, setUnits] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [newUnit, setNewUnit] = useState({ title: '', context: '', due_date: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [studentsOpen, setStudentsOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  const [classPerformanceOpen, setClassPerformanceOpen] = useState(false);
  const [quizResultsOpen, setQuizResultsOpen] = useState(false);

  const [copied, setCopied] = useState(false);

  function handleCopyCode() {
    navigator.clipboard.writeText(classroom?.join_code || '').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  useEffect(() => { fetchAll(); }, [classroomId]);

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
  }, [classroomId]);

  useEffect(() => {
    if (loading) return;
    if (location.state?.autoOpenClassPerformance) {
      setQuizResultsOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [loading, navigate, location.pathname, location.state]);

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const [{ classrooms }, { classroom }, { units }, { students }] = await Promise.all([
        getClassrooms(),
        getClassroom(classroomId),
        getUnits(classroomId),
        getClassroomStudents(classroomId),
      ]);
      setClassrooms(classrooms);
      setClassroom(classroom);
      setUnits(units);
      setStudents(students);
    } catch {
      setError('Failed to load classroom.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUnit() {
    if (!newUnit.title.trim()) { setCreateError('Title is required.'); return; }
    setCreating(true);
    setCreateError('');
    try {
      const { unit } = await createUnit(classroomId, {
        title: newUnit.title.trim(),
        context: newUnit.context.trim() || null,
        due_date: newUnit.due_date || null,
      });
      setUnits(u => [...u, unit]);
      window.dispatchEvent(new CustomEvent('epoch:units-changed'));
      setCreateOpen(false);
      setNewUnit({ title: '', context: '', due_date: '' });
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create unit.');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleVisibility(unit) {
    try {
      const { unit: updated } = await setUnitVisibility(unit.id, !unit.is_visible);
      setUnits(u => u.map(x => x.id === updated.id ? updated : x));
      window.dispatchEvent(new CustomEvent('epoch:units-changed'));
    } catch { /* silent */ }
  }

  async function handleDeleteUnit() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUnit(deleteTarget.id);
      setUnits(u => u.filter(x => x.id !== deleteTarget.id));
      window.dispatchEvent(new CustomEvent('epoch:units-changed'));
      setDeleteTarget(null);
    } catch { /* silent */ } finally {
      setDeleting(false);
    }
  }

  async function handleRemoveStudent() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await removeStudent(classroomId, removeTarget.id);
      setStudents(s => s.filter(x => x.id !== removeTarget.id));
      setRemoveTarget(null);
    } catch { /* silent */ } finally {
      setRemoving(false);
    }
  }

  if (loading) return (
    <>
      <Navbar user={user} />
      <div className="app-shell">
        <Sidebar classrooms={[]} activeId={classroomId} role="teacher" loading={loading} />
        <main className="page-main"><LoadingSpinner fullPage label="Loading classroom…" /></main>
      </div>
    </>
  );

  return (
    <>
      <Navbar user={user} />
      <div className="app-shell">
        <Sidebar classrooms={classrooms} activeId={classroomId} role="teacher" loading={loading} onNewClass={() => navigate('/teacher')} />

        <main className="page-main">
          <div className="page-header">
            <div className="page-header-left">
              <p className="page-eyebrow">Course</p>
              <h1 className="page-title">{classroom?.name}</h1>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setStudentsOpen(true)}>{students.length} Students</button>
              <button className="btn btn-ghost" onClick={() => setQuizResultsOpen(true)}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                  <rect x="1" y="1" width="14" height="14" rx="2"/><path d="M4 8h8M4 5h5M4 11h3"/>
                </svg>
                Class Performance
              </button>
              <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>+ New Unit</button>
            </div>
          </div>

          {settings.show_course_stats && (
            <div className="classroom-info-bar">
              <div className="classroom-info-item">
                <span className="classroom-info-label">Join Code</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="classroom-info-code">{classroom?.join_code}</span>
                  <button className="copy-code-btn" onClick={handleCopyCode} title="Copy join code">
                    {copied ? (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 8 6 12 14 4"/></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="8" height="9" rx="1.5"/><path d="M3 11V3a1 1 0 0 1 1-1h7"/></svg>
                    )}
                  </button>
                  {copied && <span style={{ fontSize: 11, color: 'var(--color-success, #2a7a2a)', fontWeight: 500 }}>Copied!</span>}
                </div>
              </div>
              <div className="classroom-info-item"><span className="classroom-info-label">Units</span><span className="classroom-info-value">{units.length}</span></div>
              <div className="classroom-info-item"><span className="classroom-info-label">Visible Units</span><span className="classroom-info-value">{units.filter(u => u.is_visible).length}</span></div>
              <div className="classroom-info-item"><span className="classroom-info-label">Students</span><span className="classroom-info-value">{students.length}</span></div>
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          {units.length === 0 ? (
            <div className="empty-state">
              <h3>No units yet</h3>
              <p>Create your first unit to add notes, personas, quizzes, assignments and more for your students.</p>
              <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>Create Unit</button>
            </div>
          ) : (
            <div className="cards-grid">
              {units.map(unit => (
                <UnitCard key={unit.id} unit={unit} role="teacher" onToggleVis={handleToggleVisibility} onDelete={setDeleteTarget} />
              ))}
            </div>
          )}
        </main>
      </div>

      <Modal isOpen={createOpen} onClose={() => { setCreateOpen(false); setNewUnit({ title: '', context: '', due_date: '' }); setCreateError(''); }} title="Create New Unit" size="md"
        footer={<ModalActions onCancel={() => { setCreateOpen(false); setCreateError(''); }} onConfirm={handleCreateUnit} confirmLabel="Create Unit" loading={creating} />}>
        {createError && <div className="alert alert-error">{createError}</div>}
        <div className="field"><label>Unit Title</label><input type="text" value={newUnit.title} onChange={e => setNewUnit(u => ({ ...u, title: e.target.value }))} placeholder="e.g. The American Civil War" autoFocus /></div>
        <div className="field"><label>Context <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(used by AI for notes, personas, and quiz)</span></label><textarea value={newUnit.context} onChange={e => setNewUnit(u => ({ ...u, context: e.target.value }))} placeholder="Describe the unit topic in detail. The more specific, the better the generated content will be" rows={4} /></div>
        <div className="field"><label>Due Date (optional)</label><AppDatePicker value={newUnit.due_date} onChange={val => setNewUnit(u => ({ ...u, due_date: val }))} /></div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Unit" size="sm"
        footer={<ModalActions onCancel={() => setDeleteTarget(null)} onConfirm={handleDeleteUnit} confirmLabel="Delete" danger loading={deleting} />}>
        <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>Delete <strong>{deleteTarget?.title}</strong>? All notes, personas, and quizzes inside this unit will be permanently removed.</p>
      </Modal>

      <Modal isOpen={studentsOpen} onClose={() => setStudentsOpen(false)} title={`Students — ${classroom?.name}`} size="sm">
        {students.length > 0 && (
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginBottom: 14, fontSize: 13, gap: 6 }}
            onClick={() => { setStudentsOpen(false); setClassPerformanceOpen(true); }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M5 3V13M1 7h14"/>
            </svg>
            View class performance overview
          </button>
        )}
        {students.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>No students enrolled yet. Share the join code <strong>{classroom?.join_code}</strong>.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {students.map(s => {
              const [fg, bg] = avatarColor(s.display_name);
              return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, padding: '2px 4px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: bg, color: fg, border: `1.5px solid ${fg}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {s.display_name?.[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.display_name}</span>
                </div>
                <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setRemoveTarget(s)}>Remove</button>
              </div>
            );
            })}
          </div>
        )}
      </Modal>

      <Modal isOpen={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove Student" size="sm"
        footer={<ModalActions onCancel={() => setRemoveTarget(null)} onConfirm={handleRemoveStudent} confirmLabel="Remove" danger loading={removing} />}>
        <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>
          Remove <strong>{removeTarget?.display_name}</strong> from <strong>{classroom?.name}</strong>? They will lose access to all units and their work will be deleted.
        </p>
      </Modal>

      <ClassPerformanceModal isOpen={classPerformanceOpen} onClose={() => setClassPerformanceOpen(false)} onBack={() => { setClassPerformanceOpen(false); setStudentsOpen(true); }} classroomId={classroomId} className={classroom?.name} />
      <CourseQuizResultsModal isOpen={quizResultsOpen} onClose={() => setQuizResultsOpen(false)} units={units} students={students} />
    </>
  );
}
