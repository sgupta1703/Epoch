import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getQuiz, submitQuiz, getQuizResults } from '../../api/quiz';
import { renderMarkdown } from '../../utils/renderMarkdown';
import '../../styles/pages.css';
import './Student.css';

function scoreColor(score) {
  if (score >= 70) return '#2a7a2a';
  if (score >= 40) return '#b8860b';
  return '#c0392b';
}

function normalizeMcAnswer(answer) {
  return String(answer || '').trim().replace(/^[A-Z]\)\s*/i, '').replace(/^[A-Z][.: -]+\s*/i, '').replace(/\s+/g, ' ').toLowerCase();
}

function isMatchingMcAnswer(studentAnswer, correctAnswer) {
  return normalizeMcAnswer(studentAnswer) !== '' && normalizeMcAnswer(studentAnswer) === normalizeMcAnswer(correctAnswer);
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

function typeLabel(type) {
  if (type === 'multiple_choice') return 'Multiple Choice';
  if (type === 'essay') return 'Essay';
  return 'Short Answer';
}

export default function QuizView({ user }) {
  const { unitId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchAll(); }, [unitId]);

  async function fetchAll() {
    setLoading(true); setError('');
    try {
      const { quiz } = await getQuiz(unitId);
      setQuiz(quiz);
      if (quiz) {
        try {
          const { submission } = await getQuizResults(unitId, user.id);
          if (submission) setSubmission(submission);
        } catch { /* no submission yet */ }
      }
    } catch { setError('Failed to load quiz.'); }
    finally { setLoading(false); }
  }

  function handleAnswer(questionId, answer) {
    setAnswers(a => ({ ...a, [questionId]: answer }));
  }

  async function handleSubmit() {
    if (!quiz?.questions) return;
    const unanswered = quiz.questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) { setError(`Please answer all questions. ${unanswered.length} remaining.`); return; }
    setError(''); setSubmitting(true);
    try {
      const payload = quiz.questions.map(q => ({ question_id: q.id, answer: answers[q.id] }));
      const { submission } = await submitQuiz(unitId, { answers: payload });
      setSubmission(submission);
    } catch (err) { setError(err.response?.data?.error || 'Failed to submit quiz.'); }
    finally { setSubmitting(false); }
  }

  const answeredCount = Object.keys(answers).length;
  const totalCount = quiz?.questions?.length || 0;

  if (loading) return <LoadingSpinner label="Loading quiz…" />;

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      {!quiz ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h3>No quiz yet</h3>
          <p>Your teacher hasn't created a quiz for this unit yet.</p>
        </div>

      ) : submission ? (
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

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 16 }}>Your Answers</h2>

          {quiz.questions.map((q, i) => {
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
                  <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    Question {i + 1} · {typeLabel(q.type)}
                  </span>
                  {isMC && mcResult && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: isCorrect ? '#2a7a2a' : '#c0392b', background: isCorrect ? '#eaf6ea' : '#fdecea', padding: '2px 8px', borderRadius: 10 }}>
                      {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  )}
                  {!isMC && !isEssay && saResult?.score !== null && saResult?.score !== undefined && (
                    <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor(saResult.score) }}>{saResult.score}%</span>
                  )}
                  {isEssay && essayResult?.score !== null && essayResult?.score !== undefined && (
                    <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor(essayResult.score) }}>{essayResult.score}%</span>
                  )}
                </div>

                <div className="quiz-student-question-text quiz-student-question-text--markdown"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(q.question_text) }} />

                <div style={{ fontSize: 13, color: 'var(--muted)', background: 'var(--cream)', padding: '8px 12px', borderRadius: 4, marginBottom: 8 }}>
                  {isEssay
                    ? <><strong style={{ color: 'var(--ink)' }}>Your essay:</strong><br />{studentAnswer?.answer || '—'}</>
                    : <>Your answer: <strong style={{ color: 'var(--ink)' }}>{studentAnswer?.answer || '—'}</strong></>
                  }
                </div>

                {isMC && !isCorrect && mcResult?.correct_answer && (
                  <div style={{ fontSize: 13, color: '#2a7a2a', background: '#eaf6ea', padding: '8px 12px', borderRadius: 4 }}>
                    Correct answer: <strong>{mcResult.correct_answer}</strong>
                  </div>
                )}
                {!isMC && !isEssay && saResult?.feedback && (
                  <div style={{ fontSize: 13, color: 'var(--ink)', background: '#fff', border: '1px solid var(--border)', borderLeft: `3px solid ${scoreColor(saResult.score ?? 0)}`, padding: '8px 12px', borderRadius: '0 4px 4px 0', lineHeight: 1.6 }}>
                    💬 {saResult.feedback}
                  </div>
                )}
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
                    {essayResult.feedback && (
                      <div style={{ fontSize: 13, color: 'var(--ink)', background: '#fff', border: '1px solid var(--border)', borderLeft: `3px solid ${scoreColor(essayResult.score ?? 0)}`, padding: '10px 14px', borderRadius: '0 4px 4px 0', lineHeight: 1.7 }}>
                        💬 {essayResult.feedback}
                      </div>
                    )}
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
        /* ══════════ QUIZ TAKING VIEW ══════════ */
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              {totalCount} question{totalCount !== 1 ? 's' : ''} · {answeredCount}/{totalCount} answered
            </p>
            <div style={{ height: 4, width: 160, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${totalCount ? (answeredCount / totalCount) * 100 : 0}%`, background: 'var(--rust)', borderRadius: 2, transition: 'width 0.2s' }} />
            </div>
          </div>

          {quiz.questions.map((q, i) => (
            <div key={q.id} className="quiz-student-question">
              <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Question {i + 1} · {typeLabel(q.type)}
              </div>
              <div className="quiz-student-question-text quiz-student-question-text--markdown"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(q.question_text) }} />

              {q.type === 'multiple_choice' && (
                <div className="quiz-options-list">
                  {q.options?.map((opt, oi) => (
                    <button key={oi}
                      className={`quiz-option-btn ${answers[q.id] === opt ? 'quiz-option-btn--selected' : ''}`}
                      onClick={() => handleAnswer(q.id, opt)}>
                      <span className="quiz-option-bullet">{answers[q.id] === opt ? '✓' : String.fromCharCode(65 + oi)}</span>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {q.type === 'short_answer' && (
                <textarea className="quiz-short-answer" value={answers[q.id] || ''}
                  onChange={e => handleAnswer(q.id, e.target.value)}
                  placeholder="Type your answer here…" rows={3} />
              )}
              {q.type === 'essay' && (
                <>
                  <div className="essay-writing-hints">
                    <span className="essay-hint essay-hint--thesis">Thesis</span>
                    <span className="essay-hint essay-hint--evidence">Evidence</span>
                    <span className="essay-hint essay-hint--analysis">Analysis</span>
                    <span className="essay-hint essay-hint--counterclaim">Counterclaim</span>
                  </div>
                  <textarea className="quiz-essay-answer" value={answers[q.id] || ''}
                    onChange={e => handleAnswer(q.id, e.target.value)}
                    placeholder="Write your essay response here…" rows={12} />
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, textAlign: 'right' }}>
                    {(answers[q.id] || '').trim().split(/\s+/).filter(Boolean).length} words
                  </div>
                </>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ padding: '11px 32px', fontSize: 14 }}>
              {submitting ? 'Submitting…' : 'Submit Quiz'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}