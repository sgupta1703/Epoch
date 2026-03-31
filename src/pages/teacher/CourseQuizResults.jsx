import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getQuizzes, getQuizById, getAllQuizResults, analyzeStudentQuiz, overrideSaGrades } from '../../api/quiz';
import { getAssignments, getAssignment, getAllAssignmentResults } from '../../api/assignments';
import { getPersonas, getAllPersonaQuizResults } from '../../api/personas';
import { renderMarkdown } from '../../utils/renderMarkdown';
import '../../styles/pages.css';
import './Teacher.css';

function scoreColor(score) {
  if (score === null || score === undefined) return 'var(--muted)';
  if (score >= 85) return '#1f6b53';
  if (score >= 70) return '#2a7a2a';
  if (score >= 40) return '#b8860b';
  return '#c0392b';
}


function scoreLabel(score) {
  return score === null || score === undefined ? '--' : `${score}%`;
}

function typeLabel(type) {
  if (type === 'multiple_choice') return 'Multiple Choice';
  if (type === 'essay') return 'Essay';
  return 'Short Answer';
}

function normalizeMcAnswer(answer) {
  return String(answer || '').trim().replace(/^[A-Z]\)\s*/i, '').replace(/^[A-Z][.: -]+\s*/i, '').replace(/\s+/g, ' ').toLowerCase();
}

function rowAverage(scores) {
  const valid = scores.filter(s => s !== null && s !== undefined);
  if (!valid.length) return null;
  return Math.round(valid.reduce((sum, s) => sum + s, 0) / valid.length);
}

function statValue(score) {
  return score === null || score === undefined ? '--' : `${score}%`;
}

function formatSubmittedAt(submission) {
  const raw = submission?.submitted_at || submission?.created_at;
  if (!raw) return 'Not submitted';
  return new Date(raw).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function studentInitial(name) {
  return name?.trim()?.[0]?.toUpperCase() || '?';
}

// Each unitEntry has quizEntries, assignmentEntries, personaQuizEntries
function buildOverviewRows(unitEntries, students) {
  return students.map(student => {
    const cells = unitEntries.flatMap(entry => [
      ...entry.quizEntries.map(qe => ({
        kind: 'quiz',
        unitId: entry.unit.id,
        quizId: qe.quiz.id,
        quizName: qe.quiz.name,
        score: qe.submissionMap.get(student.id)?.score ?? null,
        hasSubmission: qe.submissionMap.has(student.id),
      })),
      ...entry.assignmentEntries.map(ae => ({
        kind: 'assignment',
        unitId: entry.unit.id,
        assignmentId: ae.assignment.id,
        assignmentName: ae.assignment.name,
        score: ae.submissionMap.get(student.id)?.score ?? null,
        hasSubmission: ae.submissionMap.has(student.id),
      })),
      ...(entry.personaQuizEntries || []).map(pe => ({
        kind: 'persona_quiz',
        unitId: entry.unit.id,
        personaId: pe.persona.id,
        personaName: pe.persona.name,
        score: pe.submissionMap.get(student.id)?.score ?? null,
        hasSubmission: pe.submissionMap.has(student.id),
      })),
    ]);

    return {
      student,
      cells,
      average: rowAverage(cells.map(c => c.score)),
      completedCount: cells.filter(c => c.hasSubmission).length,
    };
  });
}

function buildSummary(unitEntries, rows) {
  const allScores = rows.flatMap(row => row.cells.map(c => c.score)).filter(s => s !== null && s !== undefined);
  const completed = rows.reduce((sum, row) => sum + row.completedCount, 0);
  const totalPossible = rows.reduce((sum, row) => sum + row.cells.length, 0);
  const highest = rows.reduce((best, row) => {
    if (row.average === null || row.average === undefined) return best;
    if (!best || row.average > best.average) return row;
    return best;
  }, null);

  const gradedItems = unitEntries.reduce((sum, entry) =>
    sum + entry.quizEntries.length + entry.assignmentEntries.length + (entry.personaQuizEntries || []).length, 0);

  return {
    classAverage: allScores.length ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length) : null,
    completionRate: totalPossible ? Math.round((completed / totalPossible) * 100) : null,
    topStudent: highest,
    gradedItems,
  };
}

function findSubmission(submission, questionId, index, field) {
  return submission?.[field]?.find(item => item.question_id === questionId) ?? submission?.[field]?.[index];
}

