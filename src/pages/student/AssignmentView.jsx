import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import EssayGuide from '../../components/EssayGuide';
import { getAssignment, submitAssignment, getAssignmentResults } from '../../api/assignments';
import { renderMarkdown } from '../../utils/renderMarkdown';
import '../../styles/pages.css';
import './Student.css';

function scoreColor(score) {
  if (score >= 70) return '#2a7a2a';
  if (score >= 40) return '#b8860b';
  return '#c0392b';
}

function typeLabel(type) {
  if (type === 'multiple_choice') return 'Multiple Choice';
  if (type === 'essay') return 'Essay';
  return 'Short Answer';
}

const TAG_STYLES = {
  thesis:       { bg: '#fef3cd', color: '#7a5c00', border: '#f0c040', label: 'Thesis' },
  evidence:     { bg: '#dbeafe', color: '#1e4d8c', border: '#93c5fd', label: 'Evidence' },
  analysis:     { bg: '#dcfce7', color: '#166534', border: '#86efac', label: 'Analysis' },
  counterclaim: { bg: '#f3e8ff', color: '#6b21a8', border: '#c084fc', label: 'Counterclaim' },
};

function parseTaggedText(text) {
  if (!text) return [];
  const combined = /(\[\[(.+?)\]\]|\{\{(.+?)\}\}|\|\|(.+?)\|\||<<(.+?)>>)/gs;
  const parts = []; let lastIndex = 0; let match;
  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ type: 'plain', text: text.slice(lastIndex, match.index) });
    const full = match[0];
    if (full.startsWith('[['))      parts.push({ type: 'thesis',       text: match[2] });
    else if (full.startsWith('{{')) parts.push({ type: 'evidence',     text: match[3] });
    else if (full.startsWith('||')) parts.push({ type: 'analysis',     text: match[4] });
    else if (full.startsWith('<<')) parts.push({ type: 'counterclaim', text: match[5] });
    lastIndex = combined.lastIndex;
  }
  if (lastIndex < text.length) parts.push({ type: 'plain', text: text.slice(lastIndex) });
  return parts;
}

function TaggedEssay({ text }) {
  const parts = parseTaggedText(text);
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {Object.entries(TAG_STYLES).map(([type, s]) => (
          <span key={type} style={{ fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 3, background: s.bg, color: s.color, border: `1px solid ${s.border}`, letterSpacing: '0.04em' }}>{s.label}</span>
        ))}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.9, background: '#fafaf8', border: '1px solid var(--border)', borderRadius: 6, padding: '14px 18px', fontFamily: 'var(--font-body)' }}>
        {parts.map((part, i) => {
          if (part.type === 'plain') return <span key={i}>{part.text}</span>;
          const s = TAG_STYLES[part.type];
          return <mark key={i} title={s.label} style={{ background: s.bg, color: s.color, borderBottom: `2px solid ${s.border}`, borderRadius: 2, padding: '1px 2px', cursor: 'default' }}>{part.text}</mark>;
        })}
      </div>
    </div>
  );
}

