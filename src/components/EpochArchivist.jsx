import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { chatWithAssistant } from '../api/assistant';
import { renderMarkdown } from '../utils/renderMarkdown';
import './EpochArchivist.css';

const STARTER_PROMPTS = [
  'How should I structure a unit?',
  'Give me a quick overview of the Renaissance.',
  'What is the best way to use personas in class?',
];

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: "I am Mr. Curator. Ask me about best utilizing Epoch or about a history topic you're working on.",
};

function TypingIndicator() {
  return (
    <div className="epoch-archivist-bubble epoch-archivist-bubble--assistant">
      <div className="epoch-archivist-bubble-role">Mr. Curator</div>
      <div className="epoch-archivist-typing">
        <span />
        <span />
        <span />
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
  const [error, setError] = useState('');

  // 'idle' | 'opening' | 'closing'
  const [animState, setAnimState] = useState('idle');

  // Controls whether the panel is in the DOM at all
  const [panelVisible, setPanelVisible] = useState(false);

  // Only fire the initial pop animation once
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

    // Mount the panel immediately so it slides up in parallel
    setPanelVisible(true);
    setIsOpen(true);

    setTimeout(() => {
      setAnimState('idle');
    }, 480);
  }

  function handleClose() {
    if (animState !== 'idle') return;
    setAnimState('closing');
    setIsOpen(false);

    setTimeout(() => {
      setPanelVisible(false);
      setAnimState('idle');
    }, 480);
  }

  if (!isTeacherRoute) return null;

  async function submitMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const { reply } = await chatWithAssistant(nextMessages);
      setMessages((current) => [...current, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reach Epoch Archivist.');
      setMessages((current) => current.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitMessage(input);
    }
  }

  // Derive trigger class cleanly — one animation at a time, no conflicts
  const triggerClasses = [
    'epoch-archivist-trigger',
    !hasInteracted.current                   ? 'epoch-archivist-trigger--initial' : '',
    animState === 'opening'                  ? 'epoch-archivist-trigger--opening'  : '',
    animState === 'closing'                  ? 'epoch-archivist-trigger--closing'  : '',
    animState === 'idle' && isOpen           ? 'epoch-archivist-trigger--pill'     : '',
    animState === 'idle' && !isOpen          ? 'epoch-archivist-trigger--circle'   : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Show "E" while closed or animating closed; show "EPOCH" while open or animating open
  const showLabel = isOpen || animState === 'opening';

  return (
    <div className={`epoch-archivist ${isOpen ? 'epoch-archivist--open' : ''}`}>

      {panelVisible && (
        <section
          className={`epoch-archivist-panel ${isOpen ? 'epoch-archivist-panel--visible' : 'epoch-archivist-panel--hidden'}`}
          aria-label="Mr. Curator"
        >
          <div className="epoch-archivist-header">
            <div>
              <div className="epoch-archivist-eyebrow">Teacher Assistant</div>
              <h2 className="epoch-archivist-title">Mr. Curator</h2>
            </div>
            <button
              type="button"
              className="epoch-archivist-close"
              onClick={handleClose}
              aria-label="Close Mr. Curator"
            >
              ✕
            </button>
          </div>

          <div className="epoch-archivist-body">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={[
                  'epoch-archivist-bubble',
                  `epoch-archivist-bubble--${message.role}`,
                  index === messages.length - 1 ? 'epoch-archivist-bubble--new' : '',
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
            ))}

            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className="epoch-archivist-prompts">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="epoch-archivist-prompt"
                  onClick={() => submitMessage(prompt)}
                  disabled={loading}
                >
                  {prompt}
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
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about Epoch or a history topic…"
              disabled={loading}
            />
            <button
              type="button"
              className="epoch-archivist-send"
              onClick={() => submitMessage(input)}
              disabled={loading || !input.trim()}
            >
              Send
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
      >
        <span className="epoch-archivist-trigger-inner">
          <span
            className="epoch-archivist-trigger-mark"
            style={{ opacity: showLabel ? 0 : 1 }}
          >
            E
          </span>
          <span
            className="epoch-archivist-trigger-copy"
            style={{ opacity: showLabel ? 1 : 0 }}
          >
            EPOCH
          </span>
        </span>
      </button>
    </div>
  );
}