import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getClassrooms } from '../../api/classrooms';
import { getUnit } from '../../api/units';
import { getPersonas, sendMessage, getConversation } from '../../api/personas';
import { renderMarkdown } from '../../utils/renderMarkdown';
import '../../styles/pages.css';
import './Student.css';

const PERSONA_EMOJIS = ['👨‍⚖️','👩‍🌾','🪖','👸','🤴','⚔️','🧙','🏛️','✍️','🕊️'];

export default function PersonaChat({ user }) {
  const { classroomId, unitId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [classrooms, setClassrooms] = useState([]);
  const [unit, setUnit] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [activePersona, setActivePersona] = useState(null);
  const [messages, setMessages] = useState([]);
  const [turnCount, setTurnCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAll();
  }, [unitId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [{ classrooms }, { unit }, { personas }] = await Promise.all([
        getClassrooms(),
        getUnit(unitId),
        getPersonas(unitId),
      ]);
      setClassrooms(classrooms);
      setUnit(unit);
      setPersonas(personas);
      if (personas.length > 0) {
        await selectPersona(personas[0]);
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
    } catch { /* no conversation yet */ }
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || chatLoading) return;

    setInputText('');
    setError('');

    // Optimistic user message
    setMessages(m => [...m, { role: 'user', content: text }]);
    setChatLoading(true);

    try {
      const { reply, turn_count, completed: done } = await sendMessage(activePersona.id, { message: text });
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
      setTurnCount(turn_count);
      setCompleted(done);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message.');
      setMessages(m => m.slice(0, -1));
    } finally {
      setChatLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const progressPct = activePersona
    ? Math.min(100, Math.round((turnCount / activePersona.min_turns) * 100))
    : 0;

  if (loading) return (
    <>
      <Navbar user={user} />
      <div className="app-shell">
        <Sidebar classrooms={[]} activeId={classroomId} role="student" loading={loading} />
        <main className="page-main"><LoadingSpinner fullPage label="Loading personas…" /></main>
      </div>
    </>
  );

  return (
    <>
      <Navbar user={user} />
      <div className="app-shell">
        <Sidebar classrooms={classrooms} activeId={classroomId} role="student" loading={loading} />

        <main className="page-main">
          <p
            className="page-eyebrow"
            style={{ marginBottom: 8, cursor: 'pointer' }}
            onClick={() => navigate(`/student/classroom/${classroomId}/unit/${unitId}`)}
          >
            ← Back to Unit
          </p>

          <div className="page-header" style={{ marginBottom: 16 }}>
            <div className="page-header-left">
              <h1 className="page-title">🎭 Persona Conversations</h1>
              <p className="page-subtitle">{unit?.title}</p>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {personas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎭</div>
              <h3>No personas yet</h3>
              <p>Your teacher hasn't added any personas to this unit.</p>
            </div>
          ) : (
            <>
              {/* Persona selector */}
              {personas.length > 1 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {personas.map((p, i) => (
                    <button
                      key={p.id}
                      className={`btn ${activePersona?.id === p.id ? 'btn-dark' : 'btn-ghost'}`}
                      onClick={() => selectPersona(p)}
                    >
                      {PERSONA_EMOJIS[i % PERSONA_EMOJIS.length]} {p.name}
                    </button>
                  ))}
                </div>
              )}

              {activePersona && (
                <>
                  {/* Persona header */}
                  <div className="persona-header">
                    <div className="persona-header-avatar">
                      {PERSONA_EMOJIS[personas.indexOf(activePersona) % PERSONA_EMOJIS.length]}
                    </div>
                    <div>
                      <div className="persona-header-name">{activePersona.name}</div>
                      <div className="persona-header-meta">
                        {activePersona.due_date
                          ? `Due ${new Date(activePersona.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                          : 'No due date'}
                      </div>
                    </div>
                    <div className="persona-progress">
                      <span className="persona-progress-label">
                        {completed
                          ? `✓ ${activePersona.min_turns}/${activePersona.min_turns} exchanges complete`
                          : `${turnCount}/${activePersona.min_turns} exchanges`}
                      </span>
                      <div className="persona-progress-bar">
                        <div
                          className="persona-progress-fill"
                          style={{
                            width: `${progressPct}%`,
                            background: completed ? 'var(--color-success, #2a7a2a)' : undefined,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="chat-messages">
                    {messages.length === 0 && (
                      <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', margin: 'auto' }}>
                        Start the conversation — ask {activePersona.name} anything about this period in history.
                      </p>
                    )}
                    {messages.map((m, i) => (
                      <div key={i} className={`chat-bubble chat-bubble--${m.role}`}>
                        <span className="chat-bubble-sender">
                          {m.role === 'user' ? 'You' : activePersona.name}
                        </span>
                        {m.role === 'assistant' ? (
                          <div
                            className="chat-bubble-text chat-bubble-text--markdown"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                          />
                        ) : (
                          <div className="chat-bubble-text">{m.content}</div>
                        )}
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="chat-bubble chat-bubble--assistant">
                        <span className="chat-bubble-sender">{activePersona.name}</span>
                        <div className="chat-bubble-text" style={{ color: 'var(--muted)' }}>
                          <LoadingSpinner size="sm" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {completed && (
                    <div className="chat-completed-banner">
                       Goal reached! You've completed the minimum exchanges. Feel free to keep the conversation going.
                    </div>
                  )}

                  <div className="chat-input-row">
                    <textarea
                      className="chat-input"
                      rows={2}
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Ask ${activePersona.name} something… (Enter to send)`}
                      disabled={chatLoading}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={handleSend}
                      disabled={chatLoading || !inputText.trim()}
                      style={{ alignSelf: 'flex-end' }}
                    >
                      Send
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
