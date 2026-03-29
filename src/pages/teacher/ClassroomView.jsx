import React, { useState, useEffect } from 'react';
import AppDatePicker from '../../components/AppDatePicker';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import UnitCard from '../../components/UnitCard';
import Modal, { ModalActions } from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  getClassrooms, getClassroom, getClassroomStudents, removeStudent,
  getClassroomPerformance, getClassAnalysis, analyzeClassPerformance,
} from '../../api/classrooms';
import { getUnits, createUnit, deleteUnit, setUnitVisibility } from '../../api/units';
import CourseQuizResultsModal from './CourseQuizResults';
import { renderMarkdown } from '../../utils/renderMarkdown';
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

/* ── Grades table (Students tab) ── */
function GradesTable({ classroomId, className }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const [error, setError]     = useState('');

  function load() {
    if (data) { setOpen(o => !o); return; }
    setLoading(true);
    getClassroomPerformance(classroomId)
      .then(res => { setData(res); setOpen(true); })
      .catch(() => setError('Failed to load grade data.'))
      .finally(() => setLoading(false));
  }

  const classAvg = data
    ? (() => {
        const s = data.results.map(r => r.performance.overall).filter(x => x !== null && x !== undefined);
        return s.length > 0 ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : null;
      })()
    : null;

  return (
    <div className="grades-table-section">
      <div className="grades-table-header" onClick={load} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M5 3V13M1 7h14"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Grade Overview</span>
          {data && classAvg !== null && <ScorePill score={classAvg} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {data && (
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={e => { e.stopPropagation(); exportCSV(data, className); }}>
              Export CSV
            </button>
          )}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <path d="M4 6l4 4 4-4"/>
          </svg>
        </div>
      </div>

      {loading && <div style={{ padding: '12px 0' }}><LoadingSpinner label="Loading grades…" /></div>}
      {error && <div className="alert alert-error" style={{ marginTop: 8 }}>{error}</div>}

      {open && data && (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          {data.results.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>No submissions yet.</p>
          ) : (
            <table className="perf-table">
              <thead>
                <tr>
                  <th className="perf-table-th perf-table-th--student">Student</th>
                  <th className="perf-table-th">Overall</th>
                  {data.units.map(u => (
                    <th key={u.id} className="perf-table-th" colSpan={2}>
                      <div className="perf-table-unit-name" title={u.title}>{u.title}</div>
                      <div className="perf-table-unit-sub">Quiz · Assign</div>
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
          )}
        </div>
      )}
    </div>
  );
}

/* ── AI Class Analysis panel ── */
function ClassAnalysisPanel({ classroomId }) {
  const [analysis, setAnalysis]   = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    getClassAnalysis(classroomId)
      .then(({ analysis: saved, updated_at }) => {
        if (saved) {
          setAnalysis(saved);
          setUpdatedAt(updated_at);
        } else {
          // No saved analysis — auto-generate the first time
          handleAnalyze();
        }
      })
      .catch(() => {
        // If fetch fails just leave panel in idle state
      })
      .finally(() => setInitialLoad(false));
  }, [classroomId]);

  async function handleAnalyze() {
    setLoading(true);
    setError('');
    try {
      const { analysis: data, updated_at } = await analyzeClassPerformance(classroomId);
      setAnalysis(data);
      setUpdatedAt(updated_at);
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function formatUpdatedAt(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  return (
    <div className="class-analysis-panel">
      <div className="class-analysis-header">
        <div>
          <p className="class-analysis-eyebrow">AI-Powered</p>
          <h3 className="class-analysis-title">Class Strengths &amp; Weaknesses</h3>
          <p className="class-analysis-subtitle">
            Analyzes every student's quiz and assignment scores to surface class-wide patterns.
          </p>
          {updatedAt && !loading && (
            <p className="class-analysis-updated">Last updated {formatUpdatedAt(updatedAt)}</p>
          )}
        </div>
        <button
          className={`btn ${analysis ? 'btn-ghost' : 'btn-dark'}`}
          onClick={handleAnalyze}
          disabled={loading || initialLoad}
          style={{ flexShrink: 0, alignSelf: 'flex-start' }}
        >
          {loading ? (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite', marginRight: 6 }}>
                <path d="M8 2a6 6 0 1 1-4.24 1.76"/>
              </svg>
              Analyzing…
            </>
          ) : analysis ? (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                <path d="M13.5 2.5A6 6 0 1 1 8 2"/><path d="M8 2l2.5 2.5L8 7"/>
              </svg>
              Refresh
            </>
          ) : 'Analyze Class'}
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}

      {!analysis && !loading && !error && !initialLoad && (
        <div className="class-analysis-empty">
          No student data yet — add students and quizzes to generate an analysis.
        </div>
      )}

      {(loading || initialLoad) && (
        <div className="class-analysis-empty">
          <LoadingSpinner label="Analyzing class performance…" />
        </div>
      )}

      {analysis && (
        <div className="class-analysis-body">
          <div className="class-analysis-summary" dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis.summary) }} />
          <div className="class-analysis-grid">
            <div className="class-analysis-card class-analysis-card--strengths">
              <div className="class-analysis-card-label">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2 8 6 12 14 4"/>
                </svg>
                Strengths
              </div>
              <ul className="class-analysis-list">
                {analysis.strengths.map((s, i) => <li key={i} dangerouslySetInnerHTML={{ __html: renderMarkdown(s) }} />)}
              </ul>
            </div>
            <div className="class-analysis-card class-analysis-card--weaknesses">
              <div className="class-analysis-card-label">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="8" r="6"/><path d="M8 5v3M8 11h.01"/>
                </svg>
                Areas to Improve
              </div>
              <ul className="class-analysis-list">
                {analysis.weaknesses.map((w, i) => <li key={i} dangerouslySetInnerHTML={{ __html: renderMarkdown(w) }} />)}
              </ul>
            </div>
          </div>
          {analysis.recommendations?.length > 0 && (
            <div className="class-analysis-card class-analysis-card--recommendations">
              <div className="class-analysis-card-label">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 2L10 6l4 .6-3 2.9.7 4L8 11.5 4.3 13.5l.7-4L2 6.6 6 6z"/>
                </svg>
                Recommendations
              </div>
              <ul className="class-analysis-list">
                {analysis.recommendations.map((r, i) => <li key={i} dangerouslySetInnerHTML={{ __html: renderMarkdown(r) }} />)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PerformanceTab({ classroomId, units, students }) {
  const [subtab, setSubtab] = useState('grades');
  return (
    <div className="performance-tab">
      <div className="classroom-tab-bar" style={{ marginBottom: 24 }}>
        {[{ key: 'grades', label: 'Class Performance' }, { key: 'insights', label: 'Strengths & Weaknesses' }].map(tab => (
          <button key={tab.key} onClick={() => setSubtab(tab.key)}
            className={`classroom-tab ${subtab === tab.key ? 'classroom-tab--active' : ''}`}>
            {tab.label}
          </button>
        ))}
      </div>
      {subtab === 'grades' && (
        <CourseQuizResultsModal
          key={`perf-${classroomId}`}
          isOpen={true}
          onClose={() => {}}
          units={units}
          students={students}
          inline={true}
        />
      )}
      {subtab === 'insights' && (
        <ClassAnalysisPanel classroomId={classroomId} />
      )}
    </div>
  );
}

export default function ClassroomView({ user }) {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const DEFAULT_TEACHER_SETTINGS = { show_course_stats: true };
  const { settings } = useSettings(DEFAULT_TEACHER_SETTINGS);

  const [classrooms, setClassrooms] = useState([]);
  const [classroom, setClassroom]   = useState(null);
  const [units, setUnits]           = useState([]);
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  const [activeTab, setActiveTab] = useState('units');
  const [studentSearch, setStudentSearch] = useState('');

  const [createOpen, setCreateOpen]   = useState(false);
  const [newUnit, setNewUnit]         = useState({ title: '', context: '', due_date: '' });
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving]         = useState(false);

  const [copied, setCopied] = useState(false);
  const classroomIndex = classrooms.findIndex(c => String(c.id) === String(classroomId));
  const courseAccentVariant = classroomIndex >= 0 ? classroomIndex % 5 : 0;

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
    function handleUnitsChanged()      { fetchAll(); }
    function handleClassroomsChanged() { fetchAll(); }
    window.addEventListener('epoch:units-changed', handleUnitsChanged);
    window.addEventListener('epoch:classrooms-changed', handleClassroomsChanged);
    return () => {
      window.removeEventListener('epoch:units-changed', handleUnitsChanged);
      window.removeEventListener('epoch:classrooms-changed', handleClassroomsChanged);
    };
  }, [classroomId]);

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
          <button onClick={() => navigate('/teacher')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, fontSize: 13, fontFamily: 'var(--font-body)', marginBottom: 18 }}>
            ← All Courses
          </button>

          <div className="page-header">
            <div className="page-header-left">
              <p className="page-eyebrow">Course</p>
              <h1 className="page-title">{classroom?.name}</h1>
            </div>
            {activeTab === 'units' && (
              <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>+ New Unit</button>
            )}
          </div>

          {settings.show_course_stats && (
            <div className="classroom-info-bar">
              <div className="classroom-info-item classroom-info-item--code">
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
                  {copied && <span style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>Copied!</span>}
                </div>
              </div>
              <div className="classroom-info-divider" />
              <div className="classroom-info-item">
                <span className="classroom-info-value">{units.length}</span>
                <span className="classroom-info-label">Units</span>
              </div>
              <div className="classroom-info-divider" />
              <div className="classroom-info-item">
                <span className="classroom-info-value">{units.filter(u => u.is_visible).length}</span>
                <span className="classroom-info-label">Published</span>
              </div>
              <div className="classroom-info-divider" />
              <div className="classroom-info-item">
                <span className="classroom-info-value">{students.length}</span>
                <span className="classroom-info-label">Students</span>
              </div>
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          {/* ── Tab bar ── */}
          <div className="classroom-tab-bar">
            <button
              className={`classroom-tab ${activeTab === 'units' ? 'classroom-tab--active' : ''}`}
              onClick={() => setActiveTab('units')}
            >
              Units
              <span className="classroom-tab-count">{units.length}</span>
            </button>
            <button
              className={`classroom-tab ${activeTab === 'students' ? 'classroom-tab--active' : ''}`}
              onClick={() => setActiveTab('students')}
            >
              Students
              <span className="classroom-tab-count">{students.length}</span>
            </button>
            <button
              className={`classroom-tab ${activeTab === 'performance' ? 'classroom-tab--active' : ''}`}
              onClick={() => setActiveTab('performance')}
            >
              Class Performance
            </button>
          </div>

          {/* ── Units tab ── */}
          {activeTab === 'units' && (
            units.length === 0 ? (
              <div className="empty-state">
                <h3>No units yet</h3>
                <p>Create your first unit to add notes, personas, quizzes, assignments and more for your students.</p>
                <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>Create Unit</button>
              </div>
            ) : (
              <div className="cards-grid">
                {units.map(unit => (
                  <UnitCard key={unit.id} unit={unit} role="teacher" onToggleVis={handleToggleVisibility} onDelete={setDeleteTarget} accentVariant={courseAccentVariant} />
                ))}
              </div>
            )
          )}

          {/* ── Students tab ── */}
          {activeTab === 'students' && (
            <div className="students-tab">
              <GradesTable classroomId={classroomId} className={classroom?.name || ''} />

              <div className="students-list-section">
                <div className="students-list-header">
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                    {students.length} Student{students.length !== 1 ? 's' : ''} enrolled
                  </span>
                  {students.length > 0 && (
                    <div className="students-search-wrap">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5l3 3"/>
                      </svg>
                      <input
                        className="students-search"
                        type="text"
                        placeholder="Search students…"
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {students.length === 0 ? (
                  <div className="empty-state" style={{ padding: '32px 0' }}>
                    <h3>No students yet</h3>
                    <p>Share the join code <strong>{classroom?.join_code}</strong> with your students.</p>
                  </div>
                ) : (
                  <div className="students-grid">
                    {students.filter(s => !studentSearch.trim() || s.display_name?.toLowerCase().includes(studentSearch.trim().toLowerCase())).map(s => {
                      const [fg, bg] = avatarColor(s.display_name);
                      return (
                        <div key={s.id} className="student-card">
                          <div className="student-card-avatar" style={{ background: bg, color: fg, border: `2px solid ${fg}33` }}>
                            {s.display_name?.[0]?.toUpperCase()}
                          </div>
                          <div className="student-card-info">
                            <span className="student-card-name">{s.display_name}</span>
                            <span className="student-card-meta">Joined {new Date(s.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          <button className="btn btn-danger" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setRemoveTarget(s)}>
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Class Performance tab ── */}
          {activeTab === 'performance' && (
            <PerformanceTab classroomId={classroomId} units={units} students={students} />
          )}
        </main>
      </div>

      {/* ── Modals ── */}
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

      <Modal isOpen={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove Student" size="sm"
        footer={<ModalActions onCancel={() => setRemoveTarget(null)} onConfirm={handleRemoveStudent} confirmLabel="Remove" danger loading={removing} />}>
        <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>
          Remove <strong>{removeTarget?.display_name}</strong> from <strong>{classroom?.name}</strong>? They will lose access to all units and their work will be deleted.
        </p>
      </Modal>
    </>
  );
}
