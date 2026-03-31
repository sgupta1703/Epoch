import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  getPersonas, sendMessage, getConversation, updateMissionsProgress,
  generatePersonaQuiz, submitPersonaQuiz, getPersonaQuiz,
} from '../../api/personas';
import { renderMarkdown } from '../../utils/renderMarkdown';
import '../../styles/pages.css';
import './Student.css';

const PERSONA_EMOJIS = ['👨‍⚖️', '👩‍🌾', '🪖', '👸', '🧓', '⚔️', '🧙', '🏛️', '✍️', '🕊️'];
const WARP_HOLD_MS   = 700;
const WARP_EXIT_MS   = 860;
const WARP_DURATION_MS = 4000;

function formatHistoricalYear(year) {
  const n = Number(year);
  if (!Number.isFinite(n)) return '';
  return n < 0 ? `${Math.abs(n)} BCE` : String(n);
}

function formatPersonaEra(startYear, endYear) {
  const start = Number(startYear);
  const end   = Number(endYear);
  if (!Number.isFinite(start)) return '';
  if (!Number.isFinite(end) || start === end) return formatHistoricalYear(start);
  return `${formatHistoricalYear(start)} - ${formatHistoricalYear(end)}`;
}

function formatDueDateLabel(dueDate) {
  if (!dueDate) return '';
  return `Due ${new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function easeInOutCubic(p) {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

function shouldReduceMotion() {
  if (typeof window === 'undefined') return false;
  return (
    document.body.classList.contains('epoch-reduce-motion') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function getCurrentClockAngles(date = new Date()) {
  const seconds = date.getSeconds() + date.getMilliseconds() / 1000;
  const minutes = date.getMinutes() + seconds / 60;
  const hours = (date.getHours() % 12) + minutes / 60;
  return { hr: hours * 30, mn: minutes * 6, sc: seconds * 6 };
}

function drawTickMarks(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const cx = w / 2, cy = w / 2, r = w / 2 - 4;
  ctx.clearRect(0, 0, w, w);
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const major = i % 5 === 0;
    const len   = major ? 10 : 5;
    const x1 = cx + Math.cos(angle) * (r - 1);
    const y1 = cy + Math.sin(angle) * (r - 1);
    const x2 = cx + Math.cos(angle) * (r - 1 - len);
    const y2 = cy + Math.sin(angle) * (r - 1 - len);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(94,67,43,0.55)';
    ctx.lineWidth   = major ? 1.5 : 0.75;
    ctx.stroke();
  }
}

/* ─── Persona Quiz Component ─── */
function PersonaQuizView({ persona, quiz, onSubmit }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!quiz) return null;

  const questions = quiz.questions || [];
  const isSubmitted = !!quiz.submitted_at;

  if (isSubmitted) {
    const gradedAnswers = quiz.answers || [];
    return (
      <div className="persona-quiz-results">
        <div style={{
          textAlign: 'center',
          padding: '24px 0 16px',
          borderBottom: '1px solid var(--border)',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>
            {quiz.score >= 70 ? '🏆' : quiz.score >= 40 ? '📖' : '💡'}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: quiz.score >= 70 ? '#2a7a2a' : quiz.score >= 40 ? '#b8860b' : '#c0392b' }}>
            {quiz.score}%
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            Quiz score for your conversation with {persona.name}
          </div>
        </div>

        {questions.map((q, i) => {
          const ga = gradedAnswers.find(a => a.question_id === q.id);
          const isCorrect = ga?.score >= 70;
          return (
            <div key={q.id} style={{
              marginBottom: 20,
              padding: '14px 16px',
              borderRadius: 10,
              border: `1px solid ${isCorrect ? '#c6e6c6' : '#f5c6c6'}`,
              background: isCorrect ? '#f0faf0' : '#fdf0f0',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
                {i + 1}. {q.question_text}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
                Your answer: <span style={{ color: 'var(--ink)' }}>{ga?.answer || '—'}</span>
              </div>
              {!isCorrect && (
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
                  Correct answer: <span style={{ color: '#2a7a2a', fontWeight: 500 }}>{q.correct_answer}</span>
                </div>
              )}
              {ga?.feedback && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, fontStyle: 'italic' }}>
                  {ga.feedback}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  async function handleSubmit() {
    const answersArr = questions.map(q => ({
      question_id: q.id,
      answer: answers[q.id] || '',
    }));
    const unanswered = answersArr.filter(a => !a.answer.trim()).length;
    if (unanswered > 0) {
      setError(`Please answer all questions (${unanswered} remaining).`);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(answersArr);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit quiz.');
      setSubmitting(false);
    }
  }

  return (
    <div className="persona-quiz-take">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
          Quiz: Your conversation with {persona.name}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          These questions are based on what you discussed. Answer carefully — you can only submit once.
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {questions.map((q, i) => (
        <div key={q.id} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>
            {i + 1}. {q.question_text}
          </div>
          {q.type === 'multiple_choice' && q.options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {q.options.map((opt, oi) => (
                <label key={oi} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: `2px solid ${answers[q.id] === opt ? 'var(--rust)' : 'var(--border)'}`,
                  background: answers[q.id] === opt ? 'rgba(181,69,27,0.05)' : '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--ink)',
                  transition: 'border-color 0.12s, background 0.12s',
                }}>
                  <input
                    type="radio"
                    name={`q_${q.id}`}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                    style={{ flexShrink: 0 }}
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}
          {q.type === 'short_answer' && (
            <textarea
              rows={3}
              value={answers[q.id] || ''}
              onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
              placeholder="Type your answer here…"
              style={{ width: '100%', fontSize: 13, resize: 'vertical' }}
            />
          )}
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ minWidth: 120 }}
        >
          {submitting ? 'Submitting…' : 'Submit Quiz'}
        </button>
      </div>
    </div>
  );
}

/* ─── Main PersonaChat ─── */
export default function PersonaChat() {
  const { unitId }       = useParams();
  const messagesEndRef   = useRef(null);
  const rafRef           = useRef(0);
  const holdTimerRef     = useRef(0);
  const hideTimerRef     = useRef(0);
  const tickCanvasRef    = useRef(null);
  const hrHandRef        = useRef(null);
  const mnHandRef        = useRef(null);
  const scHandRef        = useRef(null);
  const handAnglesRef    = useRef({ hr: 0, mn: 0, sc: 0 });
  const hasPlayedWarpIntroRef = useRef(false);

  const [personas, setPersonas]           = useState([]);
  const [activePersona, setActivePersona] = useState(null);
  const [messages, setMessages]           = useState([]);
  const [turnCount, setTurnCount]         = useState(0);
  const [completed, setCompleted]         = useState(false);
  const [completedMissions, setCompletedMissions] = useState([]);
  const [quizLocked, setQuizLocked]       = useState(false);
  const [loading, setLoading]             = useState(true);
  const [chatLoading, setChatLoading]     = useState(false);
  const [inputText, setInputText]         = useState('');
  const [error, setError]                 = useState('');

  // Quiz state
  const [quizView, setQuizView]           = useState(false); // showing quiz screen
  const [quiz, setQuiz]                   = useState(null);
  const [quizGenerating, setQuizGenerating] = useState(false);
  const [quizError, setQuizError]         = useState('');

  const currentYear = new Date().getFullYear();

  const [warpIntro, setWarpIntro] = useState({
    visible: false, exiting: false, displayYear: currentYear, bce: false, personaName: '', location: '',
  });

  const warpDisplayRef = useRef({ year: currentYear, bce: false });

  useEffect(() => { fetchAll(); }, [unitId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    hasPlayedWarpIntroRef.current = false;
  }, [unitId]);

  useEffect(() => {
    if (warpIntro.visible && tickCanvasRef.current) {
      drawTickMarks(tickCanvasRef.current);
    }
  }, [warpIntro.visible]);

  useEffect(() => () => clearTimers(), []);

  function clearTimers() {
    if (rafRef.current)       cancelAnimationFrame(rafRef.current);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    rafRef.current = holdTimerRef.current = hideTimerRef.current = 0;
  }

  function setHands(hr, mn, sc) {
    if (hrHandRef.current) hrHandRef.current.style.transform = `translateX(-50%) rotate(${hr}deg)`;
    if (mnHandRef.current) mnHandRef.current.style.transform = `translateX(-50%) rotate(${mn}deg)`;
    if (scHandRef.current) scHandRef.current.style.transform = `translateX(-50%) rotate(${sc}deg)`;
  }

  function startWarpIntro(persona) {
    const targetYear   = Number.isFinite(Number(persona?.year_start)) ? Number(persona.year_start) : currentYear;
    const reduceMotion = shouldReduceMotion();
    const durationMs   = reduceMotion ? 200 : WARP_DURATION_MS;
    const holdMs       = reduceMotion ? 80  : WARP_HOLD_MS;
    const exitMs       = reduceMotion ? 160 : WARP_EXIT_MS;
    const startClock   = getCurrentClockAngles();

    clearTimers();

    const fromYear = currentYear;
    const fromHr   = startClock.hr;
    const fromMn   = startClock.mn;
    const fromSc   = startClock.sc;

    const dist  = Math.abs(targetYear - fromYear);
    const spins = reduceMotion ? 0 : Math.max(2, Math.min(8, dist / 300));

    const toHr = fromHr - spins * 360;
    const toMn = fromMn - spins * 360 * 12;
    const toSc = fromSc - spins * 360 * 60;

    handAnglesRef.current = startClock;
    warpDisplayRef.current = { year: fromYear, bce: fromYear < 0 };
    setHands(fromHr, fromMn, fromSc);

    setWarpIntro({
      visible: true, exiting: false,
      displayYear: Math.abs(fromYear), bce: fromYear < 0,
      personaName: persona?.name || '', location: persona?.location || '',
    });

    const startTime = performance.now();

    function tick(now) {
      const p = Math.min(1, (now - startTime) / durationMs);
      const e = easeInOutCubic(p);

      const y   = fromYear + (targetYear - fromYear) * e;
      const hr  = fromHr + (toHr - fromHr) * e;
      const mn  = fromMn + (toMn - fromMn) * e;
      const sc  = fromSc + (toSc - fromSc) * e;

      warpDisplayRef.current = { year: Math.round(y), bce: y < 0 };
      setWarpIntro(prev => ({ ...prev, displayYear: Math.round(Math.abs(y)), bce: y < 0 }));
      setHands(hr, mn, sc);

      if (p < 1) { rafRef.current = requestAnimationFrame(tick); return; }

      handAnglesRef.current = { hr: toHr, mn: toMn, sc: toSc };
      warpDisplayRef.current = { year: targetYear, bce: targetYear < 0 };
      setWarpIntro(prev => ({ ...prev, displayYear: Math.abs(targetYear), bce: targetYear < 0 }));

      holdTimerRef.current = setTimeout(() => {
        setWarpIntro(prev => ({ ...prev, exiting: true }));
      }, holdMs);

      hideTimerRef.current = setTimeout(() => {
        setWarpIntro(prev => ({ ...prev, visible: false, exiting: false }));
      }, holdMs + exitMs);
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  async function fetchAll() {
    setLoading(true);
    try {
      const { personas: loaded } = await getPersonas(unitId);
      setPersonas(loaded);
      if (loaded.length > 0) {
        await selectPersona(loaded[0]);
      }
    } catch {
      setError('Failed to load personas.');
    } finally {
      setLoading(false);
    }
  }

  async function selectPersona(persona) {
    setActivePersona(persona);
    setMessages([]);
    setTurnCount(0);
    setCompleted(false);
    setCompletedMissions([]);
    setQuizLocked(false);
    setQuizView(false);
    setQuiz(null);
    setQuizError('');
    try {
      const { conversation } = await getConversation(persona.id);
      if (conversation) {
        setMessages(conversation.messages || []);
        setTurnCount(conversation.turn_count || 0);
        setCompleted(conversation.completed || false);
        setCompletedMissions(conversation.completed_missions || []);
        setQuizLocked(conversation.quiz_locked || false);
      }

      // If quiz mode and already completed, check for existing quiz
      if (persona.mode === 'quiz') {
        try {
          const { quiz: existingQuiz } = await getPersonaQuiz(persona.id);
          if (existingQuiz) {
            setQuiz(existingQuiz);
            setQuizView(true);
          }
        } catch { /* no quiz yet */ }
      }
    } catch { /* first conversation */ }
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || chatLoading) return;
    setInputText('');
    setError('');
    setMessages(cur => [...cur, { role: 'user', content: text }]);
    setChatLoading(true);
    try {
      const { reply, turn_count, completed: done } = await sendMessage(activePersona.id, { message: text });
      setMessages(cur => [...cur, { role: 'assistant', content: reply }]);
      setTurnCount(turn_count);
      setCompleted(done);
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.error?.includes('locked')) {
        setQuizLocked(true);
        setError('');
      } else {
        setError(err.response?.data?.error || 'Failed to send message.');
        setMessages(cur => cur.slice(0, -1));
      }
    } finally {
      setChatLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handlePersonaClick(p) {
    if (p.id === activePersona?.id) return;
    if (!hasPlayedWarpIntroRef.current) {
      hasPlayedWarpIntroRef.current = true;
      startWarpIntro(p);
    }
    selectPersona(p);
  }

  async function toggleMission(missionId) {
    const next = completedMissions.includes(missionId)
      ? completedMissions.filter(id => id !== missionId)
      : [...completedMissions, missionId];
    setCompletedMissions(next);
    try {
      await updateMissionsProgress(activePersona.id, next);
    } catch { /* silent */ }
  }

  async function handleStartQuiz() {
    setQuizGenerating(true);
    setQuizError('');
    try {
      const { quiz: generated } = await generatePersonaQuiz(activePersona.id);
      setQuiz(generated);
      setQuizLocked(true);
      setQuizView(true);
    } catch (err) {
      setQuizError(err.response?.data?.error || 'Failed to generate quiz. Try again.');
    } finally {
      setQuizGenerating(false);
    }
  }

  async function handleQuizSubmit(answers) {
    const { submission } = await submitPersonaQuiz(activePersona.id, answers);
    setQuiz(submission);
  }

  const progressPct = activePersona
    ? Math.min(100, Math.round((turnCount / activePersona.min_turns) * 100))
    : 0;

  const activePersonaMeta = activePersona
    ? [
        formatPersonaEra(activePersona.year_start, activePersona.year_end),
        activePersona.location || '',
        formatDueDateLabel(activePersona.due_date),
      ].filter(Boolean).join(' | ')
    : '';

  const mode = activePersona?.mode || 'free';
  const missions = activePersona?.missions || [];

  if (loading) return <LoadingSpinner label="Loading personas..." />;

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      {personas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎭</div>
          <h3>No personas yet</h3>
          <p>Your teacher hasn't added any personas to this unit.</p>
        </div>
      ) : (
        <>
          {personas.length > 1 && (
            <div className="persona-tabs">
              {personas.map((p, i) => (
                <button
                  key={p.id}
                  className={`persona-tab${activePersona?.id === p.id ? ' persona-tab--active' : ''}`}
                  onClick={() => handlePersonaClick(p)}
                >
                  <span className="persona-tab-emoji">{PERSONA_EMOJIS[i % PERSONA_EMOJIS.length]}</span>
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {activePersona && (
            <div className="persona-chat-wrap">

              {warpIntro.visible && (
                <div className={`warp-overlay${warpIntro.exiting ? ' warp-overlay--exit' : ''}`} aria-hidden="true">
                  <div className="warp-vignette" />
                  <div className="warp-clock-ghost" aria-hidden="true">
                    <canvas ref={tickCanvasRef} className="warp-clock-canvas" width={300} height={300} />
                    <span className="warp-hand warp-hand--hour" ref={hrHandRef} />
                    <span className="warp-hand warp-hand--minute" ref={mnHandRef} />
                    <span className="warp-hand warp-hand--second" ref={scHandRef} />
                    <span className="warp-clock-center" />
                    <div className="warp-clock-ring warp-clock-ring--outer" />
                    <div className="warp-clock-ring warp-clock-ring--inner" />
                  </div>
                  <div className="warp-year-display">
                    <div className="warp-year-label">year</div>
                    <div className="warp-year-number">{warpIntro.displayYear}</div>
                    <div className="warp-year-divider" />
                    <div className="warp-year-era">{warpIntro.bce ? 'B.C.' : 'A.D.'}</div>
                  </div>
                </div>
              )}

              <div className="persona-header">
                <div className="persona-header-avatar">
                  {PERSONA_EMOJIS[personas.indexOf(activePersona) % PERSONA_EMOJIS.length]}
                </div>
                <div className="persona-header-info">
                  <div className="persona-header-name">{activePersona.name}</div>
                  <div className="persona-header-meta">{activePersonaMeta}</div>
                </div>
                <div className="persona-progress">
                  <span className="persona-progress-label">
                    {completed ? 'Complete' : `${turnCount} / ${activePersona.min_turns} exchanges`}
                  </span>
                  <div className="persona-progress-bar">
                    <div
                      className="persona-progress-fill"
                      style={{ width: `${progressPct}%`, background: completed ? '#2a7a2a' : undefined }}
                    />
                  </div>
                </div>
              </div>

              {/* ── Layout changes based on mode ── */}
              {mode === 'missions' && missions.length > 0 && (
                <div className="persona-missions-panel">
                  <div className="persona-missions-title">🎯 Missions</div>
                  {missions.map(m => {
                    const done = completedMissions.includes(m.id);
                    return (
                      <label key={m.id} className={`persona-mission-item${done ? ' persona-mission-item--done' : ''}`}>
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() => toggleMission(m.id)}
                          className="persona-mission-check"
                        />
                        <span className="persona-mission-text">{m.text}</span>
                      </label>
                    );
                  })}
                  <div className="persona-missions-progress">
                    {completedMissions.length} / {missions.length} missions completed
                  </div>
                </div>
              )}

              {/* ── Quiz view (quiz mode, after completing chat) ── */}
              {quizView && quiz ? (
                <div style={{ padding: '0 0 16px' }}>
                  <PersonaQuizView
                    persona={activePersona}
                    quiz={quiz}
                    onSubmit={handleQuizSubmit}
                  />
                </div>
              ) : (
                <>
                  <div className="chat-messages">
                    {messages.length === 0 && (
                      <p className="chat-empty-hint">
                        {mode === 'missions' && missions.length > 0
                          ? `Work through the missions above by chatting with ${activePersona.name}.`
                          : `Ask ${activePersona.name} anything about this period in history.`}
                      </p>
                    )}
                    {messages.map((m, i) => (
                      <div key={i} className={`chat-bubble chat-bubble--${m.role}`}>
                        <span className="chat-bubble-sender">
                          {m.role === 'user' ? 'You' : activePersona.name}
                        </span>
                        {m.role === 'assistant'
                          ? <div className="chat-bubble-text chat-bubble-text--markdown"
                                 dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                          : <div className="chat-bubble-text">{m.content}</div>}
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="chat-bubble chat-bubble--assistant">
                        <span className="chat-bubble-sender">{activePersona.name}</span>
                        <div className="chat-bubble-text chat-bubble-text--typing">
                          <span /><span /><span />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* ── Completion banners and actions ── */}
                  {completed && mode === 'free' && (
                    <div className="chat-completed-banner">
                      Goal reached — {activePersona.min_turns} exchanges complete. Feel free to keep going.
                    </div>
                  )}

                  {completed && mode === 'missions' && (
                    <div className="chat-completed-banner">
                      Goal reached — {activePersona.min_turns} exchanges complete.
                      {missions.length > 0 && completedMissions.length < missions.length && (
                        <span> Check off any remaining missions above.</span>
                      )}
                    </div>
                  )}

                  {completed && mode === 'quiz' && !quizLocked && (
                    <div className="chat-quiz-prompt">
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>
                        Conversation complete! Time to take your quiz.
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
                        Your quiz will be generated based on what you discussed with {activePersona.name}.
                        Once you start, you won't be able to return to this chat.
                      </div>
                      {quizError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{quizError}</div>}
                      <button
                        className="btn btn-primary"
                        onClick={handleStartQuiz}
                        disabled={quizGenerating}
                        style={{ minWidth: 140 }}
                      >
                        {quizGenerating ? 'Generating quiz…' : 'Start Quiz →'}
                      </button>
                    </div>
                  )}

                  {quizLocked && !quizView && (
                    <div className="chat-quiz-prompt">
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Your quiz is ready.</div>
                      <button
                        className="btn btn-primary"
                        onClick={() => setQuizView(true)}
                      >
                        {quiz?.submitted_at ? 'View Quiz Results' : 'Take Quiz →'}
                      </button>
                    </div>
                  )}

                  {!quizLocked && (
                    <div className="chat-input-row">
                      <textarea
                        className="chat-input"
                        rows={2}
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message ${activePersona.name}...`}
                        disabled={chatLoading}
                      />
                      <button
                        className="btn btn-primary chat-send-btn"
                        onClick={handleSend}
                        disabled={chatLoading || !inputText.trim()}
                      >
                        Send
                      </button>
                    </div>
                  )}
                </>
              )}

            </div>
          )}
        </>
      )}
    </div>
  );
}
