import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getPersonas, sendMessage, getConversation } from '../../api/personas';
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

  return {
    hr: hours * 30,
    mn: minutes * 6,
    sc: seconds * 6,
  };
}

/* ── Blueprint clock tick-mark canvas ── */
function drawTickMarks(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const cx = w / 2, cy = w / 2, r = w / 2 - 4;
  ctx.clearRect(0, 0, w, w);
  for (let i = 0; i < 60; i++) {
    const angle  = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const major  = i % 5 === 0;
    const len    = major ? 10 : 5;
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
  const [loading, setLoading]             = useState(true);
  const [chatLoading, setChatLoading]     = useState(false);
  const [inputText, setInputText]         = useState('');
  const [error, setError]                 = useState('');

  const currentYear = new Date().getFullYear();

  const [warpIntro, setWarpIntro] = useState({
    visible:     false,
    exiting:     false,
    displayYear: currentYear,
    bce:         false,
    personaName: '',
    location:    '',
  });

  /* keep a ref so the rAF closure can read/write without stale state */
  const warpDisplayRef = useRef({ year: currentYear, bce: false });

  useEffect(() => { fetchAll(); }, [unitId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    hasPlayedWarpIntroRef.current = false;
  }, [unitId]);

  /* draw tick marks once canvas mounts */
  useEffect(() => {
    if (warpIntro.visible && tickCanvasRef.current) {
      drawTickMarks(tickCanvasRef.current);
    }
  }, [warpIntro.visible]);

  useEffect(() => () => clearTimers(), []);

  /* ── helpers ── */

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

  /* ── warp animation ── */

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

    /* all hands spin backwards (subtract) */
    const toHr = fromHr - spins * 360;
    const toMn = fromMn - spins * 360 * 12;
    const toSc = fromSc - spins * 360 * 60;

    handAnglesRef.current = startClock;
    warpDisplayRef.current = { year: fromYear, bce: fromYear < 0 };
    setHands(fromHr, fromMn, fromSc);

    setWarpIntro({
      visible:     true,
      exiting:     false,
      displayYear: Math.abs(fromYear),
      bce:         fromYear < 0,
      personaName: persona?.name || '',
      location:    persona?.location || '',
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
      setWarpIntro(prev => ({
        ...prev,
        displayYear: Math.round(Math.abs(y)),
        bce:         y < 0,
      }));
      setHands(hr, mn, sc);

      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      /* landed */
      handAnglesRef.current = { hr: toHr, mn: toMn, sc: toSc };
      warpDisplayRef.current = { year: targetYear, bce: targetYear < 0 };
      setWarpIntro(prev => ({
        ...prev,
        displayYear: Math.abs(targetYear),
        bce:         targetYear < 0,
      }));

      holdTimerRef.current = setTimeout(() => {
        setWarpIntro(prev => ({ ...prev, exiting: true }));
      }, holdMs);

      hideTimerRef.current = setTimeout(() => {
        setWarpIntro(prev => ({ ...prev, visible: false, exiting: false }));
      }, holdMs + exitMs);
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  /* ── data ── */

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
    try {
      const { conversation } = await getConversation(persona.id);
      if (conversation) {
        setMessages(conversation.messages || []);
        setTurnCount(conversation.turn_count || 0);
        setCompleted(conversation.completed || false);
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
      setError(err.response?.data?.error || 'Failed to send message.');
      setMessages(cur => cur.slice(0, -1));
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

  if (loading) return <LoadingSpinner label="Loading personas..." />;

  /* ── render ── */

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
                <div
                  className={`warp-overlay${warpIntro.exiting ? ' warp-overlay--exit' : ''}`}
                  aria-hidden="true"
                >
                  <div className="warp-vignette" />

                  {/* ghost clock — sits behind the year number */}
                  <div className="warp-clock-ghost" aria-hidden="true">
                    <canvas
                      ref={tickCanvasRef}
                      className="warp-clock-canvas"
                      width={300}
                      height={300}
                    />
                    <span
                      className="warp-hand warp-hand--hour"
                      ref={hrHandRef}
                    />
                    <span
                      className="warp-hand warp-hand--minute"
                      ref={mnHandRef}
                    />
                    <span
                      className="warp-hand warp-hand--second"
                      ref={scHandRef}
                    />
                    <span className="warp-clock-center" />
                    <div className="warp-clock-ring warp-clock-ring--outer" />
                    <div className="warp-clock-ring warp-clock-ring--inner" />
                  </div>

                  {/* year number — sits on top */}
                  <div className="warp-year-display">
                    <div className="warp-year-label">year</div>
                    <div className="warp-year-number">
                      {warpIntro.displayYear}
                    </div>
                    <div className="warp-year-divider" />
                    <div className="warp-year-era">
                      {warpIntro.bce ? 'B.C.' : 'A.D.'}
                    </div>
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
                      style={{
                        width: `${progressPct}%`,
                        background: completed ? '#2a7a2a' : undefined,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="chat-messages">
                {messages.length === 0 && (
                  <p className="chat-empty-hint">
                    Ask {activePersona.name} anything about this period in history.
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

              {completed && (
                <div className="chat-completed-banner">
                  Goal reached — {activePersona.min_turns} exchanges complete. Feel free to keep going.
                </div>
              )}

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
            </div>
          )}
        </>
      )}
    </div>
  );
}