function SaOverrideForm({ questionId, current, onSave, onCancel, disabled }) {
  const [score, setScore] = useState(current?.score ?? '');
  const [feedback, setFeedback] = useState(current?.feedback ?? '');
  const [error, setError] = useState('');

  function handleSubmit() {
    const value = Number(score);
    if (score === '' || Number.isNaN(value) || value < 0 || value > 100) { setError('Score must be between 0 and 100.'); return; }
    onSave({ question_id: questionId, score: value, feedback });
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, background: '#fff' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Score</label>
        <input type="number" min={0} max={100} value={score} onChange={e => { setScore(e.target.value); setError(''); }} style={{ width: 92, marginBottom: 0 }} autoFocus />
        {error && <span style={{ fontSize: 12, color: '#c0392b' }}>{error}</span>}
      </div>
      <textarea rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Feedback for the student" style={{ marginBottom: 12 }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-ghost" onClick={onCancel} disabled={disabled}>Cancel</button>
        <button className="btn btn-dark" onClick={handleSubmit} disabled={disabled}>{disabled ? 'Saving...' : 'Save Grade'}</button>
      </div>
    </div>
  );
}

export default function CourseQuizResultsModal({ isOpen, onClose, units, students, inline = false }) {
  const [unitEntries, setUnitEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('overview');
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(null);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideError, setOverrideError] = useState('');
  const [search, setSearch] = useState('');
  const [contentFilter, setContentFilter] = useState('all');

  useEffect(() => {
    if (!isOpen) return;
    setView('overview');
    setSelectedDetail(null);
    setAnalysis(null);
    setAnalysisError('');
    setOverrideOpen(null);
    setOverrideError('');
    setSearch('');
    setContentFilter('all');
    setSelectedStudentId(null);
    loadAll();
  }, [isOpen]);

  async function loadAll() {
    setLoading(true);
    try {
      const enrolledIds = new Set(students.map(s => s.id));
      const loaded = await Promise.all(units.map(async unit => {
        const [quizzesResult, assignmentsResult, personasResult] = await Promise.allSettled([
          getQuizzes(unit.id),
          getAssignments(unit.id),
          getPersonas(unit.id),
        ]);

        const quizzesList = quizzesResult.status === 'fulfilled' ? (quizzesResult.value.quizzes || []) : [];
        const assignmentsList = assignmentsResult.status === 'fulfilled' ? (assignmentsResult.value.assignments || []) : [];
        const personasList = personasResult.status === 'fulfilled' ? (personasResult.value.personas || []) : [];

        // For each quiz with questions, load its submissions
        const quizEntries = await Promise.all(
          quizzesList
            .filter(q => q.question_count > 0)
            .map(async quiz => {
              try {
                const { submissions } = await getAllQuizResults(unit.id, quiz.id);
                const filtered = (submissions || []).filter(s => enrolledIds.has(s.student_id));
                return { quiz, submissions: filtered, submissionMap: new Map(filtered.map(s => [s.student_id, s])) };
              } catch {
                return { quiz, submissions: [], submissionMap: new Map() };
              }
            })
        );

        // For each assignment with questions, load its submissions
        const assignmentEntries = await Promise.all(
          assignmentsList
            .filter(a => a.question_count > 0)
            .map(async assignment => {
              try {
                const { submissions } = await getAllAssignmentResults(unit.id, assignment.id);
                const filtered = (submissions || []).filter(s => enrolledIds.has(s.student_id));
                return { assignment, submissions: filtered, submissionMap: new Map(filtered.map(s => [s.student_id, s])) };
              } catch {
                return { assignment, submissions: [], submissionMap: new Map() };
              }
            })
        );

        // For each quiz-mode persona, load persona quiz submissions
        const personaQuizEntries = await Promise.all(
          personasList
            .filter(p => p.mode === 'quiz')
            .map(async persona => {
              try {
                const { submissions } = await getAllPersonaQuizResults(persona.id);
                const filtered = (submissions || []).filter(s => enrolledIds.has(s.student_id));
                return { persona, submissions: filtered, submissionMap: new Map(filtered.map(s => [s.student_id, s])) };
              } catch {
                return { persona, submissions: [], submissionMap: new Map() };
              }
            })
        );

        return { unit, quizEntries, assignmentEntries, personaQuizEntries };
      }));

      setUnitEntries(loaded.filter(entry =>
        entry.quizEntries.length > 0 || entry.assignmentEntries.length > 0 || entry.personaQuizEntries.length > 0
      ));
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(student, entry, kind, itemId = null) {
    let submission, content;
    if (kind === 'quiz') {
      const qe = entry.quizEntries.find(qe => qe.quiz.id === itemId);
      submission = qe?.submissionMap.get(student.id);
      if (!submission) return;
      setDetailLoading(true);
      setView('detail');
      try {
        const { quiz } = await getQuizById(entry.unit.id, itemId);
        content = quiz;
      } catch {
        content = qe?.quiz;
      } finally {
        setDetailLoading(false);
      }
    } else {
      const ae = entry.assignmentEntries.find(ae => ae.assignment.id === itemId);
      submission = ae?.submissionMap.get(student.id);
      if (!submission) return;
      setDetailLoading(true);
      setView('detail');
      try {
        const { assignment } = await getAssignment(entry.unit.id, itemId);
        content = assignment;
      } catch {
        content = ae?.assignment;
      } finally {
        setDetailLoading(false);
      }
    }

    setSelectedDetail({ student, entry, kind, quizId: kind === 'quiz' ? itemId : null, assignmentId: kind === 'assignment' ? itemId : null, submission, content });
    setAnalysis(null);
    setAnalysisError('');
    setOverrideOpen(null);
    setOverrideError('');
  }

  function updateSelectedQuizSubmission(nextSubmission) {
    if (!selectedDetail || selectedDetail.kind !== 'quiz') return;
    setSelectedDetail(detail => ({ ...detail, submission: nextSubmission }));
    setUnitEntries(entries => entries.map(entry => {
      if (entry.unit.id !== selectedDetail.entry.unit.id) return entry;
      const quizEntries = entry.quizEntries.map(qe => {
        if (qe.quiz.id !== selectedDetail.quizId) return qe;
        const submissions = qe.submissions.map(s => s.id === nextSubmission.id ? { ...s, ...nextSubmission } : s);
        return { ...qe, submissions, submissionMap: new Map(submissions.map(s => [s.student_id, s])) };
      });
      return { ...entry, quizEntries };
    }));
  }

  async function handleAnalyze() {
    if (!selectedDetail || selectedDetail.kind !== 'quiz') return;
    setAnalyzing(true); setAnalysis(null); setAnalysisError('');
    try {
      const { analysis: nextAnalysis } = await analyzeStudentQuiz(
        selectedDetail.entry.unit.id,
        selectedDetail.quizId,
        selectedDetail.student.id,
      );
      setAnalysis(nextAnalysis);
    } catch (error) {
      setAnalysisError(error.response?.data?.error || 'Analysis failed. Try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSaveOverride(payload) {
    if (!selectedDetail || selectedDetail.kind !== 'quiz') return;
    setOverrideSaving(true); setOverrideError('');
    try {
      const { submission } = await overrideSaGrades(
        selectedDetail.entry.unit.id,
        selectedDetail.quizId,
        selectedDetail.submission.id,
        [payload],
      );
      updateSelectedQuizSubmission(submission);
      setOverrideOpen(null);
    } catch (error) {
      setOverrideError(error.response?.data?.error || 'Failed to save grade.');
    } finally {
      setOverrideSaving(false);
    }
  }

  const overviewRows = useMemo(() => buildOverviewRows(unitEntries, students), [unitEntries, students]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return overviewRows.filter(row => !query || row.student.display_name?.toLowerCase().includes(query));
  }, [overviewRows, search]);
  const summary = useMemo(() => buildSummary(unitEntries, overviewRows), [unitEntries, overviewRows]);
  const effectiveSelectedStudentId = useMemo(() => {
    if (!filteredRows.length) return null;
    return filteredRows.some(row => row.student.id === selectedStudentId)
      ? selectedStudentId
      : filteredRows[0].student.id;
  }, [filteredRows, selectedStudentId]);

  const title = view === 'detail' && selectedDetail
    ? `${selectedDetail.student.display_name} — ${selectedDetail.entry.unit.title}`
    : 'Class Performance';

  const content = loading ? (
    <LoadingSpinner fullPage label="Loading class performance..." />
  ) : view === 'detail' ? (
    detailLoading ? (
      <LoadingSpinner fullPage label="Loading submission..." />
    ) : selectedDetail ? (
      <DetailView
        detail={selectedDetail}
        analysis={analysis}
        analysisError={analysisError}
        analyzing={analyzing}
        overrideError={overrideError}
        overrideOpen={overrideOpen}
        overrideSaving={overrideSaving}
        onAnalyze={handleAnalyze}
        onBack={() => { setView('overview'); setSelectedDetail(null); setAnalysis(null); setAnalysisError(''); setOverrideOpen(null); setOverrideError(''); }}
        onSaveOverride={handleSaveOverride}
        onSetOverrideOpen={setOverrideOpen}
        onClearOverrideError={() => setOverrideError('')}
      />
    ) : null
  ) : (
    <OverviewView
      unitEntries={unitEntries}
      rows={filteredRows}
      summary={summary}
      search={search}
      contentFilter={contentFilter}
      selectedStudentId={effectiveSelectedStudentId}
      onSearchChange={setSearch}
      onFilterChange={setContentFilter}
      onSelectStudent={setSelectedStudentId}
      onOpenDetail={openDetail}
    />
  );

  if (inline) {
    return <div className="course-quiz-results-inline">{content}</div>;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xxl">
      {content}
    </Modal>
  );
}

function OverviewView({ unitEntries, rows, summary, search, contentFilter, selectedStudentId, onSearchChange, onFilterChange, onSelectStudent, onOpenDetail }) {
  if (!unitEntries.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">[ ]</div>
        <h3>No graded work yet</h3>
        <p>Create quizzes or assignments in your units to see class performance here.</p>
      </div>
    );
  }

  const showQuiz = contentFilter === 'all' || contentFilter === 'quiz';
  const showAssignment = contentFilter === 'all' || contentFilter === 'assignment';
  const visibleUnits = unitEntries.filter(entry =>
    (showQuiz && (entry.quizEntries.length > 0 || (entry.personaQuizEntries || []).length > 0)) ||
    (showAssignment && entry.assignmentEntries.length > 0)
  );
  const selectedRow = rows.find(row => row.student.id === selectedStudentId) || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <SummaryCard label="Class Average" value={statValue(summary.classAverage)} tone={scoreColor(summary.classAverage)} />
        <SummaryCard label="Completion" value={statValue(summary.completionRate)} tone="var(--ink)" />
        <SummaryCard label="Graded Items" value={String(summary.gradedItems)} tone="var(--ink)" />
        <SummaryCard
          label="Top Student"
          value={summary.topStudent?.student.display_name || '--'}
          helper={summary.topStudent?.average !== null && summary.topStudent?.average !== undefined ? `${summary.topStudent.average}% average` : 'No averages yet'}
          tone="var(--ink)"
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'linear-gradient(180deg, #fffdf9 0%, #f6f0e8 100%)', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 260, flex: '1 1 280px' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: 6 }}>Class Performance</div>
          <div style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.6 }}>
            Pick a student to see unit-by-unit quiz and assignment performance.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
          <div className="students-search-wrap">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5l3 3"/>
            </svg>
            <input className="students-search" type="text" value={search} onChange={e => onSearchChange(e.target.value)} placeholder="Search students…" />
          </div>
          <div style={{ display: 'inline-flex', padding: 4, background: '#fff', border: '1px solid var(--border)', borderRadius: 999 }}>
            {[{ key: 'all', label: 'All Work' }, { key: 'quiz', label: 'Quizzes' }, { key: 'assignment', label: 'Assignments' }].map(option => (
              <button key={option.key} onClick={() => onFilterChange(option.key)}
                style={{ border: 'none', borderRadius: 999, padding: '8px 14px', background: contentFilter === option.key ? 'var(--ink)' : 'transparent', color: contentFilter === option.key ? '#fff' : 'var(--muted)', fontSize: 12, fontWeight: 700, letterSpacing: '0.03em', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 18, minHeight: 560 }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 14, background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: '#f7f2ea' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)' }}>Students</div>
            <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 4 }}>{rows.length} shown</div>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 620 }}>
            {rows.length === 0 ? (
              <div style={{ padding: 24, color: 'var(--muted)', textAlign: 'center' }}>No students matched that search.</div>
            ) : rows.map(row => {
              const active = row.student.id === selectedStudentId;
              return (
                <button key={row.student.id} onClick={() => onSelectStudent(row.student.id)}
                  style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border)', background: active ? '#fdf4ee' : '#fff', padding: '14px 16px', textAlign: 'left', cursor: 'pointer', borderLeft: active ? '4px solid var(--rust)' : '4px solid transparent', fontFamily: 'var(--font-body)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', background: active ? '#f4c8ab' : '#f4ede2', color: 'var(--ink)', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      {studentInitial(row.student.display_name)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.student.display_name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                        <span>{row.completedCount} submitted</span>
                        <span style={{ color: scoreColor(row.average), fontWeight: 700 }}>{scoreLabel(row.average)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 14, background: '#fff', padding: 18, minWidth: 0 }}>
          {!selectedRow ? (
            <div className="quiz-results-empty"><p style={{ color: 'var(--muted)', fontSize: 14 }}>Select a student to view performance.</p></div>
          ) : (
            <StudentOverviewBoard row={selectedRow} unitEntries={visibleUnits} showQuiz={showQuiz} showAssignment={showAssignment} onOpenDetail={onOpenDetail} />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailView({ detail, analysis, analysisError, analyzing, overrideError, overrideOpen, overrideSaving, onAnalyze, onBack, onSaveOverride, onSetOverrideOpen, onClearOverrideError }) {
  const { student, entry, kind, content, submission } = detail;
  const questions = content?.questions || [];
  const sources = kind === 'assignment' ? content?.sources || [] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, fontSize: 13, fontFamily: 'var(--font-body)' }}>
        <span aria-hidden="true">&lt;</span> Back to class performance
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: kind === 'assignment' && sources.length > 0 ? 'minmax(0, 1.4fr) minmax(280px, 0.8fr)' : '1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 20, background: '#fff', minWidth: 0 }}>
          <div className="quiz-results-detail-header" style={{ marginBottom: 18 }}>
            <div>
              <div className="quiz-results-detail-name">{student.display_name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                {entry.unit.title} — {kind === 'quiz' ? content?.name || 'Quiz' : content?.name || 'Assignment'}<br />
                Submitted {formatSubmittedAt(submission)}
              </div>
            </div>
            <div className="quiz-results-detail-score" style={{ color: scoreColor(submission.score) }}>
              {scoreLabel(submission.score)}
            </div>
          </div>

          {kind === 'quiz' && (
            <div style={{ marginBottom: 18 }}>
              <button className="btn btn-primary" onClick={onAnalyze} disabled={analyzing} style={{ width: '100%', justifyContent: 'center' }}>
                {analyzing ? <><LoadingSpinner size="sm" /> Analyzing performance...</> : 'Analyze with AI'}
              </button>
              {analysisError && <div className="alert alert-error" style={{ marginTop: 10 }}>{analysisError}</div>}
            </div>
          )}

          {analysis && kind === 'quiz' && (
            <div className="quiz-analysis-panel">
              <div className="quiz-analysis-summary quiz-analysis-copy--markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis.summary) }} />
              <div className="quiz-analysis-section">
                <div className="quiz-analysis-section-label quiz-analysis-section-label--good">Strengths</div>
                <ul className="quiz-analysis-list">
                  {analysis.strengths.map((item, i) => <li key={i} className="quiz-analysis-copy--markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(item) }} />)}
                </ul>
              </div>
              <div className="quiz-analysis-section">
                <div className="quiz-analysis-section-label quiz-analysis-section-label--improve">Needs Work</div>
                <ul className="quiz-analysis-list">
                  {analysis.improvements.map((item, i) => <li key={i} className="quiz-analysis-copy--markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(item) }} />)}
                </ul>
              </div>
              <div className="quiz-analysis-recommendation">
                <span style={{ fontWeight: 700, color: 'var(--ink)' }}>Recommendation:</span>{' '}
                <span className="quiz-analysis-copy--markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis.recommendation) }} />
              </div>
            </div>
          )}

          {overrideError && kind === 'quiz' && <div className="alert alert-error" style={{ marginBottom: 12 }}>{overrideError}</div>}

          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 14, color: 'var(--ink)' }}>
            {kind === 'quiz' ? 'Quiz Submission' : 'Assignment Submission'}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {questions.map((question, index) => {
              const studentAnswer = findSubmission(submission, question.id, index, 'answers');
              const mcResult = findSubmission(submission, question.id, index, 'mc_results');
              const saResult = findSubmission(submission, question.id, index, 'sa_feedback');
              const essayResult = findSubmission(submission, question.id, index, 'essay_feedback');
              const isMC = question.type === 'multiple_choice';
              const isEssay = question.type === 'essay';
              const isSA = question.type === 'short_answer';
              const isCorrect = isMC && (mcResult?.correct ?? (normalizeMcAnswer(studentAnswer?.answer) !== '' && normalizeMcAnswer(studentAnswer?.answer) === normalizeMcAnswer(mcResult?.correct_answer || question.correct_answer)));

              return (
                <div key={question.id || index} className="quiz-results-question-item" style={{ borderRadius: 10, marginBottom: 0 }}>
                  <div className="quiz-results-question-meta" style={{ gap: 10, flexWrap: 'wrap' }}>
                    <span>Q{index + 1} - {typeLabel(question.type)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {isMC && <span style={{ fontSize: 11, fontWeight: 700, color: isCorrect ? '#2a7a2a' : '#c0392b' }}>{isCorrect ? 'Correct' : 'Incorrect'}</span>}
                      {isSA && saResult?.score !== null && saResult?.score !== undefined && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(saResult.score) }}>
                          {saResult.score}%{saResult.teacher_graded ? ' teacher graded' : ''}
                        </span>
                      )}
                      {isEssay && essayResult?.score !== null && essayResult?.score !== undefined && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(essayResult.score) }}>{essayResult.score}%</span>
                      )}
                      {kind === 'quiz' && isSA && overrideOpen !== question.id && (
                        <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}
                          onClick={() => { onSetOverrideOpen(question.id); onClearOverrideError(); }} disabled={overrideSaving}>
                          {saResult ? 'Override Grade' : 'Add Grade'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="quiz-question-text quiz-question-text--markdown" style={{ fontSize: 14, marginBottom: 10 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(question.question_text) }} />

                  <AnswerPanel label={kind === 'assignment' && isEssay ? 'Student essay' : 'Student response'}>
                    {studentAnswer?.answer || '--'}
                  </AnswerPanel>

                  {isMC && !isCorrect && (mcResult?.correct_answer || question.correct_answer) && (
                    <AnswerPanel label="Correct answer" tone="#eaf6ea" textColor="#1f6b53">
                      {mcResult?.correct_answer || question.correct_answer}
                    </AnswerPanel>
                  )}

                  {isSA && saResult?.feedback && overrideOpen !== question.id && <FeedbackPanel score={saResult.score}>{saResult.feedback}</FeedbackPanel>}

                  {kind === 'quiz' && isSA && overrideOpen === question.id && (
                    <SaOverrideForm questionId={question.id} current={saResult} onSave={onSaveOverride} onCancel={() => onSetOverrideOpen(null)} disabled={overrideSaving} />
                  )}

                  {isEssay && essayResult && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                      {essayResult.breakdown && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          {Object.entries(essayResult.breakdown).map(([key, val]) => (
                            <div key={key} className="essay-breakdown-cell">
                              <div className="essay-breakdown-label">{key}</div>
                              <div className="essay-breakdown-score" style={{ color: scoreColor(val * 4) }}>{val}<span className="essay-breakdown-denom">/25</span></div>
                            </div>
                          ))}
                        </div>
                      )}
                      {essayResult.feedback && <FeedbackPanel score={essayResult.score}>{essayResult.feedback}</FeedbackPanel>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right sidebar */}
        {kind === 'assignment' && sources.length > 0 && (
          <SideCard title={`Sources · ${sources.length}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {sources.map((source, i) => (
                <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                  <div style={{ padding: '14px 16px', background: 'linear-gradient(180deg, #f7f2ea 0%, #f2ebe0 100%)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--ink)', lineHeight: 1.4, marginBottom: 8 }}>{source.title}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 999, background: source.source_type === 'primary' ? '#dbeafe' : '#fef3cd', color: source.source_type === 'primary' ? '#1e4d8c' : '#7a5c00' }}>
                        {source.source_type === 'primary' ? 'Primary Source' : 'Secondary Source'}
                      </span>
                      {source.format === 'ai_generated' && (
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 999, background: '#ede8dc', color: '#7a4d00' }}>AI Generated</span>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: '14px 16px', fontSize: 13, lineHeight: 1.85, color: 'var(--ink)', whiteSpace: 'pre-wrap', maxHeight: 260, overflowY: 'auto' }}>
                    {source.content}
                  </div>
                  {i < sources.length - 1 && <div style={{ height: 0 }} />}
                </div>
              ))}
            </div>
          </SideCard>
        )}
      </div>
    </div>
  );
}

function StudentOverviewBoard({ row, unitEntries, showQuiz, showAssignment, onOpenDetail }) {
  const [openUnits, setOpenUnits] = useState(new Set());

  function toggleUnit(unitId) {
    setOpenUnits(prev => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId); else next.add(unitId);
      return next;
    });
  }

  const allQuizScores = unitEntries.flatMap(e => [
    ...e.quizEntries.map(qe => qe.submissionMap.get(row.student.id)?.score),
    ...(e.personaQuizEntries || []).map(pe => pe.submissionMap.get(row.student.id)?.score),
  ]).filter(s => s !== null && s !== undefined);
  const assignmentScores = unitEntries.flatMap(e => e.assignmentEntries.map(ae => ae.submissionMap.get(row.student.id)?.score)).filter(s => s !== null && s !== undefined);
  const quizAverage = allQuizScores.length ? Math.round(allQuizScores.reduce((s, v) => s + v, 0) / allQuizScores.length) : null;
  const assignmentAverage = assignmentScores.length ? Math.round(assignmentScores.reduce((s, v) => s + v, 0) / assignmentScores.length) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: 6 }}>Student Overview</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink)' }}>{row.student.display_name}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
            {row.completedCount} submitted items across {unitEntries.length} unit{unitEntries.length === 1 ? '' : 's'}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))', gap: 10, flex: '1 1 420px' }}>
          <MiniStatCard label="Overall" value={scoreLabel(row.average)} tone={scoreColor(row.average)} />
          <MiniStatCard label="Quiz Avg" value={scoreLabel(quizAverage)} tone={scoreColor(quizAverage)} />
          <MiniStatCard label="Assignment Avg" value={scoreLabel(assignmentAverage)} tone={scoreColor(assignmentAverage)} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {unitEntries.map(entry => {
          const visibleQuizEntries = showQuiz ? entry.quizEntries : [];
          const visibleAssignmentEntries = showAssignment ? entry.assignmentEntries : [];
          if (visibleQuizEntries.length === 0 && visibleAssignmentEntries.length === 0 && (entry.personaQuizEntries || []).length === 0) return null;
          const isOpen = openUnits.has(entry.unit.id);

          // Score summary for collapsed header
          const unitQuizScores = visibleQuizEntries.map(qe => qe.submissionMap.get(row.student.id)?.score).filter(s => s !== null && s !== undefined);
          const unitPersonaQuizScores = (entry.personaQuizEntries || []).map(pe => pe.submissionMap.get(row.student.id)?.score).filter(s => s !== null && s !== undefined);
          const unitAsgnScores = visibleAssignmentEntries.map(ae => ae.submissionMap.get(row.student.id)?.score).filter(s => s !== null && s !== undefined);
          const allUnitScores = [...unitQuizScores, ...unitPersonaQuizScores, ...unitAsgnScores];
          const unitAvg = allUnitScores.length ? Math.round(allUnitScores.reduce((s, v) => s + v, 0) / allUnitScores.length) : null;
          const submittedCount = visibleQuizEntries.filter(qe => qe.submissionMap.has(row.student.id)).length + visibleAssignmentEntries.filter(ae => ae.submissionMap.has(row.student.id)).length + (entry.personaQuizEntries || []).filter(pe => pe.submissionMap.has(row.student.id)).length;
          const totalCount = visibleQuizEntries.length + visibleAssignmentEntries.length + (entry.personaQuizEntries || []).length;

          const visiblePersonaQuizEntries = showQuiz ? (entry.personaQuizEntries || []) : [];

          return (
            <div key={entry.unit.id} style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: '#fcfaf6' }}>
              <button
                onClick={() => toggleUnit(entry.unit.id)}
                style={{ width: '100%', border: 'none', background: '#f7f2ea', padding: '13px 16px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--font-body)', borderBottom: isOpen ? '1px solid var(--border)' : 'none' }}
              >
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--ink)', flex: 1 }}>{entry.unit.title}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{submittedCount}/{totalCount} submitted</span>
                {unitAvg !== null && <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(unitAvg), minWidth: 38, textAlign: 'right' }}>{unitAvg}%</span>}
                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div style={{ padding: 14 }}>
                  {visibleQuizEntries.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', padding: '0 6px' }}>Quizzes</span>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>
                  )}

                  {visibleQuizEntries.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(visibleQuizEntries.length, 3)}, minmax(0, 1fr))`, gap: 12 }}>
                      {visibleQuizEntries.map(qe => (
                        <SubmissionOverviewCard
                          key={qe.quiz.id}
                          label={qe.quiz.name}
                          submission={qe.submissionMap.get(row.student.id)}
                          accent="#dbeafe"
                          accentColor="#1e4d8c"
                          onOpen={() => onOpenDetail(row.student, entry, 'quiz', qe.quiz.id)}
                        />
                      ))}
                    </div>
                  )}

                  {visiblePersonaQuizEntries.length > 0 && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: `${visibleQuizEntries.length > 0 ? '14px' : '0'} 0 12px` }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', padding: '0 6px' }}>Persona Quizzes</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(visiblePersonaQuizEntries.length, 3)}, minmax(0, 1fr))`, gap: 12 }}>
                        {visiblePersonaQuizEntries.map(pe => (
                          <SubmissionOverviewCard
                            key={pe.persona.id}
                            label={pe.persona.name}
                            submission={pe.submissionMap.get(row.student.id)}
                            accent="#ede9fe"
                            accentColor="#5b21b6"
                            onOpen={null}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {(visibleQuizEntries.length > 0 || visiblePersonaQuizEntries.length > 0) && visibleAssignmentEntries.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 12px' }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', padding: '0 6px' }}>Assignments</span>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>
                  )}

                  {visibleAssignmentEntries.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(visibleAssignmentEntries.length, 3)}, minmax(0, 1fr))`, gap: 12 }}>
                      {visibleAssignmentEntries.map(ae => (
                        <SubmissionOverviewCard
                          key={ae.assignment.id}
                          label={ae.assignment.name}
                          submission={ae.submissionMap.get(row.student.id)}
                          accent="#fef3cd"
                          accentColor="#7a5c00"
                          onOpen={() => onOpenDetail(row.student, entry, 'assignment', ae.assignment.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubmissionOverviewCard({ label, submission, accent, accentColor, onOpen }) {
  const submitted = !!submission;
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: '#fff', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: accentColor, background: accent, padding: '5px 8px', borderRadius: 999, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(submission?.score) }}>{scoreLabel(submission?.score)}</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, minHeight: 42 }}>
        {submitted ? `Submitted ${formatSubmittedAt(submission)}` : 'No submission yet'}
      </div>
      {onOpen !== null && (
        <button className="btn btn-ghost" onClick={onOpen} disabled={!submitted} style={{ justifyContent: 'center', opacity: submitted ? 1 : 0.55 }}>
          {submitted ? 'Open Submission' : 'Awaiting Submission'}
        </button>
      )}
    </div>
  );
}

function MiniStatCard({ label, value, tone }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', background: '#fcfaf6' }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: tone || 'var(--ink)' }}>{value}</div>
    </div>
  );
}

function SummaryCard({ label, value, helper, tone }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', background: '#fff', boxShadow: '0 10px 24px rgba(46, 34, 25, 0.05)' }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: tone || 'var(--ink)', lineHeight: 1.05 }}>{value}</div>
      {helper && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>{helper}</div>}
    </div>
  );
}

function SideCard({ title, children }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: '#f7f2ea' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink)' }}>{title}</div>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function AnswerPanel({ label, children, tone = 'var(--cream)', textColor = 'var(--ink)' }) {
  return (
    <div style={{ background: tone, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: textColor, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 8 }}>
      <span style={{ fontWeight: 600, display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, opacity: 0.7 }}>{label}</span>
      {children}
    </div>
  );
}

function FeedbackPanel({ score, children }) {
  return (
    <div style={{ fontSize: 13, color: 'var(--ink)', background: '#fff', border: '1px solid var(--border)', borderLeft: `3px solid ${scoreColor(score ?? 0)}`, padding: '10px 14px', borderRadius: '0 6px 6px 0', lineHeight: 1.7 }}>
      💬 {children}
    </div>
  );
}
