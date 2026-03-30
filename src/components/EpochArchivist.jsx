import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { chatWithAssistant, executeAssistantAction } from '../api/assistant';
import { renderMarkdown } from '../utils/renderMarkdown';
import './EpochArchivist.css';

const STARTER_PROMPTS = [
  { label: 'How do I structure a unit?',      text: 'How should I structure a unit?' },
  { label: 'Create a unit in my classroom',   text: 'Create a unit in one of my classrooms' },
  { label: 'Add personas to a unit',          text: 'Add 3 personas to a unit' },
];

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: "I'm Mr. Curator — your Epoch assistant. I can answer history questions, help you plan lessons, and take actions like creating units, updating visibility, deleting units, and creating personas directly.",
};

function serializeActionMessage(message) {
  if (message.role !== 'action' || message.status !== 'confirmed') return null;

  const resultLine = message.resultMessage ? `Result: ${message.resultMessage}` : 'Result: Action completed.';

  if (message.action?.name === 'create_multiple_units') {
    const classroomName = message.action.args?.classroom_name;
    const unitTitles = Array.isArray(message.action.args?.units)
      ? message.action.args.units.map((unit) => unit?.title).filter(Boolean)
      : [];

    return {
      role: 'assistant',
      content: [
        resultLine,
        classroomName ? `Classroom: ${classroomName}` : null,
        unitTitles.length ? `Created units: ${unitTitles.join(', ')}` : null,
      ].filter(Boolean).join('\n'),
    };
  }

  if (message.action?.name === 'set_unit_visibility') {
    const unitNames = Array.isArray(message.action.args?.unit_names)
      ? message.action.args.unit_names.filter(Boolean)
      : [];

    return {
      role: 'assistant',
      content: [
        resultLine,
        typeof message.action.args?.visible === 'boolean'
          ? `Visibility set to: ${message.action.args.visible ? 'visible' : 'hidden'}`
          : null,
        unitNames.length ? `Affected units: ${unitNames.join(', ')}` : null,
      ].filter(Boolean).join('\n'),
    };
  }

  return {
    role: 'assistant',
    content: resultLine,
  };
}

function buildAssistantHistory(messages, nextUserMessage) {
  return [
    ...messages.flatMap((message) => {
      if (typeof message?.content === 'string' && message.content.trim()) {
        return [{ role: message.role, content: message.content.trim() }];
      }

      const serializedAction = serializeActionMessage(message);
      return serializedAction ? [serializedAction] : [];
    }),
    { role: 'user', content: nextUserMessage },
  ];
}

function TypingIndicator() {
  return (
    <div className="epoch-archivist-bubble epoch-archivist-bubble--assistant">
      <div className="epoch-archivist-bubble-role">Mr. Curator</div>
      <div className="epoch-archivist-typing">
        <span /><span /><span />
      </div>
    </div>
  );
}

