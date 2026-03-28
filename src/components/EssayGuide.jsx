import { useState, useRef, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

const FIELD_CONFIG = [
  {
    key: 'thesis',
    label: 'Thesis',
    placeholder: 'State your central argument in one clear sentence. What is your historical claim?',
    color: '#7a5c00', bg: '#fef3cd', border: '#f0c040',
    tip: 'A strong AP thesis makes a historically defensible claim and establishes a line of reasoning.',
  },
  {
    key: 'evidence1',
    label: 'Evidence 1',
    placeholder: 'A specific historical event, figure, date, or development that supports your thesis…',
    color: '#1e4d8c', bg: '#dbeafe', border: '#93c5fd',
    tip: 'Be specific — name the event, person, or document. Vague evidence scores low.',
  },
  {
    key: 'evidence2',
    label: 'Evidence 2',
    placeholder: 'A second piece of specific evidence from a different category or time period…',
    color: '#1e4d8c', bg: '#dbeafe', border: '#93c5fd',
    tip: 'Evidence from different categories (political, economic, social) shows breadth.',
  },
  {
    key: 'analysis',
    label: 'Analysis',
    placeholder: 'How does your evidence support your thesis? Explain the "so what"…',
    color: '#166534', bg: '#dcfce7', border: '#86efac',
    tip: "Don't just describe — explain why the evidence matters and how it proves your argument.",
  },
  {
    key: 'counterclaim',
    label: 'Counterclaim',
    placeholder: 'What is the strongest argument against your thesis? How do you refute it?',
    color: '#6b21a8', bg: '#f3e8ff', border: '#c084fc',
    tip: 'Acknowledging and rebutting a counterargument shows complexity — key for top AP scores.',
  },
];

function FeedbackBadge({ status }) {
  if (!status) return null;
  const map = {
    strong: { label: '✓ Strong',      color: '#2a7a2a', bg: '#eaf6ea' },
    ok:     { label: '~ Okay',        color: '#b8860b', bg: '#fdf8ec' },
    weak:   { label: '✗ Needs work',  color: '#c0392b', bg: '#fdecea' },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8, color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

async function evaluateOutline(question, outline) {
  const prompt = `You are an AP History essay coach. A student is planning an essay.

Essay question: "${question}"

Their outline:
- Thesis: ${outline.thesis || '(empty)'}
- Evidence 1: ${outline.evidence1 || '(empty)'}
- Evidence 2: ${outline.evidence2 || '(empty)'}
- Analysis: ${outline.analysis || '(empty)'}
- Counterclaim: ${outline.counterclaim || '(empty)'}

For each field, evaluate it and respond ONLY with a JSON object (no markdown, no backticks) in this exact format:
{
  "thesis":      { "status": "strong|ok|weak", "feedback": "one sentence of specific coaching" },
  "evidence1":   { "status": "strong|ok|weak", "feedback": "one sentence of specific coaching" },
  "evidence2":   { "status": "strong|ok|weak", "feedback": "one sentence of specific coaching" },
  "analysis":    { "status": "strong|ok|weak", "feedback": "one sentence of specific coaching" },
  "counterclaim":{ "status": "strong|ok|weak", "feedback": "one sentence of specific coaching" }
}

Be direct and specific. If a field is empty, mark it weak and tell them what to write.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || '{}';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function chatWithGuide(question, essay, messages) {
  const history = messages.map(m => ({ role: m.role, content: m.content }));
  const systemPrompt = `You are an AP History essay coach named the Essay Guide. You help students write better essays — you ask probing questions, suggest improvements, and explain AP rubric criteria. You never write the essay for them. You are concise (2-4 sentences max per response).

The essay question is: "${question}"
The student's current essay draft: """${essay || '(not started yet)'}"""

Guide them with questions and targeted feedback. Reference the AP rubric: thesis, contextualization, evidence, analysis/reasoning, complexity.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: history,
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || 'Sorry, I had trouble responding. Try again.';
}

export default function EssayGuide({ isOpen, onClose, question, essayDraft }) {
  // mounted keeps DOM alive during the exit transition
  const [mounted, setMounted] = useState(false);
  // visible drives the transform — deliberately one frame behind isOpen on open
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // double rAF: browser paints translateX(100%) first, then we animate to 0
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const [tab, setTab] = useState('outline');
  const [outline, setOutline] = useState({ thesis: '', evidence1: '', evidence2: '', analysis: '', counterclaim: '' });
  const [feedback, setFeedback] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState('');

  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your Essay Guide. Ask me anything about your essay — your thesis, evidence, how to structure your argument, or what the AP rubric looks for." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  async function handleEvaluate() {
    if (!question) return;
    setEvaluating(true); setEvalError('');
    try {
      const result = await evaluateOutline(question, outline);
      setFeedback(result);
    } catch { setEvalError('Failed to evaluate. Check your connection and try again.'); }
    finally { setEvaluating(false); }
  }

  async function handleChat() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput('');
    const updated = [...chatMessages, { role: 'user', content: text }];
    setChatMessages(updated);
    setChatLoading(true);
    try {
      const reply = await chatWithGuide(question, essayDraft, updated);
      setChatMessages(m => [...m, { role: 'assistant', content: reply }]);
    } catch {
      setChatMessages(m => [...m, { role: 'assistant', content: 'Something went wrong. Try again.' }]);
    } finally { setChatLoading(false); }
  }

  function handleChatKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(); }
  }

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.18)',
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
          transition: 'opacity 0.28s ease',
        }}
      />

      {/* Sliding panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
        width: 420, background: '#fff',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.13)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--font-body)',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>✍️ Essay Guide</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Plan and strengthen your essay</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--muted)', lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {[{ key: 'outline', label: 'Outline Builder' }, { key: 'chat', label: 'Ask the Guide' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 500,
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === t.key ? 'var(--rust)' : 'var(--muted)',
              borderBottom: tab === t.key ? '2px solid var(--rust)' : '2px solid transparent',
              marginBottom: -1, fontFamily: 'var(--font-body)',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OUTLINE TAB ── */}
        {tab === 'outline' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              Fill in your outline, then click <strong>Evaluate</strong> to get AI feedback on each section before you write.
            </p>

            {FIELD_CONFIG.map(f => (
              <div key={f.key}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: f.color, letterSpacing: '0.04em' }}>{f.label}</label>
                  {feedback?.[f.key] && <FeedbackBadge status={feedback[f.key].status} />}
                </div>
                <textarea
                  value={outline[f.key]}
                  onChange={e => { setOutline(o => ({ ...o, [f.key]: e.target.value })); setFeedback(fb => fb ? { ...fb, [f.key]: null } : fb); }}
                  placeholder={f.placeholder}
                  rows={3}
                  style={{
                    width: '100%', fontSize: 12, padding: '8px 10px', boxSizing: 'border-box',
                    border: `1px solid ${feedback?.[f.key] ? f.border : 'var(--border)'}`,
                    borderLeft: `3px solid ${f.border}`,
                    borderRadius: '0 4px 4px 0',
                    resize: 'vertical', lineHeight: 1.5,
                    fontFamily: 'var(--font-body)',
                    background: outline[f.key] ? f.bg + '55' : '#fff',
                    outline: 'none',
                  }}
                />
                {feedback?.[f.key]?.feedback && (
                  <div style={{ fontSize: 11, color: 'var(--ink)', marginTop: 4, lineHeight: 1.5, padding: '5px 8px', background: 'var(--cream)', borderRadius: 4 }}>
                    {feedback[f.key].feedback}
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>{f.tip}</div>
              </div>
            ))}

            {evalError && <div className="alert alert-error" style={{ fontSize: 12 }}>{evalError}</div>}

            <button
              onClick={handleEvaluate}
              disabled={evaluating}
              style={{
                padding: '10px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
                background: 'var(--rust)', color: '#fff', fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {evaluating ? <><LoadingSpinner size="sm" /> Evaluating…</> : '✨ Evaluate my outline'}
            </button>

            {feedback && (
              <div style={{ fontSize: 12, color: '#2a7a2a', textAlign: 'center', padding: '6px', background: '#eaf6ea', borderRadius: 4 }}>
                Outline evaluated — see feedback above each field.
              </div>
            )}
          </div>
        )}

        {/* ── CHAT TAB ── */}
        {tab === 'chat' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: m.role === 'user' ? 'var(--rust)' : 'var(--cream)',
                  color: m.role === 'user' ? '#fff' : 'var(--ink)',
                  padding: '8px 12px',
                  borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  fontSize: 13, lineHeight: 1.6,
                }}>
                  {m.content}
                </div>
              ))}
              {chatLoading && (
                <div style={{ alignSelf: 'flex-start', background: 'var(--cream)', padding: '8px 12px', borderRadius: '12px 12px 12px 2px' }}>
                  <LoadingSpinner size="sm" />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={handleChatKey}
                placeholder="Ask about your thesis, evidence, AP rubric… (Enter to send)"
                rows={2}
                disabled={chatLoading}
                style={{
                  flex: 1, fontSize: 12, padding: '8px 10px',
                  border: '1px solid var(--border)', borderRadius: 4,
                  resize: 'none', lineHeight: 1.5, fontFamily: 'var(--font-body)',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleChat}
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  padding: '0 14px', borderRadius: 4, border: 'none',
                  background: 'var(--rust)', color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', alignSelf: 'flex-end', height: 36,
                  fontFamily: 'var(--font-body)',
                  opacity: chatLoading || !chatInput.trim() ? 0.5 : 1,
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}