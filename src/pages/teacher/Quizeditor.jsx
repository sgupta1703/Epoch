import { useState, useEffect } from 'react';
import Modal, { ModalActions } from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getQuiz, generateQuiz, saveQuizQuestions, getAllQuizResults, analyzeStudentQuiz, overrideSaGrades } from '../../api/quiz';
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

function normalizeMcAnswer(answer) {
  return String(answer || '')
    .trim()
    .replace(/^[A-Z]\)\s*/i, '')
    .replace(/^[A-Z][.: -]+\s*/i, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function isMatchingMcAnswer(studentAnswer, correctAnswer) {
  return normalizeMcAnswer(studentAnswer) !== '' && normalizeMcAnswer(studentAnswer) === normalizeMcAnswer(correctAnswer);
}

// ── Inline SA grade override form ─────────────────────────────
function SaOverrideForm({ questionId, current, onSave, onCancel }) {
  const [score, setScore]       = useState(current?.score ?? '');
  const [feedback, setFeedback] = useState(current?.feedback ?? '');
  const [err, setErr]           = useState('');

  function handleSubmit() {
    const n = Number(score);
    if (score === '' || isNaN(n) || n < 0 || n > 100) {
      setErr('Score must be a number between 0 and 100.');
      return;
    }
    onSave({ question_id: questionId, score: n, feedback });
  }

  return (
    <div className="sa-override-form">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
          Score (0–100)
        </label>
        <input
          type="number" min={0} max={100} value={score}
          onChange={e => { setScore(e.target.value); setErr(''); }}
          style={{ width: 72, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 13 }}
          autoFocus
        />
        {err && <span style={{ fontSize: 11, color: '#c0392b' }}>{err}</span>}
      </div>
      <textarea
        rows={2}
        value={feedback}
        onChange={e => setFeedback(e.target.value)}
        placeholder="Feedback for the student (optional)…"
        style={{ width: '100%', fontSize: 12, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 4, resize: 'vertical', lineHeight: 1.5, fontFamily: 'var(--font-body)', boxSizing: 'border-box', marginBottom: 8 }}
      />
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={onCancel}>Cancel</button>
        <button className="btn btn-dark"  style={{ fontSize: 12, padding: '5px 12px' }} onClick={handleSubmit}>Save Grade</button>
      </div>
    </div>
  );
}

export default function QuizEditor({ unit, students = [] }) {
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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

  const [overrideOpen, setOverrideOpen]     = useState(null);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideError, setOverrideError]   = useState('');

  useEffect(() => {
    if (!unit?.id) return;
    fetchQuiz();
  }, [unit?.id]);

  useEffect(() => {
    if (activeTab === 'students' && quiz) fetchSubmissions();
  }, [activeTab, quiz]);

  async function fetchQuiz() {
    setLoading(true);
    try {
      const { quiz } = await getQuiz(unit.id);
      if (quiz) {
        setQuiz(quiz);
        setQuestions(quiz.questions || []);
        setDueDate(quiz.due_date?.slice(0, 10) || '');
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  async function fetchSubmissions() {
    setSubmissionsLoading(true);
    try {
      const { submissions } = await getAllQuizResults(unit.id);
      const enrolledIds = new Set(students.map(s => s.id));
      setSubmissions((submissions || []).filter(s => enrolledIds.has(s.student_id)));
    } catch { /* silent */ } finally {
      setSubmissionsLoading(false);
    }
  }

  async function handleGenerate() {
    if (!unit?.context) {
      setError('This unit has no context. Edit the unit to add context before generating a quiz.');
      return;
    }
    setError('');
    setGenerating(true);
    try {
      const { quiz } = await generateQuiz(unit.id, { count: genCount });
      setQuiz(quiz);
      setQuestions(quiz.questions || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed. Try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (questions.length === 0) { setError('Add at least one question before saving.'); return; }
    setError('');
    setSaving(true);
    try {
      const { quiz } = await saveQuizQuestions(unit.id, { questions, due_date: dueDate || null });
      setQuiz(quiz);
      setQuestions(quiz.questions || []);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Failed to save quiz.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAnalyze(submission) {
    setSelectedSubmission(submission);
    setAnalysis(null);
    setAnalysisError('');
    setAnalyzing(true);
    try {
      const { analysis } = await analyzeStudentQuiz(unit.id, submission.student_id);
      setAnalysis(analysis);
    } catch (err) {
      setAnalysisError(err.response?.data?.error || 'Analysis failed. Try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSaveOverride({ question_id, score, feedback }) {
    if (!selectedSubmission) return;
    setOverrideSaving(true);
    setOverrideError('');
    try {
      const { submission: updated } = await overrideSaGrades(
        unit.id,
        selectedSubmission.id,
        [{ question_id, score, feedback }]
      );
      setSelectedSubmission(updated);
      setSubmissions(subs => subs.map(s => s.id === updated.id ? { ...s, ...updated } : s));
      setOverrideOpen(null);
    } catch (err) {
      setOverrideError(err.response?.data?.error || 'Failed to save grade.');
    } finally {
      setOverrideSaving(false);
    }
  }

  function openAddQuestion() {
    setEditIdx(null);
    setQForm({ ...BLANK_QUESTION, options: ['', '', '', ''] });
    setQFormError('');
    setQuestionModal(true);
  }

  function openEditQuestion(idx) {
    const q = questions[idx];
    setEditIdx(idx);
    setQForm({
      question_text: q.question_text,
      type: q.type,
      options: q.options ? [...q.options] : ['', '', '', ''],
      correct_answer: q.correct_answer,
    });
    setQFormError('');
    setQuestionModal(true);
  }

  function handleQFormSubmit() {
    if (!qForm.question_text.trim()) { setQFormError('Question text is required.'); return; }
    if (!qForm.correct_answer.trim()) {
      setQFormError(qForm.type === 'essay' ? 'Grading prompt is required.' : 'Correct answer is required.');
      return;
    }
    if (qForm.type === 'multiple_choice') {
      const filled = qForm.options.filter(o => o.trim());
      if (filled.length < 2) { setQFormError('Add at least 2 options.'); return; }
    }
    const built = {
      question_text: qForm.question_text.trim(),
      type: qForm.type,
      options: qForm.type === 'multiple_choice' ? qForm.options.filter(o => o.trim()) : null,
      correct_answer: qForm.correct_answer.trim(),
      order_index: editIdx !== null ? editIdx : questions.length,
    };
    if (editIdx !== null) {
      setQuestions(qs => qs.map((q, i) => i === editIdx ? built : q));
    } else {
      setQuestions(qs => [...qs, built]);
    }
    setQuestionModal(false);
  }

  function removeQuestion(idx) {
    setQuestions(qs => qs.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order_index: i })));
  }

  if (loading) return <LoadingSpinner fullPage label="Loading quiz…" />;

  return (
    <div>
      {/* Tab bar */}
      <div className="quiz-tab-bar">
        <button className={`quiz-tab ${activeTab === 'questions' ? 'quiz-tab--active' : ''}`} onClick={() => setActiveTab('questions')}>
          Questions {questions.length > 0 && <span className="quiz-tab-badge">{questions.length}</span>}
        </button>
        <button className={`quiz-tab ${activeTab === 'students' ? 'quiz-tab--active' : ''}`} onClick={() => setActiveTab('students')}>
          Student Results {submissions.length > 0 && <span className="quiz-tab-badge">{submissions.length}</span>}
        </button>
      </div>

      {/* ══════════ QUESTIONS TAB ══════════ */}
      {activeTab === 'questions' && (
        <>
          {error && <div className="alert alert-error">{error}</div>}
          {saved && <div className="alert alert-success">Quiz saved successfully.</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={generating || saving}>
                {generating ? <><LoadingSpinner size="sm" /> Generating…</> : '✨ Generate with AI'}
              </button>
              <input type="number" min={3} max={30} value={genCount}
                onChange={e => setGenCount(Number(e.target.value))}
                style={{ width: 60, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 13 }} />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>questions</span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Due Date</span>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 13 }} />
              </div>
              <button className="btn btn-ghost" onClick={openAddQuestion}>+ Add Question</button>
              <button className="btn btn-dark" onClick={handleSave} disabled={saving || generating}>
                {saving ? 'Saving…' : 'Save Quiz'}
              </button>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"></div>
              <h3>No questions yet</h3>
              <p>Generate questions with AI from the unit context, or add your own manually.</p>
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
                  <div className="quiz-question-text quiz-question-text--markdown"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(q.question_text) }} />
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

      {/* ══════════ STUDENT RESULTS TAB ══════════ */}
      {activeTab === 'students' && (
        <>
          {!quiz ? (
            <div className="empty-state"><div className="empty-state-icon"></div><h3>No quiz yet</h3><p>Create and save a quiz first.</p></div>
          ) : submissionsLoading ? (
            <LoadingSpinner fullPage label="Loading results…" />
          ) : submissions.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"></div><h3>No submissions yet</h3><p>Students haven't submitted yet.</p></div>
          ) : (
            <div className="quiz-results-layout">
              <div className="quiz-results-list">
                <div className="quiz-results-list-header">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</div>
                {submissions.map(sub => (
                  <button key={sub.id}
                    className={`quiz-results-student-row ${selectedSubmission?.id === sub.id ? 'quiz-results-student-row--active' : ''}`}
                    onClick={() => { setSelectedSubmission(sub); setAnalysis(null); setAnalysisError(''); setOverrideOpen(null); }}
                  >
                    <div className="quiz-results-student-name">{sub.profiles?.display_name || 'Unknown Student'}</div>
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
                        <div className="quiz-results-detail-name">{selectedSubmission.profiles?.display_name || 'Unknown Student'}</div>
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
                        {analyzing ? <><LoadingSpinner size="sm" /> Analyzing performance…</> : '✨ Analyze with AI'}
                      </button>
                      {analysisError && <div className="alert alert-error" style={{ marginTop: 8 }}>{analysisError}</div>}
                    </div>

                    {analysis && (
                      <div className="quiz-analysis-panel">
                        <div
                          className="quiz-analysis-summary quiz-analysis-copy--markdown"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis.summary) }}
                        />
                        <div className="quiz-analysis-section">
                          <div className="quiz-analysis-section-label quiz-analysis-section-label--good">✓ Strengths</div>
                          <ul className="quiz-analysis-list">
                            {analysis.strengths.map((s, i) => (
                              <li
                                key={i}
                                className="quiz-analysis-copy--markdown"
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(s) }}
                              />
                            ))}
                          </ul>
                        </div>
                        <div className="quiz-analysis-section">
                          <div className="quiz-analysis-section-label quiz-analysis-section-label--improve">↑ Needs Work</div>
                          <ul className="quiz-analysis-list">
                            {analysis.improvements.map((s, i) => (
                              <li
                                key={i}
                                className="quiz-analysis-copy--markdown"
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(s) }}
                              />
                            ))}
                          </ul>
                        </div>
                        <div className="quiz-analysis-recommendation">
                          <span style={{ fontWeight: 600, color: 'var(--ink)', marginRight: 6 }}>📌 Recommendation:</span>
                          <div
                            className="quiz-analysis-copy--markdown"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis.recommendation) }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="divider" style={{ margin: '20px 0' }} />
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 14, color: 'var(--ink)' }}>Full Submission</h3>

                    {overrideError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{overrideError}</div>}

                    {questions.map((q, i) => {
                      // ── Positional fallback: if IDs don't match (quiz was regenerated after
                      // submission), fall back to position index so answers still show up.
                      const studentAnswer =
                        selectedSubmission.answers?.find(a => a.question_id === q.id)
                        ?? selectedSubmission.answers?.[i];

                      // For MC correct/incorrect, trust mc_results from the submission
                      // (graded at submit time against the original questions).
                      const mcResult  = selectedSubmission.mc_results?.find(r => r.question_id === q.id)
                                        ?? selectedSubmission.mc_results?.[i];

                      const saResult    = selectedSubmission.sa_feedback?.find(r => r.question_id === q.id)
                                          ?? selectedSubmission.sa_feedback?.[i];
                      const essayResult = selectedSubmission.essay_feedback?.find(r => r.question_id === q.id)
                                          ?? selectedSubmission.essay_feedback?.[i];

                      const isMC    = q.type === 'multiple_choice';
                      const isEssay = q.type === 'essay';
                      const isSA    = q.type === 'short_answer';

                      // Use mc_results.correct (set at submit time) — never re-compare answers
                      // against q.correct_answer which may belong to a newer quiz version.
                      const isCorrect = isMC && (mcResult?.correct ?? false);

                      const isOverrideOpen = overrideOpen === q.id;

                      return (
                        <div key={q.id || i} className="quiz-results-question-item">
                          <div className="quiz-results-question-meta">
                            <span>Q{i + 1} · {typeLabel(q.type)}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {isMC && (
                                <span style={{ fontSize: 11, fontWeight: 600, color: isCorrect ? '#2a7a2a' : '#c0392b' }}>
                                  {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                </span>
                              )}
                              {isSA && saResult?.score !== null && saResult?.score !== undefined && (
                                <span style={{ fontSize: 12, fontWeight: 600, color: scoreColor(saResult.score) }}>
                                  {saResult.score}%
                                  {saResult.teacher_graded && (
                                    <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400, marginLeft: 4 }}>teacher</span>
                                  )}
                                </span>
                              )}
                              {isEssay && essayResult?.score !== null && essayResult?.score !== undefined && (
                                <span style={{ fontSize: 12, fontWeight: 600, color: scoreColor(essayResult.score) }}>{essayResult.score}%</span>
                              )}
                              {isSA && !isOverrideOpen && (
                                <button
                                  className="btn btn-ghost"
                                  style={{ fontSize: 11, padding: '2px 8px' }}
                                  onClick={() => { setOverrideOpen(q.id); setOverrideError(''); }}
                                  disabled={overrideSaving}
                                >
                                  {saResult ? 'Override grade' : 'Add grade'}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="quiz-question-text quiz-question-text--markdown"
                            style={{ fontSize: 14, marginBottom: 8 }}
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(q.question_text) }} />

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

                            {isSA && isOverrideOpen && (
                              <SaOverrideForm
                                questionId={q.id}
                                current={saResult}
                                onSave={handleSaveOverride}
                                onCancel={() => setOverrideOpen(null)}
                              />
                            )}

                            {isEssay && essayResult && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {essayResult.breakdown && (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                                    {Object.entries(essayResult.breakdown).map(([key, val]) => (
                                      <div key={key} className="essay-breakdown-cell">
                                        <div className="essay-breakdown-label">{key}</div>
                                        <div className="essay-breakdown-score" style={{ color: scoreColor(val * 4) }}>
                                          {val}<span className="essay-breakdown-denom">/25</span>
                                        </div>
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
      <Modal
        isOpen={questionModal}
        onClose={() => setQuestionModal(false)}
        title={editIdx !== null ? 'Edit Question' : 'Add Question'}
        size="md"
        footer={<ModalActions onCancel={() => setQuestionModal(false)} onConfirm={handleQFormSubmit} confirmLabel={editIdx !== null ? 'Save' : 'Add'} />}
      >
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
          <textarea rows={3} value={qForm.question_text}
            onChange={e => setQForm(f => ({ ...f, question_text: e.target.value }))}
            placeholder="Enter your question…" autoFocus />
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
            <>
              <label>Correct Answer</label>
              <select value={qForm.correct_answer} onChange={e => setQForm(f => ({ ...f, correct_answer: e.target.value }))}>
                <option value="">Select the correct option…</option>
                {qForm.options.filter(o => o.trim()).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
              </select>
            </>
          )}
          {qForm.type === 'short_answer' && (
            <>
              <label>Model Answer</label>
              <input type="text" value={qForm.correct_answer}
                onChange={e => setQForm(f => ({ ...f, correct_answer: e.target.value }))}
                placeholder="Model answer for this question…" />
            </>
          )}
          {qForm.type === 'essay' && (
            <>
              <label>Grading Prompt</label>
              <textarea rows={5} value={qForm.correct_answer}
                onChange={e => setQForm(f => ({ ...f, correct_answer: e.target.value }))}
                placeholder="Describe what a strong response should include — a clear thesis, which specific events or figures should be cited, depth of analysis expected, whether a counterclaim is required, etc." />
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
                Not shown to students. Used by the AI to grade thesis, evidence, analysis, and counterclaim.
              </p>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