function ActionCard({ message, isNew, onConfirm, onCancel, executing }) {
  const { action, status } = message;

  const baseClasses = ['epoch-archivist-bubble', 'epoch-archivist-bubble--assistant', isNew ? 'epoch-archivist-bubble--new' : ''].filter(Boolean).join(' ');

  if (status === 'confirmed') {
    return (
      <div className={baseClasses}>
        <div className="epoch-archivist-bubble-role">Mr. Curator</div>
        <div className="epoch-archivist-bubble-text epoch-archivist-action-result epoch-archivist-action-result--success">
          ✓ {message.resultMessage}
        </div>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className={baseClasses}>
        <div className="epoch-archivist-bubble-role">Mr. Curator</div>
        <div className="epoch-archivist-bubble-text epoch-archivist-action-result epoch-archivist-action-result--cancelled">
          Cancelled.
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={baseClasses}>
        <div className="epoch-archivist-bubble-role">Mr. Curator</div>
        <div className="epoch-archivist-bubble-text epoch-archivist-action-result epoch-archivist-action-result--error">
          {message.resultMessage || 'Something went wrong.'}
        </div>
      </div>
    );
  }

  return (
    <div className={[...baseClasses.split(' '), 'epoch-archivist-bubble--action'].join(' ')}>
      <div className="epoch-archivist-bubble-role">Mr. Curator</div>
      <div className="epoch-archivist-action-card">
        <div className="epoch-archivist-action-message" style={{ whiteSpace: 'pre-wrap' }}>{action.confirmMessage}</div>
        <div className="epoch-archivist-action-buttons">
          <button
            type="button"
            className="epoch-archivist-action-btn epoch-archivist-action-btn--confirm"
            onClick={onConfirm}
            disabled={executing}
          >
            {executing ? 'Working…' : 'Confirm'}
          </button>
          <button
            type="button"
            className="epoch-archivist-action-btn epoch-archivist-action-btn--cancel"
            onClick={onCancel}
            disabled={executing}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EpochArchivist() {
  const location = useLocation();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');
  const [animState, setAnimState] = useState('idle');
  const [panelVisible, setPanelVisible] = useState(false);
  const hasInteracted = useRef(false);

  const isTeacherRoute = user?.role === 'teacher' && location.pathname.startsWith('/teacher');

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  function handleOpen() {
    if (animState !== 'idle') return;
    hasInteracted.current = true;
    setAnimState('opening');
    setPanelVisible(true);
    setIsOpen(true);
    setTimeout(() => setAnimState('idle'), 480);
  }

  function handleClose() {
    if (animState !== 'idle') return;
    setAnimState('closing');
    setIsOpen(false);
    setTimeout(() => { setPanelVisible(false); setAnimState('idle'); }, 480);
  }

  function handleClearChat() {
    setMessages([WELCOME_MESSAGE]);
    setInput('');
    setError('');
  }

  if (!isTeacherRoute) return null;

  async function submitMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, { role: 'user', content: trimmed }];
    const historyForAssistant = buildAssistantHistory(messages, trimmed);
    setMessages(nextMessages);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const data = await chatWithAssistant(historyForAssistant);
      if (data.action) {
        setMessages(current => [...current, { role: 'action', action: data.action, status: 'pending' }]);
      } else {
        setMessages(current => [...current, { role: 'assistant', content: data.reply }]);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reach Mr. Curator.');
      setMessages(current => current.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmAction(index) {
    const msg = messages[index];
    if (!msg || msg.role !== 'action') return;

    setExecuting(true);
    try {
      const { message } = await executeAssistantAction(msg.action);
      setMessages(current => current.map((m, i) => i === index ? { ...m, status: 'confirmed', resultMessage: message } : m));

      const unitActions = ['create_unit', 'create_multiple_units', 'set_unit_visibility', 'delete_unit', 'delete_multiple_units', 'delete_all_units'];
      const personaActions = ['create_personas'];
      const classroomActions = ['create_classroom'];
      if (unitActions.includes(msg.action.name))     window.dispatchEvent(new CustomEvent('epoch:units-changed'));
      if (personaActions.includes(msg.action.name))  window.dispatchEvent(new CustomEvent('epoch:personas-changed'));
      if (classroomActions.includes(msg.action.name)) window.dispatchEvent(new CustomEvent('epoch:classrooms-changed'));
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Something went wrong.';
      setMessages(current => current.map((m, i) => i === index ? { ...m, status: 'error', resultMessage: errMsg } : m));
    } finally {
      setExecuting(false);
    }
  }

  function handleCancelAction(index) {
    setMessages(current => current.map((m, i) => i === index ? { ...m, status: 'cancelled' } : m));
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitMessage(input);
    }
  }

  const triggerClasses = [
    'epoch-archivist-trigger',
    !hasInteracted.current          ? 'epoch-archivist-trigger--initial' : '',
    animState === 'opening'         ? 'epoch-archivist-trigger--opening'  : '',
    animState === 'closing'         ? 'epoch-archivist-trigger--closing'  : '',
    animState === 'idle' && isOpen  ? 'epoch-archivist-trigger--pill'     : '',
    animState === 'idle' && !isOpen ? 'epoch-archivist-trigger--circle'   : '',
  ].filter(Boolean).join(' ');

  const showLabel = isOpen || animState === 'opening';
  const hasHistory = messages.length > 1;

  return (
    <div className={`epoch-archivist ${isOpen ? 'epoch-archivist--open' : ''}`}>

      {panelVisible && (
        <section
          className={`epoch-archivist-panel ${isOpen ? 'epoch-archivist-panel--visible' : 'epoch-archivist-panel--hidden'}`}
          aria-label="Mr. Curator"
        >
          <div className="epoch-archivist-header">
            <div className="epoch-archivist-header-left">
              <div className="epoch-archivist-avatar">C</div>
              <div>
                <div className="epoch-archivist-eyebrow">Teacher Assistant</div>
                <h2 className="epoch-archivist-title">Mr. Curator</h2>
              </div>
            </div>
            <div className="epoch-archivist-header-actions">
              {hasHistory && (
                <button
                  type="button"
                  className="epoch-archivist-clear"
                  onClick={handleClearChat}
                  aria-label="Clear chat"
                  title="Clear chat"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                className="epoch-archivist-close"
                onClick={handleClose}
                aria-label="Close Mr. Curator"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="epoch-archivist-body">
            {messages.map((message, index) => {
              const isNew = index === messages.length - 1;

              if (message.role === 'action') {
                return (
                  <ActionCard
                    key={index}
                    message={message}
                    isNew={isNew}
                    onConfirm={() => handleConfirmAction(index)}
                    onCancel={() => handleCancelAction(index)}
                    executing={executing}
                  />
                );
              }

              return (
                <div
                  key={`${message.role}-${index}`}
                  className={[
                    'epoch-archivist-bubble',
                    `epoch-archivist-bubble--${message.role}`,
                    isNew ? 'epoch-archivist-bubble--new' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <div className="epoch-archivist-bubble-role">
                    {message.role === 'assistant' ? 'Mr. Curator' : 'You'}
                  </div>
                  {message.role === 'assistant' ? (
                    <div
                      className="epoch-archivist-bubble-text epoch-archivist-bubble-text--markdown"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                    />
                  ) : (
                    <div className="epoch-archivist-bubble-text">{message.content}</div>
                  )}
                </div>
              );
            })}

            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className="epoch-archivist-prompts">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt.text}
                  type="button"
                  className="epoch-archivist-prompt"
                  onClick={() => submitMessage(prompt.text)}
                  disabled={loading}
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          )}

          {error && <div className="epoch-archivist-error">{error}</div>}

          <div className="epoch-archivist-input-row">
            <textarea
              className="epoch-archivist-input"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question or give a command…"
              disabled={loading}
            />
            <button
              type="button"
              className="epoch-archivist-send"
              onClick={() => submitMessage(input)}
              disabled={loading || !input.trim()}
            >
              ↑
            </button>
          </div>
        </section>
      )}

      <button
        type="button"
        className={triggerClasses}
        onClick={isOpen || animState === 'opening' ? handleClose : handleOpen}
        aria-expanded={isOpen}
        aria-label="Open Mr. Curator"
        data-onboarding="curator-btn"
      >
        <span className="epoch-archivist-trigger-inner">
          <span className="epoch-archivist-trigger-mark" style={{ opacity: showLabel ? 0 : 1 }}>C</span>
          <span className="epoch-archivist-trigger-copy" style={{ opacity: showLabel ? 1 : 0 }}>Mr. Curator</span>
        </span>
      </button>
    </div>
  );
}
