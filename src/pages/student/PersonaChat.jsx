import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import HighlightPopup from '../../components/HighlightPopup';
import {
  getPersonas, sendMessage, getConversation,
  generatePersonaQuiz, submitPersonaQuiz, getPersonaQuiz,
} from '../../api/personas';
import { lookupTerm, saveGlossaryTerm } from '../../api/glossary';
import { renderMarkdown } from '../../utils/renderMarkdown';
import '../../styles/pages.css';
import './Student.css';

const PERSONA_EMOJIS = ['👨‍⚖️', '👩‍🌾', '🪖', '👸', '🧓', '⚔️', '🧙', '🏛️', '✍️', '🕊️'];

function getEmoji(persona, index) {
  return persona?.emoji || PERSONA_EMOJIS[index % PERSONA_EMOJIS.length];
}

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
  return `${formatHistoricalYear(start)} – ${formatHistoricalYear(end)}`;
}

function formatDueDateLabel(dueDate) {
  if (!dueDate) return '';
  return `Due ${new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}


/* ─── Persona Quiz Component ─── */
function PersonaQuizView({ persona, quiz, onSubmit }) {
  const [answers, setAnswers]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');

  if (!quiz) return null;

  const questions  = quiz.questions || [];
  const isSubmitted = !!quiz.submitted_at;

  /* ── Results screen ── */
  if (isSubmitted) {
    const gradedAnswers = quiz.answers || [];
    const correctCount  = gradedAnswers.filter(a => (a.score ?? 0) >= 70).length;
    const scoreClass    = quiz.score >= 70 ? 'pq-score--high' : quiz.score >= 40 ? 'pq-score--mid' : 'pq-score--low';
    const scoreEmoji    = quiz.score >= 70 ? '🏆' : quiz.score >= 40 ? '📖' : '💡';

    return (
      <div className="pq-results">
        <div className="pq-score-card">
          <div className="pq-score-emoji">{scoreEmoji}</div>
          <div className={`pq-score-num ${scoreClass}`}>{quiz.score}%</div>
          <div className="pq-score-label">{correctCount} of {questions.length} correct</div>
          <div className="pq-score-sub">Based on your conversation with {persona.name}</div>
        </div>

        <div className="pq-results-list">
          {questions.map((q, i) => {
            const ga      = gradedAnswers.find(a => a.question_id === q.id);
            const correct = (ga?.score ?? 0) >= 70;
            return (
              <div key={q.id} className={`pq-result-item${correct ? ' pq-result-item--correct' : ' pq-result-item--wrong'}`}>
                <div className="pq-result-top">
                  <span className="pq-result-num">Q{i + 1}</span>
                  <span className={`pq-result-badge${correct ? ' pq-result-badge--correct' : ' pq-result-badge--wrong'}`}>
                    {correct ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                </div>
                <div className="pq-result-q">{q.question_text}</div>
                <div className="pq-result-row">
                  <span className="pq-result-row-label">Your answer:</span>
                  <span className={correct ? 'pq-ans--correct' : 'pq-ans--wrong'}>{ga?.answer || '—'}</span>
                </div>
                {!correct && (
                  <div className="pq-result-row">
                    <span className="pq-result-row-label">Correct answer:</span>
                    <span className="pq-ans--correct">{q.correct_answer}</span>
                  </div>
                )}
                {ga?.feedback && <div className="pq-result-feedback">{ga.feedback}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Taking the quiz ── */
  async function handleSubmit() {
    const answersArr = questions.map(q => ({ question_id: q.id, answer: answers[q.id] || '' }));
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

  const answeredCount = questions.filter(q => answers[q.id]?.trim()).length;
  const allAnswered   = answeredCount === questions.length;

  return (
    <div className="pq-take">
      <div className="pq-take-header">
        <div className="pq-take-title">📝 Quiz — {persona.name}</div>
        <div className="pq-take-sub">
          These questions are based on what you discussed. Answer carefully — you can only submit once.
        </div>
        <div className="pq-take-bar-row">
          <div className="pq-take-bar">
            <div className="pq-take-bar-fill" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
          </div>
          <span className="pq-take-bar-label">{answeredCount} / {questions.length} answered</span>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ margin: '0 24px 4px' }}>{error}</div>}

      <div className="pq-questions">
        {questions.map((q, i) => (
          <div key={q.id} className="pq-question">
            <div className="pq-question-header">
              <span className="pq-question-num">{i + 1}</span>
              <span className="pq-question-type">
                {q.type === 'multiple_choice' ? 'Multiple Choice' : 'Short Answer'}
              </span>
            </div>
            <div className="pq-question-text">{q.question_text}</div>

            {q.type === 'multiple_choice' && q.options && (
              <div className="pq-options">
                {q.options.map((opt, oi) => {
                  const selected = answers[q.id] === opt;
                  return (
                    <div
                      key={oi}
                      className={`pq-option${selected ? ' pq-option--selected' : ''}`}
                      onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                    >
                      <div className={`pq-radio${selected ? ' pq-radio--checked' : ''}`} />
                      <span className="pq-option-text">{opt}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {q.type === 'short_answer' && (
              <textarea
                className="pq-sa"
                rows={3}
                value={answers[q.id] || ''}
                onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                placeholder="Write your answer here…"
              />
            )}
          </div>
        ))}
      </div>

      <div className="pq-submit-row">
        <span className="pq-submit-hint">
          {allAnswered ? '✓ All questions answered' : `${questions.length - answeredCount} question${questions.length - answeredCount !== 1 ? 's' : ''} remaining`}
        </span>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={submitting || !allAnswered}
          style={{ minWidth: 130 }}
        >
          {submitting ? 'Submitting…' : 'Submit Quiz'}
        </button>
      </div>
    </div>
  );
}

/* ─── Main PersonaChat ─── */
export default function PersonaChat({ unit }) {
  const { unitId }     = useParams();
  const location       = useLocation();
  const messagesEndRef  = useRef(null);
  const messagesContainerRef = useRef(null);
  const shouldScrollRef = useRef(false);
  const highlightTimerRef = useRef(null);

  const [personas, setPersonas]                   = useState([]);
  const [activePersona, setActivePersona]         = useState(null);
  const [messages, setMessages]                   = useState([]);
  const [turnCount, setTurnCount]                 = useState(0);
  const [completed, setCompleted]                 = useState(false);
  const [completedMissions, setCompletedMissions] = useState([]);
  const [quizLocked, setQuizLocked]               = useState(false);
  const [loading, setLoading]                     = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [historyCount, setHistoryCount]           = useState(0);
  const [chatLoading, setChatLoading]             = useState(false);
  const [inputText, setInputText]                 = useState('');
  const [error, setError]                         = useState('');
  const [missionsOpen, setMissionsOpen]           = useState(false);
  const [highlightedMessageIndex, setHighlightedMessageIndex] = useState(null);

  // Quiz state
  const [quizView, setQuizView]             = useState(false);
  const [quiz, setQuiz]                     = useState(null);
  const [quizGenerating, setQuizGenerating] = useState(false);
  const [quizError, setQuizError]           = useState('');

  // Highlight popup state
  const [popup, setPopup] = useState(null);
  // popup shape: { term, messageIndex, messageSnippet, position: { top, left, selectionTop }, contextInfo, loading, saved }

  // Navigation state for scroll-to-message (from Glossary "Go to chat")
  const scrollTarget = location.state?.scrollToMessageIndex;
  const scrollPersonaId = location.state?.scrollToPersonaId;

  useEffect(() => { fetchAll(); }, [unitId]);

  useEffect(() => {
    if (!shouldScrollRef.current) return;
    shouldScrollRef.current = false;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Scroll to highlighted message after load
  useEffect(() => {
    if (scrollTarget == null || messages.length === 0) return;
    if (activePersona?.id !== scrollPersonaId) return;

    const el = document.querySelector(`[data-message-index="${scrollTarget}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageIndex(scrollTarget);
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => setHighlightedMessageIndex(null), 2500);
    }
  }, [messages, activePersona, scrollTarget, scrollPersonaId]);

  // Clean up highlight timer on unmount
  useEffect(() => () => clearTimeout(highlightTimerRef.current), []);

  // Close popup when the chat container scrolls
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    function handleScroll() { setPopup(null); }
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Text selection → highlight popup
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    function handleMouseUp() {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (!text || text.length < 2 || text.length > 300) {
        setPopup(null);
        return;
      }

      // Walk up from anchor node to find data-message-index
      let messageIndex = null;
      let node = selection.anchorNode;
      while (node && node !== container) {
        if (node.nodeType === 1 && node.dataset?.messageIndex !== undefined) {
          messageIndex = parseInt(node.dataset.messageIndex, 10);
          break;
        }
        node = node.parentElement;
      }

      // Only allow highlighting assistant messages
      if (messageIndex == null) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Grab ~120 chars of surrounding message as snippet
      const msgContent = messages[messageIndex]?.content || '';
      const snippet = msgContent.length > 120 ? msgContent.slice(0, 120) + '…' : msgContent;

      const pos = {
        top: rect.bottom + 8,
        left: rect.left,
        selectionTop: rect.top - 8,
      };

      setPopup({
        term: text,
        messageIndex,
        messageSnippet: snippet,
        position: pos,
        contextInfo: '',
        loading: false,
        saved: false,
      });
    }

    container.addEventListener('mouseup', handleMouseUp);
    return () => container.removeEventListener('mouseup', handleMouseUp);
  }, [messages]);

  function getPopupLookupArgs() {
    return {
      term: popup.term,
      unit_title: unit?.title,
      unit_context: unit?.context,
      persona_name: activePersona?.name,
      persona_era: activePersona ? formatPersonaEra(activePersona.year_start, activePersona.year_end) : '',
      message_snippet: popup.messageSnippet,
    };
  }

  async function handlePopupLookup() {
    if (!popup) return;
    setPopup(p => p ? { ...p, loading: true } : null);
    try {
      const { context_info } = await lookupTerm(getPopupLookupArgs());
      setPopup(p => p ? { ...p, loading: false, contextInfo: context_info } : null);
    } catch {
      setPopup(p => p ? { ...p, loading: false, contextInfo: 'Could not load context. Try again.' } : null);
    }
  }

  async function handlePopupAddToGlossary() {
    if (!popup || !unitId) return;
    setPopup(p => p ? { ...p, loading: true } : null);
    try {
      const { context_info } = await lookupTerm(getPopupLookupArgs());
      await saveGlossaryTerm(unitId, {
        persona_id:      activePersona?.id,
        term:            popup.term,
        context_info,
        message_index:   popup.messageIndex,
        message_snippet: popup.messageSnippet,
      });
      setPopup(p => p ? { ...p, loading: false, added: true } : null);
    } catch {
      setPopup(p => p ? { ...p, loading: false, addError: true } : null);
    }
  }

  async function handlePopupSave() {
    if (!popup || !unitId) return;
    try {
      await saveGlossaryTerm(unitId, {
        persona_id:      activePersona?.id,
        term:            popup.term,
        context_info:    popup.contextInfo,
        message_index:   popup.messageIndex,
        message_snippet: popup.messageSnippet,
      });
      setPopup(p => p ? { ...p, saved: true } : null);
    } catch {
      /* silently fail — user can retry */
    }
  }

  async function fetchAll() {
    setLoading(true);
    try {
      const { personas: loaded } = await getPersonas(unitId);
      setPersonas(loaded);
      if (loaded.length > 0) {
        // If navigating from Glossary, select the target persona
        const target = scrollPersonaId
          ? (loaded.find(p => p.id === scrollPersonaId) || loaded[0])
          : loaded[0];
        await selectPersona(target);
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
    setHistoryCount(0);
    setTurnCount(0);
    setCompleted(false);
    setCompletedMissions([]);
    setQuizLocked(false);
    setQuizView(false);
    setQuiz(null);
    setQuizError('');
    setMissionsOpen(true);
    setPopup(null);
    setConversationLoading(true);
    try {
      const { conversation } = await getConversation(persona.id);
      if (conversation) {
        const msgs = conversation.messages || [];
        setMessages(msgs);
        setHistoryCount(msgs.length);
        setTurnCount(conversation.turn_count || 0);
        setCompleted(conversation.completed || false);
        setCompletedMissions(conversation.completed_missions || []);
        setQuizLocked(conversation.quiz_locked || false);
      }
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
    finally { setConversationLoading(false); }
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || chatLoading) return;
    setInputText('');
    setError('');
    setPopup(null);
    shouldScrollRef.current = true;
    setMessages(cur => [...cur, { role: 'user', content: text }]);
    setChatLoading(true);
    try {
      const { reply, turn_count, completed: done, completed_missions } = await sendMessage(activePersona.id, { message: text });
      shouldScrollRef.current = true;
      setMessages(cur => [...cur, { role: 'assistant', content: reply }]);
      setTurnCount(turn_count);
      setCompleted(done);
      if (completed_missions) setCompletedMissions(completed_missions);
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
    selectPersona(p);
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
      ].filter(Boolean).join(' · ')
    : '';

  const mode     = activePersona?.mode || 'free';
  const missions = activePersona?.missions || [];
  const allMissionsDone = missions.length > 0 && completedMissions.length === missions.length;

  const modeLabel = { free: '💬 Free', missions: '🎯 Missions', quiz: '📝 Quiz' };

  if (loading) return <LoadingSpinner label="Loading personas..." />;

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      {/* Highlight popup */}
      {popup && (
        <HighlightPopup
          term={popup.term}
          position={popup.position}
          loading={popup.loading}
          contextInfo={popup.contextInfo}
          isSaved={popup.saved}
          isAdded={popup.added}
          addError={popup.addError}
          onLookup={handlePopupLookup}
          onAddToGlossary={handlePopupAddToGlossary}
          onSave={handlePopupSave}
          onClose={() => setPopup(null)}
        />
      )}

      {personas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎭</div>
          <h3>No personas yet</h3>
          <p>Your teacher hasn't added any personas to this unit.</p>
        </div>
      ) : (
        <>
          {activePersona && (
            <div className="persona-chat-wrap">

              {/* ── Persona tabs (only when multiple) ── */}
              {personas.length > 1 && (
                <div className="persona-tabs">
                  {personas.map((p, i) => (
                    <button
                      key={p.id}
                      className={`persona-tab${activePersona?.id === p.id ? ' persona-tab--active' : ''}`}
                      onClick={() => handlePersonaClick(p)}
                    >
                      <span className="persona-tab-emoji">{getEmoji(p, i)}</span>
                      {p.name}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Header ── */}
              <div className="persona-header">
                <div className="persona-header-avatar">
                  {getEmoji(activePersona, personas.indexOf(activePersona))}
                </div>
                <div className="persona-header-info">
                  <div className="persona-header-name">{activePersona.name}</div>
                  {activePersonaMeta && <div className="persona-header-meta">{activePersonaMeta}</div>}
                  <div className="persona-header-badges">
                    <span className={`persona-mode-badge persona-mode-badge--${mode}`}>
                      {modeLabel[mode] || '💬 Free'}
                    </span>
                  </div>
                </div>
                <div className="persona-header-right">
                  {mode === 'missions' && missions.length > 0 && (
                    <button
                      className={`missions-fab${allMissionsDone ? ' missions-fab--done' : ''}`}
                      onClick={() => setMissionsOpen(o => !o)}
                    >
                      <span className="missions-fab-icon">🎯</span>
                      <span className="missions-fab-label">Missions</span>
                      <span className={`missions-fab-pill${allMissionsDone ? ' missions-fab-pill--done' : ''}`}>
                        {completedMissions.length}/{missions.length}
                      </span>
                    </button>
                  )}
                  <div className="persona-progress">
                    <span className="persona-progress-label">
                      {completed ? '✓ Complete' : `${turnCount} / ${activePersona.min_turns} exchanges`}
                    </span>
                    <div className="persona-progress-bar">
                      <div
                        className="persona-progress-fill"
                        style={{ width: `${progressPct}%`, background: completed ? '#2a7a2a' : undefined }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Missions Drawer ── */}
              {mode === 'missions' && missions.length > 0 && (
                <>
                  {missionsOpen && (
                    <div className="missions-overlay" onClick={() => setMissionsOpen(false)} />
                  )}
                  <div className={`missions-drawer${missionsOpen ? ' missions-drawer--open' : ''}`}>
                    <div className="missions-drawer-header">
                      <div className="missions-drawer-title">
                        🎯 Missions
                      </div>
                      <button className="missions-drawer-close" onClick={() => setMissionsOpen(false)}>✕</button>
                    </div>

                    <div className="missions-drawer-progress">
                      <div className="missions-drawer-progress-text">
                        <span>{completedMissions.length} of {missions.length} complete</span>
                        {allMissionsDone && <span className="missions-drawer-done-badge">✓ All done!</span>}
                      </div>
                      <div className="missions-drawer-bar">
                        <div
                          className={`missions-drawer-bar-fill${allMissionsDone ? ' missions-drawer-bar-fill--done' : ''}`}
                          style={{ width: `${missions.length ? (completedMissions.length / missions.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="missions-drawer-list">
                      {missions.map((m, i) => {
                        const done = completedMissions.includes(m.id);
                        return (
                          <div
                            key={m.id}
                            className={`missions-drawer-item${done ? ' missions-drawer-item--done' : ''}`}
                            style={{ '--mission-item-index': i }}
                          >
                            <div className="missions-drawer-item-left">
                              <div className={`missions-drawer-check${done ? ' missions-drawer-check--done' : ''}`}>
                                {done ? '✓' : i + 1}
                              </div>
                              <span className="missions-drawer-item-text">{m.text}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {allMissionsDone && (
                      <div className="missions-drawer-all-done">
                        🎉 You've completed all missions for this conversation!
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── Quiz view ── */}
              {quizView && quiz ? (
                <PersonaQuizView
                  persona={activePersona}
                  quiz={quiz}
                  onSubmit={handleQuizSubmit}
                />
              ) : (
                <>
                  <div className="chat-messages" ref={messagesContainerRef}>
                    {conversationLoading && (
                      <div className="chat-conv-loading">
                        <span className="chat-conv-spinner" />
                      </div>
                    )}
                    {!conversationLoading && messages.length === 0 && (
                      <p className="chat-empty-hint">
                        {mode === 'missions' && missions.length > 0
                          ? `Work through the missions above by chatting with ${activePersona.name}.`
                          : `Ask ${activePersona.name} anything about this period in history.`}
                      </p>
                    )}
                    {messages.map((m, i) => (
                      <div
                        key={i}
                        data-message-index={i}
                        data-history={i < historyCount ? '' : undefined}
                        className={`chat-bubble chat-bubble--${m.role}${highlightedMessageIndex === i ? ' chat-bubble--highlight' : ''}`}
                        style={{ '--chat-bubble-index': i < historyCount ? undefined : i - historyCount }}
                      >
                        <span className="chat-bubble-sender">
                          {m.role === 'user' ? 'You' : activePersona.name}
                        </span>
                        {m.role === 'assistant'
                          ? <div className="chat-bubble-text chat-bubble-text--markdown"
                                 dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                          : <div className="chat-bubble-text">{m.content}</div>
                        }
                      </div>
                    ))}
                    {chatLoading && (
                      <div
                        className="chat-bubble chat-bubble--assistant chat-bubble--loading"
                        style={{ '--chat-bubble-index': messages.length }}
                      >
                        <span className="chat-bubble-sender">{activePersona.name}</span>
                        <div className="chat-bubble-text chat-bubble-text--typing">
                          <span /><span /><span />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* ── Completion banners ── */}
                  {completed && mode === 'free' && (
                    <div className="chat-completed-banner">
                      ✓ Goal reached — {activePersona.min_turns} exchanges complete. Feel free to keep going.
                    </div>
                  )}

                  {completed && mode === 'missions' && (
                    <div className="chat-completed-banner">
                      ✓ Goal reached — {activePersona.min_turns} exchanges complete.
                      {missions.length > 0 && completedMissions.length < missions.length && (
                        <span> Check off any remaining missions above.</span>
                      )}
                    </div>
                  )}

                  {/* ── Quiz prompt ── */}
                  {completed && mode === 'quiz' && !quizLocked && (
                    <div className="chat-quiz-prompt">
                      <div className="chat-quiz-prompt-icon">📝</div>
                      <div className="chat-quiz-prompt-title">Conversation complete!</div>
                      <div className="chat-quiz-prompt-body">
                        Your quiz will be generated based on what you discussed with {activePersona.name}.
                        Once you start, you won't be able to return to this chat.
                      </div>
                      {quizError && <div className="alert alert-error" style={{ marginBottom: 14 }}>{quizError}</div>}
                      <button
                        className="btn btn-primary"
                        onClick={handleStartQuiz}
                        disabled={quizGenerating}
                        style={{ minWidth: 150 }}
                      >
                        {quizGenerating ? 'Generating quiz…' : 'Start My Quiz →'}
                      </button>
                    </div>
                  )}

                  {quizLocked && !quizView && (
                    <div className="chat-quiz-prompt">
                      <div className="chat-quiz-prompt-icon">📋</div>
                      <div className="chat-quiz-prompt-title">Your quiz is ready.</div>
                      <button
                        className="btn btn-primary"
                        onClick={() => setQuizView(true)}
                        style={{ minWidth: 150 }}
                      >
                        {quiz?.submitted_at ? 'View Results' : 'Take Quiz →'}
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
                        placeholder={`Message ${activePersona.name}…`}
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