export default function AssignmentView({ user }) {
  const { unitId } = useParams();

  const [assignment, setAssignment] = useState(null);
  const [sources, setSources]       = useState([]);
  const [questions, setQuestions]   = useState([]);
  const [answers, setAnswers]       = useState({});
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [expandedSource, setExpandedSource] = useState(0);

  const [guideOpen, setGuideOpen]           = useState(false);
  const [guideQuestion, setGuideQuestion]   = useState('');
  const [guideQuestionId, setGuideQuestionId] = useState(null);

  const view = submission ? 'results' : 'take';
  // essay_guide_enabled defaults to true for older assignments without the field
  const guideEnabled = assignment?.essay_guide_enabled !== false;

  useEffect(() => { fetchAll(); }, [unitId]);

  async function fetchAll() {
    setLoading(true); setError('');
    try {
      const { assignment } = await getAssignment(unitId);
      if (assignment) {
        setAssignment(assignment);
        setSources(assignment.sources || []);
        setQuestions(assignment.questions || []);
        try {
          const { submission } = await getAssignmentResults(unitId, user.id);
          if (submission) setSubmission(submission);
        } catch { /* no submission yet */ }
      }
    } catch { setError('Failed to load assignment.'); }
    finally { setLoading(false); }
  }

  function handleAnswer(questionId, answer) {
    setAnswers(a => ({ ...a, [questionId]: answer }));
  }

  function openGuide(q) {
    setGuideQuestion(q.question_text);
    setGuideQuestionId(q.id);
    setGuideOpen(true);
  }

  async function handleSubmit() {
    if (!assignment) return;
    const unanswered = questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) { setError(`Please answer all questions. ${unanswered.length} remaining.`); return; }
    setError(''); setSubmitting(true);
    try {
      const payload = questions.map(q => ({ question_id: q.id, answer: answers[q.id] }));
      const { submission } = await submitAssignment(unitId, { answers: payload });
      setSubmission(submission);
    } catch (err) { setError(err.response?.data?.error || 'Failed to submit assignment.'); }
    finally { setSubmitting(false); }
  }

  const answeredCount = Object.keys(answers).length;
  const totalCount    = questions.length;

  if (loading) return <LoadingSpinner label="Loading assignment…" />;

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      {!assignment ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No assignment yet</h3>
          <p>Your teacher hasn't created an assignment for this unit yet.</p>
        </div>

      ) : view === 'results' ? (
        /* ══════════ RESULTS VIEW ══════════ */
        <>
          <div className="quiz-result-score">
            {submission.score !== null ? (
              <>
                <div className="quiz-result-score-value" style={{ color: scoreColor(submission.score) }}>{submission.score}%</div>
                <div className="quiz-result-score-label">Final score · Submitted {new Date(submission.submitted_at).toLocaleDateString()}</div>
              </>
            ) : (
              <>
                <div className="quiz-result-score-value" style={{ fontSize: 40 }}>✓</div>
                <div className="quiz-result-score-label">Submitted · Awaiting grade</div>
              </>
            )}
          </div>

          {sources.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 14 }}>Sources</h2>
              {sources.map((s, i) => (
                <div key={i} className="assignment-source-block">
                  <button className="assignment-source-toggle" onClick={() => setExpandedSource(expandedSource === i ? null : i)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`assignment-student-badge assignment-student-badge--${s.source_type}`}>{s.source_type === 'primary' ? 'Primary' : 'Secondary'}</span>
                      <span className="assignment-source-toggle-title">{s.title}</span>
                    </div>
                    <span style={{ fontSize: 18, color: 'var(--muted)', lineHeight: 1 }}>{expandedSource === i ? '−' : '+'}</span>
                  </button>
                  {expandedSource === i && <div className="assignment-source-body">{s.content}</div>}
                </div>
              ))}
            </div>
          )}

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 16 }}>Your Answers</h2>

          {questions.map((q, i) => {
            const studentAnswer = submission.answers?.find(a => a.question_id === q.id) ?? submission.answers?.[i];
            const saResult      = submission.sa_feedback?.find(r => r.question_id === q.id) ?? submission.sa_feedback?.[i];
            const essayResult   = submission.essay_feedback?.find(r => r.question_id === q.id) ?? submission.essay_feedback?.[i];
            const mcResult      = submission.mc_results?.find(r => r.question_id === q.id) ?? submission.mc_results?.[i];
            const isMC    = q.type === 'multiple_choice';
            const isEssay = q.type === 'essay';
            const isCorrect = isMC && (mcResult?.correct ?? false);

            return (
              <div key={q.id} className="quiz-student-question">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Question {i + 1} · {typeLabel(q.type)}</span>
                  {isMC && mcResult && <span style={{ fontSize: 12, fontWeight: 600, color: isCorrect ? '#2a7a2a' : '#c0392b', background: isCorrect ? '#eaf6ea' : '#fdecea', padding: '2px 8px', borderRadius: 10 }}>{isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>}
                  {!isMC && !isEssay && saResult?.score !== null && saResult?.score !== undefined && <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor(saResult.score) }}>{saResult.score}%</span>}
                  {isEssay && essayResult?.score !== null && essayResult?.score !== undefined && <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor(essayResult.score) }}>{essayResult.score}%</span>}
                </div>
                <div className="quiz-student-question-text quiz-student-question-text--markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(q.question_text) }} />
                <div style={{ fontSize: 13, color: 'var(--muted)', background: 'var(--cream)', padding: '8px 12px', borderRadius: 4, marginBottom: 8 }}>
                  {isEssay ? <><strong style={{ color: 'var(--ink)' }}>Your essay:</strong><br />{studentAnswer?.answer || '—'}</> : <>Your answer: <strong style={{ color: 'var(--ink)' }}>{studentAnswer?.answer || '—'}</strong></>}
                </div>
                {isMC && !isCorrect && mcResult?.correct_answer && <div style={{ fontSize: 13, color: '#2a7a2a', background: '#eaf6ea', padding: '8px 12px', borderRadius: 4 }}>Correct answer: <strong>{mcResult.correct_answer}</strong></div>}
                {!isMC && !isEssay && saResult?.feedback && <div style={{ fontSize: 13, color: 'var(--ink)', background: '#fff', border: '1px solid var(--border)', borderLeft: `3px solid ${scoreColor(saResult.score ?? 0)}`, padding: '8px 12px', borderRadius: '0 4px 4px 0', lineHeight: 1.6 }}>💬 {saResult.feedback}</div>}
                {isEssay && essayResult && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {essayResult.breakdown && (
                      <div className="essay-score-breakdown">
                        {Object.entries(essayResult.breakdown).map(([key, val]) => (
                          <div key={key} className="essay-score-cell">
                            <div className="essay-score-label">{key}</div>
                            <div className="essay-score-value" style={{ color: scoreColor(val * 4) }}>{val}<span className="essay-score-denom">/25</span></div>
                          </div>
                        ))}
                      </div>
                    )}
                    {essayResult.feedback && <div style={{ fontSize: 13, color: 'var(--ink)', background: '#fff', border: '1px solid var(--border)', borderLeft: `3px solid ${scoreColor(essayResult.score ?? 0)}`, padding: '10px 14px', borderRadius: '0 4px 4px 0', lineHeight: 1.7 }}>💬 {essayResult.feedback}</div>}
                    {essayResult.tagged_response && (
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Your essay — annotated</p>
                        <TaggedEssay text={essayResult.tagged_response} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>

      ) : (
        /* ══════════ TAKING VIEW ══════════ */
        <div className="assignment-layout">
          <div className="assignment-sources-panel">
            <div className="assignment-sources-header">
              Sources
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>{sources.length} document{sources.length !== 1 ? 's' : ''}</span>
            </div>
            {sources.map((s, i) => (
              <div key={i} className="assignment-source-block">
                <button className={`assignment-source-toggle ${expandedSource === i ? 'assignment-source-toggle--active' : ''}`}
                  onClick={() => setExpandedSource(expandedSource === i ? null : i)}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`assignment-student-badge assignment-student-badge--${s.source_type}`}>{s.source_type === 'primary' ? 'Primary' : 'Secondary'}</span>
                    </div>
                    <span className="assignment-source-toggle-title">{s.title}</span>
                  </div>
                  <span style={{ fontSize: 16, color: 'var(--muted)', flexShrink: 0 }}>{expandedSource === i ? '−' : '+'}</span>
                </button>
                {expandedSource === i && <div className="assignment-source-body">{s.content}</div>}
              </div>
            ))}
          </div>

          <div className="assignment-questions-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>{totalCount} question{totalCount !== 1 ? 's' : ''} · {answeredCount}/{totalCount} answered</p>
              <div style={{ height: 4, width: 120, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${totalCount ? (answeredCount / totalCount) * 100 : 0}%`, background: 'var(--rust)', borderRadius: 2, transition: 'width 0.2s' }} />
              </div>
            </div>

            {questions.map((q, i) => (
              <div key={q.id} className="quiz-student-question">
                <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Question {i + 1} · {typeLabel(q.type)}</div>
                <div className="quiz-student-question-text quiz-student-question-text--markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(q.question_text) }} />

                {q.type === 'multiple_choice' && (
                  <div className="quiz-options-list">
                    {q.options?.map((opt, oi) => (
                      <button key={oi} className={`quiz-option-btn ${answers[q.id] === opt ? 'quiz-option-btn--selected' : ''}`} onClick={() => handleAnswer(q.id, opt)}>
                        <span className="quiz-option-bullet">{answers[q.id] === opt ? '✓' : String.fromCharCode(65 + oi)}</span>{opt}
                      </button>
                    ))}
                  </div>
                )}
                {q.type === 'short_answer' && (
                  <textarea className="quiz-short-answer" value={answers[q.id] || ''} onChange={e => handleAnswer(q.id, e.target.value)} placeholder="Type your answer here…" rows={3} />
                )}
                {q.type === 'essay' && (
                  <>
                    {/* Only show guide button if teacher has it enabled */}
                    {guideEnabled && (
                      <button onClick={() => openGuide(q)} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        marginBottom: 10, padding: '6px 12px',
                        background: '#fef3cd', border: '1px solid #f0c040',
                        borderRadius: 4, cursor: 'pointer', fontSize: 12,
                        fontWeight: 600, color: '#7a5c00', fontFamily: 'var(--font-body)',
                      }}>
                        ✍️ Open Essay Guide
                        <span style={{ fontSize: 11, fontWeight: 400 }}>— plan your outline & get coaching</span>
                      </button>
                    )}
                    <div className="essay-writing-hints">
                      <span className="essay-hint essay-hint--thesis">Thesis</span>
                      <span className="essay-hint essay-hint--evidence">Evidence</span>
                      <span className="essay-hint essay-hint--analysis">Analysis</span>
                      <span className="essay-hint essay-hint--counterclaim">Counterclaim</span>
                    </div>
                    <textarea className="quiz-essay-answer" value={answers[q.id] || ''} onChange={e => handleAnswer(q.id, e.target.value)}
                      placeholder="Write your essay response here. Use the sources above as evidence — cite specific details, make a clear argument, and address a counterargument…" rows={12} />
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, textAlign: 'right' }}>
                      {(answers[q.id] || '').trim().split(/\s+/).filter(Boolean).length} words
                    </div>
                  </>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ padding: '11px 32px', fontSize: 14 }}>
                {submitting ? 'Submitting…' : 'Submit Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      <EssayGuide
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        question={guideQuestion}
        essayDraft={answers[guideQuestionId] || ''}
      />
    </div>
  );
}