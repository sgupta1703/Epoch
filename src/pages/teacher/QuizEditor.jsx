import { useState, useEffect } from 'react';
import Modal, { ModalActions } from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import AppDatePicker from '../../components/AppDatePicker';
import {
  getQuizzes, createQuiz, getQuizById, updateQuizMeta,
  deleteQuiz, generateQuiz, saveQuizQuestions,
  getAllQuizResults, analyzeStudentQuiz, overrideSaGrades,
} from '../../api/quiz';
import { renderMarkdown } from '../../utils/renderMarkdown';
import '../../styles/pages.css';
import './Teacher.css';

const BLANK_QUESTION = {
  question_text: '',
  type: 'multiple_choice',
  options: ['', '', '', ''],
  correct_answer: '',
};

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

function typeLabel(type) {
  if (type === 'multiple_choice') return 'Multiple Choice';
  if (type === 'essay') return 'Essay';
  return 'Short Answer';
}

function typeBadgeClass(type) {
  if (type === 'multiple_choice') return 'quiz-question-type--mc';
  if (type === 'essay') return 'quiz-question-type--essay';
  return 'quiz-question-type--sa';
}

function SaOverrideForm({ questionId, current, onSave, onCancel }) {
  const [score, setScore] = useState(current?.score ?? '');
  const [feedback, setFeedback] = useState(current?.feedback ?? '');
  const [err, setErr] = useState('');

  function handleSubmit() {
    const n = Number(score);
    if (score === '' || isNaN(n) || n < 0 || n > 100) { setErr('Score must be 0–100.'); return; }
    onSave({ question_id: questionId, score: n, feedback });
  }

  return (
    <div className="sa-override-form">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>Score (0–100)</label>
        <input type="number" min={0} max={100} value={score} onChange={e => { setScore(e.target.value); setErr(''); }}
          style={{ width: 72, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 13 }} autoFocus />
        {err && <span style={{ fontSize: 11, color: '#c0392b' }}>{err}</span>}
      </div>
      <textarea rows={2} value={feedback} onChange={e => setFeedback(e.target.value)}
        placeholder="Feedback for the student (optional)…"
        style={{ width: '100%', fontSize: 12, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 4, resize: 'vertical', lineHeight: 1.5, fontFamily: 'var(--font-body)', boxSizing: 'border-box', marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={onCancel}>Cancel</button>
        <button className="btn btn-dark" style={{ fontSize: 12, padding: '5px 12px' }} onClick={handleSubmit}>Save Grade</button>
      </div>
    </div>
  );
}

// ─── QUIZ LIST VIEW ───────────────────────────────────────────────────────────

function QuizListView({ unit, onSelectQuiz }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createContext, setCreateContext] = useState('');
  const [createDueDate, setCreateDueDate] = useState('');
  const [createError, setCreateError] = useState('');

  useEffect(() => { if (unit?.id) fetchQuizzes(); }, [unit?.id]);

  async function fetchQuizzes() {
    setLoading(true);
    try {
      const { quizzes } = await getQuizzes(unit.id);
      setQuizzes(quizzes || []);
    } catch { setError('Failed to load quizzes.'); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!createName.trim()) { setCreateError('Quiz name is required.'); return; }
    setCreating(true); setCreateError('');
    try {
      const { quiz } = await createQuiz(unit.id, {
        name: createName.trim(),
        context: createContext.trim() || null,
        due_date: createDueDate || null,
      });
      setShowCreateForm(false);
      setCreateName(''); setCreateContext(''); setCreateDueDate('');
      onSelectQuiz(quiz.id);
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create quiz.');
    } finally { setCreating(false); }
  }

  async function handleDelete(quizId, e) {
    e.stopPropagation();
    if (!window.confirm('Delete this quiz and all student submissions? This cannot be undone.')) return;
    setDeleting(quizId);
    try {
      await deleteQuiz(unit.id, quizId);
      setQuizzes(qs => qs.filter(q => q.id !== quizId));
    } catch { setError('Failed to delete quiz.'); }
    finally { setDeleting(null); }
  }

  if (loading) return <LoadingSpinner fullPage label="Loading quizzes…" />;

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)', margin: 0 }}>Quizzes</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
            {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} for this unit
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowCreateForm(true); setCreateError(''); setCreateName(''); setCreateContext(''); setCreateDueDate(''); }}>
          + New Quiz
        </button>
      </div>

      {showCreateForm && (
        <div style={{ border: '2px solid var(--rust)', borderRadius: 10, padding: 20, marginBottom: 20, background: '#fffdf9' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink)', marginBottom: 16 }}>New Quiz</div>
          {createError && <div className="alert alert-error">{createError}</div>}
          <div className="field">
            <label>Quiz Name <span style={{ color: '#c0392b' }}>*</span></label>
            <input type="text" value={createName} onChange={e => setCreateName(e.target.value)}
              placeholder="e.g. Unit 3 Review, Napoleon's Rise to Power…" autoFocus />
          </div>
          <div className="field">
            <label>
              Quiz Focus <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>(optional — used when generating questions with AI)</span>
            </label>
            <textarea rows={3} value={createContext} onChange={e => setCreateContext(e.target.value)}
              placeholder="Specific topics for this quiz, e.g. 'Focus on Napoleon's military campaigns.' Leave blank to use the full unit context." />
          </div>
          <div className="field">
            <label>Due Date <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
            <AppDatePicker value={createDueDate} onChange={val => setCreateDueDate(val)} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setShowCreateForm(false)} disabled={creating}>Cancel</button>
            <button className="btn btn-dark" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating…' : 'Create Quiz'}
            </button>
          </div>
        </div>
      )}

      {quizzes.length === 0 && !showCreateForm ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h3>No quizzes yet</h3>
          <p>Create a quiz to get started. You can have multiple quizzes per unit.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {quizzes.map(quiz => (
            <div key={quiz.id}
              style={{
                border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px',
                background: '#fff', display: 'flex', alignItems: 'center', gap: 16,
                cursor: 'pointer', transition: 'box-shadow 0.15s',
              }}
              onClick={() => onSelectQuiz(quiz.id)}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(46,34,25,0.09)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--ink)', marginBottom: 5 }}>
                  {quiz.name}
                </div>
                {quiz.context && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Focus: {quiz.context}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
                  <span style={{ background: 'var(--cream)', padding: '2px 9px', borderRadius: 999, fontWeight: 600, color: 'var(--ink)' }}>
                    {quiz.question_count} question{quiz.question_count !== 1 ? 's' : ''}
                  </span>
                  {quiz.due_date && (
                    <span>Due {new Date(quiz.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={e => { e.stopPropagation(); onSelectQuiz(quiz.id); }}>Edit</button>
                <button className="btn btn-danger" style={{ fontSize: 13 }} onClick={e => handleDelete(quiz.id, e)} disabled={deleting === quiz.id}>
                  {deleting === quiz.id ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── QUIZ EDIT VIEW ───────────────────────────────────────────────────────────

function QuizEditView({ unit, quizId, students = [], onBack }) {
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [quizName, setQuizName] = useState('');
  const [quizContext, setQuizContext] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [essayGuideEnabled, setEssayGuideEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedMeta, setSavedMeta] = useState(false);
  const [error, setError] = useState('');
  const [genCount, setGenCount] = useState(10);
  const [activeTab, setActiveTab] = useState('questions');

  const [questionModal, setQuestionModal] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [qForm, setQForm] = useState({ ...BLANK_QUESTION, options: ['', '', '', ''] });
  const [qFormError, setQFormError] = useState('');

  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [overrideOpen, setOverrideOpen] = useState(null);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideError, setOverrideError] = useState('');

  const hasEssayQuestions = questions.some(q => q.type === 'essay');

  useEffect(() => { fetchQuiz(); }, [quizId]);
  useEffect(() => { if (activeTab === 'students' && quiz) fetchSubmissions(); }, [activeTab, quiz]);

  async function fetchQuiz() {
    setLoading(true);
    try {
      const { quiz } = await getQuizById(unit.id, quizId);
      if (quiz) {
        setQuiz(quiz);
        setQuestions(quiz.questions || []);
        setQuizName(quiz.name || '');
        setQuizContext(quiz.context || '');
        setDueDate(quiz.due_date?.slice(0, 10) || '');
        setEssayGuideEnabled(quiz.essay_guide_enabled ?? true);
      }
    } catch { setError('Failed to load quiz.'); }
    finally { setLoading(false); }
  }

  async function fetchSubmissions() {
    setSubmissionsLoading(true);
    try {
      const { submissions } = await getAllQuizResults(unit.id, quizId);
      const enrolledIds = new Set(students.map(s => s.id));
      setSubmissions((submissions || []).filter(s => enrolledIds.has(s.student_id)));
    } catch { /* silent */ }
    finally { setSubmissionsLoading(false); }
  }

  async function handleSaveMeta() {
    if (!quizName.trim()) { setError('Quiz name is required.'); return; }
    setSavingMeta(true); setError('');
    try {
      const { quiz: updated } = await updateQuizMeta(unit.id, quizId, {
        name: quizName.trim(),
        context: quizContext.trim() || null,
        due_date: dueDate || null,
        essay_guide_enabled: essayGuideEnabled,
      });
      setQuiz(updated);
      setSavedMeta(true); setTimeout(() => setSavedMeta(false), 2000);
    } catch { setError('Failed to save quiz settings.'); }
    finally { setSavingMeta(false); }
  }

  async function handleGenerate() {
    if (!unit?.context && !quizContext) { setError('Add a Quiz Focus above or unit context before generating.'); return; }
    setError(''); setGenerating(true);
    try {
      const { quiz: updated } = await generateQuiz(unit.id, quizId, { count: genCount });
      setQuiz(updated); setQuestions(updated.questions || []);
    } catch (err) { setError(err.response?.data?.error || 'Generation failed. Try again.'); }
    finally { setGenerating(false); }
  }

  async function handleSaveQuestions() {
    if (questions.length === 0) { setError('Add at least one question before saving.'); return; }
    setError(''); setSaving(true);
    try {
      const { quiz: updated } = await saveQuizQuestions(unit.id, quizId, { questions });
      setQuiz(updated); setQuestions(updated.questions || []);
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch { setError('Failed to save questions.'); }
    finally { setSaving(false); }
  }

  async function handleAnalyze(submission) {
    setSelectedSubmission(submission); setAnalysis(null); setAnalysisError(''); setAnalyzing(true);
    try {
      const { analysis } = await analyzeStudentQuiz(unit.id, quizId, submission.student_id);
      setAnalysis(analysis);
    } catch (err) { setAnalysisError(err.response?.data?.error || 'Analysis failed.'); }
    finally { setAnalyzing(false); }
  }

  async function handleSaveOverride({ question_id, score, feedback }) {
    if (!selectedSubmission) return;
    setOverrideSaving(true); setOverrideError('');
    try {
      const { submission: updated } = await overrideSaGrades(unit.id, quizId, selectedSubmission.id, [{ question_id, score, feedback }]);
      setSelectedSubmission(updated);
      setSubmissions(subs => subs.map(s => s.id === updated.id ? { ...s, ...updated } : s));
      setOverrideOpen(null);
    } catch (err) { setOverrideError(err.response?.data?.error || 'Failed to save grade.'); }
    finally { setOverrideSaving(false); }
  }

  function openAddQuestion() {
    setEditIdx(null); setQForm({ ...BLANK_QUESTION, options: ['', '', '', ''] }); setQFormError(''); setQuestionModal(true);
  }

  function openEditQuestion(idx) {
    const q = questions[idx]; setEditIdx(idx);
    setQForm({ question_text: q.question_text, type: q.type, options: q.options ? [...q.options] : ['', '', '', ''], correct_answer: q.correct_answer });
    setQFormError(''); setQuestionModal(true);
  }

  function handleQFormSubmit() {
    if (!qForm.question_text.trim()) { setQFormError('Question text is required.'); return; }
    if (!qForm.correct_answer.trim()) { setQFormError(qForm.type === 'essay' ? 'Grading prompt is required.' : 'Correct answer is required.'); return; }
    if (qForm.type === 'multiple_choice') {
      if (qForm.options.filter(o => o.trim()).length < 2) { setQFormError('Add at least 2 options.'); return; }
    }
    const built = {
      question_text: qForm.question_text.trim(), type: qForm.type,
      options: qForm.type === 'multiple_choice' ? qForm.options.filter(o => o.trim()) : null,
      correct_answer: qForm.correct_answer.trim(),
      order_index: editIdx !== null ? editIdx : questions.length,
    };
    if (editIdx !== null) setQuestions(qs => qs.map((q, i) => i === editIdx ? built : q));
    else setQuestions(qs => [...qs, built]);
    setQuestionModal(false);
  }

  function removeQuestion(idx) {
    setQuestions(qs => qs.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order_index: i })));
  }

  if (loading) return <LoadingSpinner fullPage label="Loading quiz…" />;

  return (
    <div>
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, fontSize: 13, fontFamily: 'var(--font-body)', marginBottom: 18 }}>
        ← All Quizzes
      </button>

      {/* Quiz Meta Panel */}
      <div className="quiz-meta-panel">
        {error && <div className="alert alert-error">{error}</div>}
        <div className="quiz-meta-panel-row">
          <div className="quiz-meta-field">
            <label className="quiz-meta-label">Quiz Name</label>
            <input type="text" className="quiz-meta-name-input" value={quizName} onChange={e => setQuizName(e.target.value)} />
          </div>
          <div className="quiz-meta-field">
            <label className="quiz-meta-label">Due Date</label>
            <AppDatePicker value={dueDate} onChange={val => setDueDate(val)} className="quiz-meta-date-input" />
          </div>
        </div>
        <div className="quiz-meta-focus-row">
          <label className="quiz-meta-label">
            Quiz Focus <span className="quiz-meta-label-note">— narrows AI generation to specific topics</span>
          </label>
          <textarea rows={2} value={quizContext} onChange={e => setQuizContext(e.target.value)}
            placeholder="e.g. 'Causes and consequences of WWI' — leave blank to use the full unit context." />
        </div>
        <div className="quiz-meta-footer">
          <button className="btn btn-dark" onClick={handleSaveMeta} disabled={savingMeta}>
            {savingMeta ? 'Saving…' : 'Save Settings'}
          </button>
          {savedMeta && <span className="quiz-meta-saved-badge">✓ Saved</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="quiz-tab-bar">
        <button className={`quiz-tab ${activeTab === 'questions' ? 'quiz-tab--active' : ''}`} onClick={() => setActiveTab('questions')}>
          Questions {questions.length > 0 && <span className="quiz-tab-badge">{questions.length}</span>}
        </button>
        <button className={`quiz-tab ${activeTab === 'students' ? 'quiz-tab--active' : ''}`} onClick={() => setActiveTab('students')}>
          Student Results {submissions.length > 0 && <span className="quiz-tab-badge">{submissions.length}</span>}
        </button>
      </div>

      {/* ── QUESTIONS TAB ── */}
      {activeTab === 'questions' && (
        <>
          {saved && <div className="alert alert-success">Questions saved successfully.</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={generating || saving}>
                {generating ? <><LoadingSpinner size="sm" /> Generating…</> : '✨ Generate with AI'}
              </button>
              <input type="number" min={3} max={30} value={genCount} onChange={e => setGenCount(Number(e.target.value))}
                style={{ width: 60, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 13 }} />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>questions</span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="btn btn-ghost" onClick={openAddQuestion}>+ Add Question</button>
              <button className="btn btn-dark" onClick={handleSaveQuestions} disabled={saving || generating}>
                {saving ? 'Saving…' : 'Save Questions'}
              </button>
            </div>
          </div>

          {hasEssayQuestions && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', marginBottom: 16, background: essayGuideEnabled ? '#fef3cd' : 'var(--cream)', border: `1px solid ${essayGuideEnabled ? '#f0c040' : 'var(--border)'}`, borderRadius: 6 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>✍️ Essay Guide</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>
                  {essayGuideEnabled ? 'Students can open the AI essay planning guide' : 'Essay guide is hidden from students'}
                </span>
              </div>
              <button onClick={() => setEssayGuideEnabled(v => !v)}
                style={{ padding: '5px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, border: '1px solid var(--border)', cursor: 'pointer', background: essayGuideEnabled ? 'var(--rust)' : '#fff', color: essayGuideEnabled ? '#fff' : 'var(--muted)', fontFamily: 'var(--font-body)' }}>
                {essayGuideEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          )}

          {questions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"></div>
              <h3>No questions yet</h3>
              <p>Generate questions with AI or add your own manually.</p>
            </div>
          ) : (
            <div className="quiz-question-list">
              {questions.map((q, i) => (
                <div key={i} className="quiz-question-item">
                  <div className="quiz-question-header">
                    <span className="quiz-question-num">Question {i + 1}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`quiz-question-type ${typeBadgeClass(q.type)}`}>{typeLabel(q.type)}</span>
                      <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => openEditQuestion(i)}>Edit</button>
                      <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => removeQuestion(i)}>Remove</button>
                    </div>
                  </div>
                  <div className="quiz-question-text quiz-question-text--markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(q.question_text) }} />
                  {q.type === 'multiple_choice' && q.options && (
                    <div className="quiz-question-options">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className={`quiz-option ${opt === q.correct_answer ? 'quiz-option--correct' : ''}`}>
                          <span className="quiz-option-bullet">{opt === q.correct_answer ? '✓' : '○'}</span>
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === 'short_answer' && <div className="quiz-question-answer">Model answer: {q.correct_answer}</div>}
                  {q.type === 'essay' && (
                    <div className="quiz-question-essay-prompt">
                      <span className="quiz-question-essay-prompt-label">Grading prompt:</span>
                      {q.correct_answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── STUDENT RESULTS TAB ── */}
      {activeTab === 'students' && (
        <>
          {!quiz ? (
            <div className="empty-state"><div className="empty-state-icon"></div><h3>No quiz yet</h3><p>Save the quiz first.</p></div>
          ) : submissionsLoading ? (
            <LoadingSpinner fullPage label="Loading results…" />
          ) : submissions.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"></div><h3>No submissions yet</h3><p>Students haven't submitted this quiz yet.</p></div>
          ) : (
            <div className="quiz-results-layout">
              <div className="quiz-results-list">
                <div className="quiz-results-list-header">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</div>
                {submissions.map(sub => (
                  <button key={sub.id}
                    className={`quiz-results-student-row ${selectedSubmission?.id === sub.id ? 'quiz-results-student-row--active' : ''}`}
                    onClick={() => { setSelectedSubmission(sub); setAnalysis(null); setAnalysisError(''); setOverrideOpen(null); }}>
                    <div className="quiz-results-student-name">{sub.profiles?.display_name || 'Unknown'}</div>
                    <div className="quiz-results-student-score" style={{ color: scoreColor(sub.score), background: scoreBg(sub.score) }}>
                      {sub.score !== null ? `${sub.score}%` : '—'}
                    </div>
                  </button>
                ))}
              </div>

              <div className="quiz-results-detail">
                {!selectedSubmission ? (
                  <div className="quiz-results-empty"><p style={{ color: 'var(--muted)', fontSize: 14 }}>Select a student to view their results</p></div>
                ) : (
                  <>
                    <div className="quiz-results-detail-header">
                      <div>
                        <div className="quiz-results-detail-name">{selectedSubmission.profiles?.display_name || 'Unknown'}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          Submitted {new Date(selectedSubmission.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="quiz-results-detail-score" style={{ color: scoreColor(selectedSubmission.score) }}>
                        {selectedSubmission.score !== null ? `${selectedSubmission.score}%` : '—'}
                      </div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <button className="btn btn-primary" onClick={() => handleAnalyze(selectedSubmission)} disabled={analyzing} style={{ width: '100%', justifyContent: 'center' }}>
                        {analyzing ? <><LoadingSpinner size="sm" /> Analyzing…</> : '✨ Analyze with AI'}
                      </button>
                      {analysisError && <div className="alert alert-error" style={{ marginTop: 8 }}>{analysisError}</div>}
                    </div>

                    {analysis && (
                      <div className="quiz-analysis-panel">
                        <div className="quiz-analysis-summary quiz-analysis-copy--markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis.summary) }} />
                        <div className="quiz-analysis-section">
                          <div className="quiz-analysis-section-label quiz-analysis-section-label--good">✓ Strengths</div>
                          <ul className="quiz-analysis-list">
                            {analysis.strengths.map((s, i) => <li key={i} className="quiz-analysis-copy--markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(s) }} />)}
                          </ul>
                        </div>
                        <div className="quiz-analysis-section">
                          <div className="quiz-analysis-section-label quiz-analysis-section-label--improve">↑ Needs Work</div>
                          <ul className="quiz-analysis-list">
                            {analysis.improvements.map((s, i) => <li key={i} className="quiz-analysis-copy--markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(s) }} />)}
                          </ul>
                        </div>
                        <div className="quiz-analysis-recommendation">
                          <span style={{ fontWeight: 600, color: 'var(--ink)', marginRight: 6 }}>📌 Recommendation:</span>
                          <div className="quiz-analysis-copy--markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis.recommendation) }} />
                        </div>
                      </div>
                    )}

                    <div className="divider" style={{ margin: '20px 0' }} />
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 14, color: 'var(--ink)' }}>Full Submission</h3>
                    {overrideError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{overrideError}</div>}

                    {questions.map((q, i) => {
                      const studentAnswer = selectedSubmission.answers?.find(a => a.question_id === q.id) ?? selectedSubmission.answers?.[i];
                      const mcResult = selectedSubmission.mc_results?.find(r => r.question_id === q.id) ?? selectedSubmission.mc_results?.[i];
                      const saResult = selectedSubmission.sa_feedback?.find(r => r.question_id === q.id) ?? selectedSubmission.sa_feedback?.[i];
                      const essayResult = selectedSubmission.essay_feedback?.find(r => r.question_id === q.id) ?? selectedSubmission.essay_feedback?.[i];
                      const isMC = q.type === 'multiple_choice';
                      const isEssay = q.type === 'essay';
                      const isSA = q.type === 'short_answer';
                      const isCorrect = isMC && (mcResult?.correct ?? false);
                      const isOverrideOpen = overrideOpen === q.id;

                      return (
                        <div key={q.id || i} className="quiz-results-question-item">
                          <div className="quiz-results-question-meta">
                            <span>Q{i + 1} · {typeLabel(q.type)}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {isMC && <span style={{ fontSize: 11, fontWeight: 600, color: isCorrect ? '#2a7a2a' : '#c0392b' }}>{isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>}
                              {isSA && saResult?.score !== null && saResult?.score !== undefined && (
                                <span style={{ fontSize: 12, fontWeight: 600, color: scoreColor(saResult.score) }}>
                                  {saResult.score}%{saResult.teacher_graded && <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400, marginLeft: 4 }}>teacher</span>}
                                </span>
                              )}
                              {isEssay && essayResult?.score !== null && essayResult?.score !== undefined && (
                                <span style={{ fontSize: 12, fontWeight: 600, color: scoreColor(essayResult.score) }}>{essayResult.score}%</span>
                              )}
                              {isSA && !isOverrideOpen && (
                                <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }}
                                  onClick={() => { setOverrideOpen(q.id); setOverrideError(''); }} disabled={overrideSaving}>
                                  {saResult ? 'Override grade' : 'Add grade'}
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="quiz-question-text quiz-question-text--markdown" style={{ fontSize: 14, marginBottom: 8 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(q.question_text) }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--cream)', padding: '6px 10px', borderRadius: 4 }}>
                              <strong>Student:</strong> {studentAnswer?.answer || '—'}
                            </div>
                            {isMC && !isCorrect && mcResult?.correct_answer && (
                              <div style={{ fontSize: 12, color: '#2a7a2a', background: '#eaf6ea', padding: '6px 10px', borderRadius: 4 }}>
                                <strong>Correct:</strong> {mcResult.correct_answer}
                              </div>
                            )}
                            {isSA && saResult?.feedback && !isOverrideOpen && (
                              <div style={{ fontSize: 12, color: 'var(--ink)', padding: '6px 10px', background: '#fff', border: '1px solid var(--border)', borderLeft: `3px solid ${scoreColor(saResult.score ?? 0)}`, borderRadius: '0 4px 4px 0', lineHeight: 1.6 }}>
                                💬 {saResult.feedback}
                              </div>
                            )}
                            {isSA && isOverrideOpen && <SaOverrideForm questionId={q.id} current={saResult} onSave={handleSaveOverride} onCancel={() => setOverrideOpen(null)} />}
                            {isEssay && essayResult && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {essayResult.breakdown && (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                                    {Object.entries(essayResult.breakdown).map(([key, val]) => (
                                      <div key={key} className="essay-breakdown-cell">
                                        <div className="essay-breakdown-label">{key}</div>
                                        <div className="essay-breakdown-score" style={{ color: scoreColor(val * 4) }}>{val}<span className="essay-breakdown-denom">/25</span></div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {essayResult.feedback && (
                                  <div style={{ fontSize: 12, color: 'var(--ink)', padding: '8px 12px', background: '#fff', border: '1px solid var(--border)', borderLeft: `3px solid ${scoreColor(essayResult.score ?? 0)}`, borderRadius: '0 4px 4px 0', lineHeight: 1.6 }}>
                                    💬 {essayResult.feedback}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add / Edit Question Modal */}
      <Modal isOpen={questionModal} onClose={() => setQuestionModal(false)}
        title={editIdx !== null ? 'Edit Question' : 'Add Question'} size="md"
        footer={<ModalActions onCancel={() => setQuestionModal(false)} onConfirm={handleQFormSubmit} confirmLabel={editIdx !== null ? 'Save' : 'Add'} />}>
        {qFormError && <div className="alert alert-error">{qFormError}</div>}
        <div className="field">
          <label>Question Type</label>
          <select value={qForm.type} onChange={e => setQForm(f => ({ ...f, type: e.target.value, correct_answer: '' }))}>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="short_answer">Short Answer</option>
            <option value="essay">Essay</option>
          </select>
        </div>
        <div className="field">
          <label>Question Text</label>
          <textarea rows={3} value={qForm.question_text} onChange={e => setQForm(f => ({ ...f, question_text: e.target.value }))} placeholder="Enter your question…" autoFocus />
        </div>
        {qForm.type === 'multiple_choice' && (
          <div className="field">
            <label>Answer Options</label>
            {qForm.options.map((opt, i) => (
              <input key={i} type="text" value={opt}
                onChange={e => { const next = [...qForm.options]; next[i] = e.target.value; setQForm(f => ({ ...f, options: next })); }}
                placeholder={`Option ${i + 1}`} style={{ marginBottom: 8 }} />
            ))}
          </div>
        )}
        <div className="field">
          {qForm.type === 'multiple_choice' && (
            <><label>Correct Answer</label>
            <select value={qForm.correct_answer} onChange={e => setQForm(f => ({ ...f, correct_answer: e.target.value }))}>
              <option value="">Select the correct option…</option>
              {qForm.options.filter(o => o.trim()).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
            </select></>
          )}
          {qForm.type === 'short_answer' && (
            <><label>Model Answer</label>
            <input type="text" value={qForm.correct_answer} onChange={e => setQForm(f => ({ ...f, correct_answer: e.target.value }))} placeholder="Model answer…" /></>
          )}
          {qForm.type === 'essay' && (
            <><label>Grading Prompt</label>
            <textarea rows={5} value={qForm.correct_answer} onChange={e => setQForm(f => ({ ...f, correct_answer: e.target.value }))}
              placeholder="Describe what a strong response should include…" />
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
              Not shown to students. Used by AI to grade thesis, evidence, analysis, and counterclaim.
            </p></>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function QuizEditor({ unit, students = [] }) {
  const [selectedQuizId, setSelectedQuizId] = useState(null);

  // Reset selection when unit changes
  useEffect(() => { setSelectedQuizId(null); }, [unit?.id]);

  return selectedQuizId ? (
    <QuizEditView unit={unit} quizId={selectedQuizId} students={students} onBack={() => setSelectedQuizId(null)} />
  ) : (
    <QuizListView unit={unit} onSelectQuiz={setSelectedQuizId} />
  );
}
