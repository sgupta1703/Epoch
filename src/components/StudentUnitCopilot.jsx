import { useEffect, useRef, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { chatWithStudentUnitCopilotApi } from '../api/assistant';
import { renderMarkdown } from '../utils/renderMarkdown';

const SUGGESTIONS_BY_SURFACE = {
  notes: [
    'Summarize the most important ideas in this unit.',
    'What should I focus on before the next quiz?',
    'Turn these notes into 3 practice questions.',
  ],
  personas: [
    'Which persona should I talk to first, and why?',
    'Give me 3 strong questions to ask a persona in this unit.',
    'Compare the main perspectives across these personas.',
  ],
};

function buildWelcomeMessage(surface, unitTitle) {
  if (surface === 'personas') {
    return `I'm your Unit Copilot for **${unitTitle}**. I can help you prepare for persona conversations, compare perspectives, and connect what you learn back to the unit.`;
  }

  return `I'm your Unit Copilot for **${unitTitle}**. I can help you review notes, clarify hard concepts, and build practice questions or study plans.`;
}

export default function StudentUnitCopilot({ unit, surface }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => ([
    { role: 'assistant', content: buildWelcomeMessage(surface, unit?.title || 'this unit') },
  ]));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const suggestions = SUGGESTIONS_BY_SURFACE[surface] || SUGGESTIONS_BY_SURFACE.notes;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    setMessages((currentMessages) => {
      if (currentMessages.length > 1) return currentMessages;
      return [{ role: 'assistant', content: buildWelcomeMessage(surface, unit?.title || 'this unit') }];
    });
  }, [surface, unit?.title]);

  async function sendMessage(messageText) {
    const text = messageText.trim();
    if (!text || loading || !unit?.id) return;

    const updatedMessages = [...messages, { role: 'user', content: text }];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const { reply } = await chatWithStudentUnitCopilotApi(unit.id, surface, updatedMessages);
      setMessages((currentMessages) => [...currentMessages, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: 'assistant',
          content: err.response?.data?.error || 'I had trouble loading just now. Try asking again in a moment.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    sendMessage(input);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  return (
    <>
      <button
        type="button"
        className="student-copilot-trigger"
        onClick={() => setIsOpen(true)}
      >
        <span className="student-copilot-trigger-label">Unit Copilot</span>
        <span className="student-copilot-trigger-copy">Study help for notes and personas only</span>
      </button>

      {isOpen && (
        <>
          <div className="student-copilot-overlay" onClick={() => setIsOpen(false)} />

          <aside className="student-copilot-drawer">
            <div className="student-copilot-header">
              <div>
                <div className="student-copilot-title">Unit Copilot</div>
                <div className="student-copilot-subtitle">
                  {surface === 'personas' ? 'Persona prep and reflection' : 'Notes review and study help'}
                </div>
              </div>
              <button
                type="button"
                className="student-copilot-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close unit copilot"
              >
                x
              </button>
            </div>

            <div className="student-copilot-policy">
              <strong>Study-only.</strong> This copilot works on notes and personas, but it will not help answer quiz or assignment questions.
            </div>

            <div className="student-copilot-suggestions">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  className="student-copilot-chip"
                  style={{ '--copilot-chip-index': index }}
                  onClick={() => sendMessage(suggestion)}
                  disabled={loading}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="student-copilot-messages">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`student-copilot-message student-copilot-message--${message.role}`}
                  style={{ '--copilot-message-index': index }}
                >
                  <span className="student-copilot-message-role">
                    {message.role === 'assistant' ? 'Copilot' : 'You'}
                  </span>
                  {message.role === 'assistant' ? (
                    <div
                      className="student-copilot-message-body student-copilot-message-body--markdown"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                    />
                  ) : (
                    <div className="student-copilot-message-body">{message.content}</div>
                  )}
                </div>
              ))}

              {loading && (
                <div
                  className="student-copilot-message student-copilot-message--assistant student-copilot-message--loading"
                  style={{ '--copilot-message-index': messages.length }}
                >
                  <span className="student-copilot-message-role">Copilot</span>
                  <div className="student-copilot-loading">
                    <LoadingSpinner size="sm" />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="student-copilot-input-row">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                className="student-copilot-input"
                rows={3}
                placeholder={surface === 'personas'
                  ? 'Ask for persona prep, comparisons, or follow-up questions...'
                  : 'Ask for summaries, explanations, or practice questions...'}
                disabled={loading}
              />
              <button
                type="button"
                className="btn btn-primary student-copilot-send"
                onClick={handleSubmit}
                disabled={loading || !input.trim()}
              >
                Send
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
