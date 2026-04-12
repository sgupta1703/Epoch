import { useState, useEffect } from 'react';
import {
  evaluateEssayGuideOutline,
  decodeEssayQuestionApi,
  coachEssayDraftApi,
  rateThesisAttemptApi,
  organizeEvidenceVaultApi,
  generateCounterargumentsApi,
  evaluateRebuttalApi,
} from '../api/assistant';

// ─── Inject keyframes once ────────────────────────────────────────────────────
const CSS = `
@keyframes eg-fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes eg-scaleIn {
  from { opacity: 0; transform: scale(0.82); }
  60%  { transform: scale(1.06); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes eg-slideRight {
  from { opacity: 0; transform: translateX(18px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes eg-slideLeft {
  from { opacity: 0; transform: translateX(-18px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes eg-feedbackIn {
  from { opacity: 0; transform: translateY(-5px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes eg-counterIn {
  from { opacity: 0; transform: translateX(22px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes eg-categoryIn {
  from { opacity: 0; transform: translateX(-10px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes eg-scoreReveal {
  0%   { opacity: 0; transform: scale(0.65) translateY(-3px); }
  55%  { transform: scale(1.12) translateY(0); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes eg-dotBounce {
  0%, 80%, 100% { transform: translateY(0);  opacity: 0.45; }
  40%           { transform: translateY(-5px); opacity: 1; }
}
@keyframes eg-chipPop {
  0%   { transform: scale(1); }
  35%  { transform: scale(0.90); }
  100% { transform: scale(1); }
}
@keyframes eg-flashGreen {
  0%,100% { background: #eaf6ea; }
  40%     { background: #bbf0bb; }
}
@keyframes eg-flashAmber {
  0%,100% { background: #fef9ec; }
  40%     { background: #fde8a0; }
}
@keyframes eg-flashRed {
  0%,100% { background: #fdecea; }
  40%     { background: #fbbcb8; }
}
@keyframes eg-shimmer {
  0%   { background-position: -260px 0; }
  100% { background-position: 260px 0; }
}
@keyframes eg-indicatorMove {
  from { opacity: 0; transform: scaleX(0.4); }
  to   { opacity: 1; transform: scaleX(1); }
}
@keyframes eg-responseIn {
  from { opacity: 0; transform: translateY(6px); filter: blur(2px); }
  to   { opacity: 1; transform: translateY(0);  filter: blur(0); }
}
`;

if (typeof document !== 'undefined') {
  const existing = document.getElementById('essay-guide-styles');
  if (!existing) {
    const tag = document.createElement('style');
    tag.id = 'essay-guide-styles';
    tag.textContent = CSS;
    document.head.appendChild(tag);
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'question', label: 'Question' },
  { key: 'plan',     label: 'Plan' },
  { key: 'review',   label: 'Review' },
  { key: 'workshop', label: 'Workshop' },
];

const PLAN_FIELDS = [
  {
    key: 'thesis',
    label: 'Thesis',
    placeholder: 'State your central argument in one clear sentence.',
    color: '#7a5c00', bg: '#fef3cd', border: '#f0c040',
    tip: 'A strong AP thesis makes a historically defensible claim and establishes a line of reasoning — it goes beyond restating the question.',
    phrases: ['which ultimately led to', 'fundamentally altered', 'by arguing that', 'as a direct result of'],
  },
  {
    key: 'evidence1',
    label: 'Evidence 1',
    placeholder: 'A specific historical event, person, law, or date that supports your thesis.',
    color: '#1e4d8c', bg: '#dbeafe', border: '#93c5fd',
    tip: 'Name it — vague evidence scores nothing. "Many people suffered" vs. "The Triangle Shirtwaist Fire of 1911" is the difference between 0 and 1.',
    phrases: ['as demonstrated by', 'notably', 'for example', 'as seen in'],
  },
  {
    key: 'evidence2',
    label: 'Evidence 2',
    placeholder: 'A second piece of specific evidence from a different category or period.',
    color: '#1e4d8c', bg: '#dbeafe', border: '#93c5fd',
    tip: 'Evidence from different categories (political, economic, social) shows breadth and earns the complexity point.',
    phrases: ['furthermore', 'in contrast', 'similarly', 'this parallels'],
  },
  {
    key: 'analysis',
    label: 'Analysis',
    placeholder: 'How does your evidence prove your thesis? Explain the "so what."',
    color: '#166534', bg: '#dcfce7', border: '#86efac',
    tip: "Don't just describe — explain why the evidence matters and how it proves your argument. Connecting evidence to thesis is what earns the reasoning point.",
    phrases: ['this illustrates', 'this demonstrates that', 'which suggests', 'this was significant because'],
  },
  {
    key: 'counterclaim',
    label: 'Counterclaim',
    placeholder: 'The strongest argument against your thesis, and your rebuttal.',
    color: '#6b21a8', bg: '#f3e8ff', border: '#c084fc',
    tip: 'Name a real opposing historical perspective. "Some people disagreed" is too vague — cite a specific viewpoint, event, or group that complicates your argument.',
    phrases: ['while some historians argue', 'despite the fact that', 'although', 'one might contend that'],
  },
];

const REVIEW_MODES = [
  { key: 'analyze',  label: 'Analyze',  desc: 'Full draft breakdown' },
  { key: 'thesis',   label: 'Thesis',   desc: 'Thesis only' },
  { key: 'evidence', label: 'Evidence', desc: 'Evidence quality' },
  { key: 'rubric',   label: 'Rubric',   desc: 'Point-by-point' },
];

const WORKSHOP_MODES = [
  { key: 'thesis',   label: 'Thesis' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'counter',  label: 'Counter' },
];

const SCORE_STYLES = {
  strong: { label: 'Strong',      color: '#166534', bg: '#eaf6ea', flash: 'eg-flashGreen 0.55s ease' },
  ok:     { label: 'Okay',        color: '#92400e', bg: '#fef9ec', flash: 'eg-flashAmber 0.55s ease' },
  weak:   { label: 'Needs work',  color: '#991b1b', bg: '#fdecea', flash: 'eg-flashRed 0.55s ease'   },
};

// ─── Small helpers ────────────────────────────────────────────────────────────
function ScoreBadge({ status, style = {} }) {
  if (!status || !SCORE_STYLES[status]) return null;
  const s = SCORE_STYLES[status];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      color: s.color, background: s.bg, letterSpacing: '0.03em',
      animation: 'eg-scoreReveal 0.32s cubic-bezier(0.34,1.56,0.64,1) both',
      ...style,
    }}>
      {s.label}
    </span>
  );
}

function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', padding: '0 4px' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%', background: 'currentColor',
          display: 'inline-block',
          animation: `eg-dotBounce 1.1s ease ${i * 0.18}s infinite`,
        }} />
      ))}
    </span>
  );
}

function ShimmerLine({ width = '100%', height = 13, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: 4,
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e4e4e4 50%, #f0f0f0 75%)',
      backgroundSize: '260px 100%',
      animation: 'eg-shimmer 1.4s linear infinite',
      ...style,
    }} />
  );
}

function Chip({ label, onClick, copied, style = {} }) {
  const [popping, setPopping] = useState(false);
  function handleClick() {
    setPopping(true);
    setTimeout(() => setPopping(false), 320);
    onClick?.();
  }
  return (
    <button
      onClick={handleClick}
      title="Click to copy"
      style={{
        fontSize: 10, padding: '2px 8px', borderRadius: 20,
        border: '1px solid var(--border)', background: copied ? '#eaf6ea' : '#fafafa',
        color: copied ? '#166534' : 'var(--muted)', cursor: 'pointer',
        fontFamily: 'var(--font-body)', transition: 'background 0.2s, color 0.2s, border-color 0.2s',
        animation: popping ? 'eg-chipPop 0.32s ease' : 'none',
        ...style,
      }}
    >
      {copied ? '✓ copied' : label}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function EssayGuide({ isOpen, onClose, question, essayDraft }) {
  // Panel mount/animation
  const [mounted, setMounted]   = useState(false);
  const [visible, setVisible]   = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Tab state with direction tracking for slide animation
  const TAB_ORDER = ['question', 'plan', 'review', 'workshop'];
  const [tab, setTab]           = useState('question');
  const [tabDir, setTabDir]     = useState('right');
  const [tabKey, setTabKey]     = useState(0);

  function switchTab(next) {
    const from = TAB_ORDER.indexOf(tab);
    const to   = TAB_ORDER.indexOf(next);
    setTabDir(to > from ? 'right' : 'left');
    setTab(next);
    setTabKey(k => k + 1);
  }

  // ── Question tab ─────────────────────────────────────────────────────────
  const [qAnalysis,   setQAnalysis]   = useState(null);
  const [qLoading,    setQLoading]    = useState(false);
  const [qError,      setQError]      = useState('');
  const [copiedChip,  setCopiedChip]  = useState(null);

  async function handleAnalyzeQuestion() {
    if (!question || qLoading) return;
    setQLoading(true);
    setQError('');
    try {
      const data = await decodeEssayQuestionApi(question);
      setQAnalysis(data);
    } catch {
      setQError('Could not analyze the question. Check your connection and try again.');
    } finally {
      setQLoading(false);
    }
  }

  function copyChip(term, key) {
    navigator.clipboard?.writeText(term).catch(() => {});
    setCopiedChip(key);
    setTimeout(() => setCopiedChip(null), 1600);
  }

  // ── Plan tab ─────────────────────────────────────────────────────────────
  const [outline,      setOutline]      = useState({ thesis: '', evidence1: '', evidence2: '', analysis: '', counterclaim: '' });
  const [planFeedback, setPlanFeedback] = useState(null);
  const [evaluating,   setEvaluating]   = useState(false);
  const [evalError,    setEvalError]    = useState('');
  const [expandedTip,  setExpandedTip]  = useState(null);

  async function handleEvaluate() {
    if (!question || evaluating) return;
    setEvaluating(true);
    setEvalError('');
    try {
      const { feedback } = await evaluateEssayGuideOutline(question, outline);
      setPlanFeedback(feedback);
    } catch {
      setEvalError('Evaluation failed. Check your connection and try again.');
    } finally {
      setEvaluating(false);
    }
  }

  // ── Review tab ───────────────────────────────────────────────────────────
  const [reviewMode,     setReviewMode]     = useState(null);
  const [reviewInput,    setReviewInput]    = useState('');
  const [reviewResponse, setReviewResponse] = useState(null);
  const [reviewLabel,    setReviewLabel]    = useState('');
  const [reviewing,      setReviewing]      = useState(false);
  const [reviewKey,      setReviewKey]      = useState(0);

  async function handleReview(mode, customText) {
    if (reviewing) return;
    const label = REVIEW_MODES.find(m => m.key === mode)?.label || 'Custom';
    setReviewMode(mode);
    setReviewing(true);
    setReviewResponse(null);
    setReviewLabel(label);
    try {
      const { response } = await coachEssayDraftApi(
        question, essayDraft, mode, customText || ''
      );
      setReviewResponse(response);
      setReviewKey(k => k + 1);
    } catch {
      setReviewResponse('Something went wrong. Try again.');
      setReviewKey(k => k + 1);
    } finally {
      setReviewing(false);
    }
  }

  function handleReviewKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (reviewInput.trim()) handleReview('custom', reviewInput.trim());
    }
  }

  // ── Workshop tab ─────────────────────────────────────────────────────────
  const [workshopMode, setWorkshopMode] = useState('thesis');
  const [workshopKey,  setWorkshopKey]  = useState(0);

  function switchWorkshop(mode) {
    setWorkshopMode(mode);
    setWorkshopKey(k => k + 1);
  }

  // Workshop – Thesis
  const [thesisDraft,    setThesisDraft]    = useState('');
  const [thesisAttempts, setThesisAttempts] = useState([]);
  const [scoringThesis,  setScoringThesis]  = useState(false);

  async function handleScoreThesis() {
    const text = thesisDraft.trim();
    if (!text || scoringThesis) return;
    setScoringThesis(true);
    try {
      const result = await rateThesisAttemptApi(question, text);
      setThesisAttempts(prev => [{ thesis: text, ...result, id: Date.now() }, ...prev].slice(0, 5));
      setThesisDraft('');
    } catch {
      setThesisAttempts(prev => [{ thesis: text, status: 'weak', feedback: 'Could not score. Try again.', id: Date.now() }, ...prev].slice(0, 5));
    } finally {
      setScoringThesis(false);
    }
  }

  // Workshop – Evidence
  const [evidenceDraft,      setEvidenceDraft]      = useState('');
  const [evidenceResult,     setEvidenceResult]     = useState(null);
  const [organizingEvidence, setOrganizingEvidence] = useState(false);
  const [evidenceResultKey,  setEvidenceResultKey]  = useState(0);

  async function handleOrganizeEvidence() {
    const text = evidenceDraft.trim();
    if (!text || organizingEvidence) return;
    setOrganizingEvidence(true);
    setEvidenceResult(null);
    try {
      const result = await organizeEvidenceVaultApi(question, text);
      setEvidenceResult(result);
      setEvidenceResultKey(k => k + 1);
    } catch {
      setEvidenceResult({ error: true });
    } finally {
      setOrganizingEvidence(false);
    }
  }

  // Workshop – Counter
  const [counterThesis,     setCounterThesis]     = useState('');
  const [counters,          setCounters]          = useState([]);
  const [generatingCounter, setGeneratingCounter] = useState(false);
  const [rebuttals,         setRebuttals]         = useState({});
  const [rebuttalFeedback,  setRebuttalFeedback]  = useState({});
  const [evalingRebuttal,   setEvalingRebuttal]   = useState({});

  async function handleGenerateCounters() {
    const text = counterThesis.trim();
    if (!text || generatingCounter) return;
    setGeneratingCounter(true);
    setCounters([]);
    setRebuttals({});
    setRebuttalFeedback({});
    try {
      const { counterarguments } = await generateCounterargumentsApi(question, text);
      setCounters(counterarguments || []);
    } catch {
      setCounters(['Could not generate counterarguments. Try again.']);
    } finally {
      setGeneratingCounter(false);
    }
  }

  async function handleEvalRebuttal(i) {
    const rebuttal = (rebuttals[i] || '').trim();
    if (!rebuttal || evalingRebuttal[i]) return;
    setEvalingRebuttal(prev => ({ ...prev, [i]: true }));
    setRebuttalFeedback(prev => ({ ...prev, [i]: null }));
    try {
      const result = await evaluateRebuttalApi(question, counterThesis, counters[i], rebuttal);
      setRebuttalFeedback(prev => ({ ...prev, [i]: result }));
    } catch {
      setRebuttalFeedback(prev => ({ ...prev, [i]: { status: 'weak', feedback: 'Could not evaluate. Try again.' } }));
    } finally {
      setEvalingRebuttal(prev => ({ ...prev, [i]: false }));
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  const slideAnim = tabDir === 'right'
    ? 'eg-slideRight 0.22s cubic-bezier(0.25,0.46,0.45,0.94) both'
    : 'eg-slideLeft 0.22s cubic-bezier(0.25,0.46,0.45,0.94) both';

  const btnBase = {
    padding: '9px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    transition: 'opacity 0.15s',
  };

  // ── Tab: Question ─────────────────────────────────────────────────────────
  function renderQuestion() {
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Question preview */}
        <div style={{
          fontSize: 12, color: 'var(--ink)', lineHeight: 1.65,
          padding: '10px 13px', background: 'var(--cream)',
          borderRadius: 6, borderLeft: '3px solid var(--rust)',
        }}>
          {question || 'No question loaded.'}
        </div>

        {/* Analyze button */}
        <button
          onClick={handleAnalyzeQuestion}
          disabled={qLoading || !question}
          style={{
            ...btnBase,
            background: qLoading ? 'var(--cream)' : 'var(--rust)',
            color: qLoading ? 'var(--muted)' : '#fff',
            border: qLoading ? '1px solid var(--border)' : 'none',
            opacity: (!question) ? 0.5 : 1,
          }}
        >
          {qLoading ? <><LoadingDots /> Analyzing</> : 'Analyze this question'}
        </button>

        {qError && <div style={{ fontSize: 11, color: '#991b1b', padding: '7px 10px', background: '#fdecea', borderRadius: 4 }}>{qError}</div>}

        {/* Results */}
        {qAnalysis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'eg-fadeUp 0.25s ease both' }}>

            {/* Skill + Period badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 20,
                background: 'var(--rust)', color: '#fff', letterSpacing: '0.03em',
                animation: 'eg-scaleIn 0.28s cubic-bezier(0.34,1.56,0.64,1) 0.05s both',
              }}>
                {qAnalysis.skill}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '4px 11px', borderRadius: 20,
                background: 'var(--cream)', color: 'var(--ink)', border: '1px solid var(--border)',
                animation: 'eg-scaleIn 0.28s cubic-bezier(0.34,1.56,0.64,1) 0.12s both',
              }}>
                {qAnalysis.period}
              </span>
            </div>

            {/* Vocabulary */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
                Key vocabulary
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(qAnalysis.vocabulary || []).map((term, i) => (
                  <Chip
                    key={term}
                    label={term}
                    copied={copiedChip === `vocab-${i}`}
                    onClick={() => copyChip(term, `vocab-${i}`)}
                    style={{ animation: `eg-scaleIn 0.24s ease ${0.08 + i * 0.05}s both` }}
                  />
                ))}
              </div>
            </div>

            {/* What AP wants */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
                What AP rewards
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {(qAnalysis.whatAPWants || []).map((item, i) => (
                  <div key={i} style={{
                    fontSize: 12, color: 'var(--ink)', lineHeight: 1.55,
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    animation: `eg-slideLeft 0.22s ease ${0.1 + i * 0.07}s both`,
                  }}>
                    <span style={{ color: '#166534', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Common mistakes */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
                Watch out for
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {(qAnalysis.commonMistakes || []).map((item, i) => (
                  <div key={i} style={{
                    fontSize: 12, color: 'var(--ink)', lineHeight: 1.55,
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    animation: `eg-slideLeft 0.22s ease ${0.18 + i * 0.07}s both`,
                  }}>
                    <span style={{ color: '#991b1b', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✗</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Tab: Plan ─────────────────────────────────────────────────────────────
  function renderPlan() {
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
          Draft your outline, then evaluate it against AP rubric standards.
        </p>

        {PLAN_FIELDS.map((f, fi) => {
          const fb = planFeedback?.[f.key];
          const tipOpen = expandedTip === f.key;
          return (
            <div key={f.key} style={{ animation: `eg-fadeUp 0.2s ease ${fi * 0.04}s both` }}>
              {/* Label row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: f.color, letterSpacing: '0.03em' }}>
                    {f.label}
                  </label>
                  <button
                    onClick={() => setExpandedTip(tipOpen ? null : f.key)}
                    style={{
                      fontSize: 10, color: tipOpen ? f.color : 'var(--muted)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '1px 4px', borderRadius: 3,
                      transition: 'color 0.15s',
                    }}
                  >
                    {tipOpen ? '▾ tip' : '▸ tip'}
                  </button>
                </div>
                {fb && <ScoreBadge status={fb.status} />}
              </div>

              {/* Tip callout */}
              {tipOpen && (
                <div style={{
                  fontSize: 11, color: f.color, lineHeight: 1.55,
                  padding: '7px 10px', background: `${f.bg}88`,
                  borderLeft: `3px solid ${f.border}`, borderRadius: '0 4px 4px 0',
                  marginBottom: 6,
                  animation: 'eg-feedbackIn 0.18s ease both',
                }}>
                  {f.tip}
                </div>
              )}

              {/* Textarea */}
              <textarea
                value={outline[f.key]}
                onChange={e => {
                  setOutline(o => ({ ...o, [f.key]: e.target.value }));
                  if (planFeedback) setPlanFeedback(fb => ({ ...fb, [f.key]: null }));
                }}
                placeholder={f.placeholder}
                rows={3}
                style={{
                  width: '100%', fontSize: 12, padding: '8px 10px',
                  boxSizing: 'border-box',
                  borderTop: `1px solid ${fb ? f.border : 'var(--border)'}`,
                  borderRight: `1px solid ${fb ? f.border : 'var(--border)'}`,
                  borderBottom: `1px solid ${fb ? f.border : 'var(--border)'}`,
                  borderLeft: `3px solid ${f.border}`,
                  borderRadius: '0 4px 4px 0', resize: 'vertical', lineHeight: 1.55,
                  fontFamily: 'var(--font-body)',
                  background: outline[f.key] ? `${f.bg}44` : '#fff',
                  outline: 'none',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
              />

              {/* Phrase chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                {f.phrases.map((p, pi) => (
                  <Chip
                    key={p}
                    label={p}
                    copied={copiedChip === `${f.key}-${pi}`}
                    onClick={() => copyChip(p, `${f.key}-${pi}`)}
                  />
                ))}
              </div>

              {/* Feedback */}
              {fb?.feedback && (
                <div style={{
                  fontSize: 11, color: 'var(--ink)', marginTop: 6,
                  lineHeight: 1.55, padding: '6px 10px',
                  background: 'var(--cream)', borderRadius: 4,
                  animation: 'eg-feedbackIn 0.22s ease both',
                }}>
                  {fb.feedback}
                </div>
              )}
            </div>
          );
        })}

        {evalError && (
          <div style={{ fontSize: 11, color: '#991b1b', padding: '7px 10px', background: '#fdecea', borderRadius: 4 }}>
            {evalError}
          </div>
        )}

        <button
          onClick={handleEvaluate}
          disabled={evaluating}
          style={{
            ...btnBase,
            background: evaluating ? 'var(--cream)' : 'var(--rust)',
            color: evaluating ? 'var(--muted)' : '#fff',
            border: evaluating ? '1px solid var(--border)' : 'none',
          }}
        >
          {evaluating ? <><LoadingDots /> Evaluating</> : 'Evaluate outline'}
        </button>

        {planFeedback && !evaluating && (
          <div style={{
            fontSize: 11, color: '#166534', textAlign: 'center', padding: '6px',
            background: '#eaf6ea', borderRadius: 4,
            animation: 'eg-scaleIn 0.2s ease both',
          }}>
            Feedback updated — see each field above.
          </div>
        )}
      </div>
    );
  }

  // ── Tab: Review ──────────────────────────────────────────────────────────
  function renderReview() {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Draft preview */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Your draft
            </div>
            <div style={{
              fontSize: 11, color: essayDraft ? 'var(--ink)' : 'var(--muted)',
              lineHeight: 1.6, padding: '9px 12px',
              background: 'var(--cream)', borderRadius: 5,
              maxHeight: 72, overflowY: 'auto',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {essayDraft
                ? (essayDraft.length > 220 ? essayDraft.slice(0, 220) + '…' : essayDraft)
                : 'Nothing written yet — feedback will guide how to start.'}
            </div>
          </div>

          {/* Mode buttons */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Feedback focus
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {REVIEW_MODES.map(m => {
                const active = reviewMode === m.key && !reviewing;
                const loading = reviewMode === m.key && reviewing;
                return (
                  <button
                    key={m.key}
                    onClick={() => handleReview(m.key)}
                    disabled={reviewing}
                    style={{
                      padding: '9px 10px', borderRadius: 5, cursor: 'pointer',
                      fontFamily: 'var(--font-body)', textAlign: 'left',
                      border: active ? '1.5px solid var(--rust)' : '1px solid var(--border)',
                      background: active ? '#fff8f6' : '#fafafa',
                      transition: 'border-color 0.15s, background 0.15s',
                      opacity: reviewing && !loading ? 0.5 : 1,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: active ? 'var(--rust)' : 'var(--ink)' }}>
                      {loading ? <LoadingDots /> : m.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{m.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Response */}
          {(reviewResponse || reviewing) && (
            <div key={reviewKey} style={{
              animation: 'eg-responseIn 0.3s ease both',
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {reviewLabel}
                <span style={{ width: 1, height: 10, background: 'var(--border)', display: 'inline-block' }} />
                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>feedback</span>
              </div>
              {reviewing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <ShimmerLine width="92%" />
                  <ShimmerLine width="78%" />
                  <ShimmerLine width="85%" />
                  <ShimmerLine width="60%" />
                </div>
              ) : (
                <div style={{
                  fontSize: 12, color: 'var(--ink)', lineHeight: 1.7,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {reviewResponse}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Custom question input */}
        <div style={{ padding: '11px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 7, flexShrink: 0 }}>
          <textarea
            value={reviewInput}
            onChange={e => setReviewInput(e.target.value)}
            onKeyDown={handleReviewKey}
            placeholder="Ask something specific… (Enter to send)"
            rows={2}
            disabled={reviewing}
            style={{
              flex: 1, fontSize: 12, padding: '8px 10px',
              border: '1px solid var(--border)', borderRadius: 4,
              resize: 'none', lineHeight: 1.5,
              fontFamily: 'var(--font-body)', outline: 'none',
            }}
          />
          <button
            onClick={() => { if (reviewInput.trim()) { handleReview('custom', reviewInput.trim()); setReviewInput(''); } }}
            disabled={reviewing || !reviewInput.trim()}
            style={{
              ...btnBase,
              padding: '0 13px', alignSelf: 'flex-end', height: 36,
              background: 'var(--rust)', color: '#fff',
              opacity: reviewing || !reviewInput.trim() ? 0.45 : 1,
            }}
          >
            Ask
          </button>
        </div>
      </div>
    );
  }

  // ── Tab: Workshop ─────────────────────────────────────────────────────────
  function renderWorkshop() {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Sub-mode bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {WORKSHOP_MODES.map(m => (
            <button
              key={m.key}
              onClick={() => switchWorkshop(m.key)}
              style={{
                flex: 1, padding: '9px 0', fontSize: 12, fontWeight: 500,
                background: 'none', border: 'none', cursor: 'pointer',
                color: workshopMode === m.key ? 'var(--rust)' : 'var(--muted)',
                borderBottom: workshopMode === m.key ? '2px solid var(--rust)' : '2px solid transparent',
                marginBottom: -1, fontFamily: 'var(--font-body)',
                transition: 'color 0.15s',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div key={workshopKey} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', animation: 'eg-fadeUp 0.2s ease both' }}>
          {workshopMode === 'thesis'   && renderThesisWorkshop()}
          {workshopMode === 'evidence' && renderEvidenceWorkshop()}
          {workshopMode === 'counter'  && renderCounterWorkshop()}
        </div>
      </div>
    );
  }

  function renderThesisWorkshop() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
          Write a thesis, score it, adjust, and compare attempts. See what makes one stronger than another.
        </p>

        <textarea
          value={thesisDraft}
          onChange={e => setThesisDraft(e.target.value)}
          placeholder="Write a thesis statement for this question…"
          rows={3}
          style={{
            width: '100%', fontSize: 12, padding: '9px 11px',
            boxSizing: 'border-box', border: '1px solid var(--border)',
            borderRadius: 4, resize: 'vertical', lineHeight: 1.55,
            fontFamily: 'var(--font-body)', outline: 'none',
          }}
        />

        <button
          onClick={handleScoreThesis}
          disabled={scoringThesis || !thesisDraft.trim()}
          style={{
            ...btnBase,
            background: scoringThesis ? 'var(--cream)' : 'var(--rust)',
            color: scoringThesis ? 'var(--muted)' : '#fff',
            border: scoringThesis ? '1px solid var(--border)' : 'none',
            opacity: !thesisDraft.trim() ? 0.45 : 1,
          }}
        >
          {scoringThesis ? <><LoadingDots /> Scoring</> : 'Score this thesis'}
        </button>

        {thesisAttempts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Attempts
            </div>
            {thesisAttempts.map((a, i) => {
              const s = SCORE_STYLES[a.status] || SCORE_STYLES.weak;
              return (
                <div
                  key={a.id}
                  style={{
                    borderRadius: 6,
                    borderTop: `1px solid ${s.bg}`,
                    borderRight: `1px solid ${s.bg}`,
                    borderBottom: `1px solid ${s.bg}`,
                    borderLeft: `3px solid ${s.color}`,
                    padding: '10px 12px', background: s.bg,
                    animation: `eg-slideRight 0.22s ease ${i === 0 ? 0 : 0}s both,
                                ${s.flash} ${i === 0 ? '0.55s ease 0.2s both' : 'none'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>#{thesisAttempts.length - i}</span>
                    <ScoreBadge status={a.status} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.55, marginBottom: 5 }}>{a.thesis}</div>
                  <div style={{ fontSize: 11, color: s.color, lineHeight: 1.5 }}>{a.feedback}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderEvidenceWorkshop() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
          Write down everything you remember about this topic — events, people, dates, laws. Don't filter yourself.
        </p>

        <textarea
          value={evidenceDraft}
          onChange={e => setEvidenceDraft(e.target.value)}
          placeholder="Brain-dump everything you know… e.g. Sherman Antitrust Act, Carnegie Steel, Pullman Strike 1894, laissez-faire policy, Rockefeller Standard Oil…"
          rows={5}
          style={{
            width: '100%', fontSize: 12, padding: '9px 11px',
            boxSizing: 'border-box', border: '1px solid var(--border)',
            borderRadius: 4, resize: 'vertical', lineHeight: 1.55,
            fontFamily: 'var(--font-body)', outline: 'none',
          }}
        />

        <button
          onClick={handleOrganizeEvidence}
          disabled={organizingEvidence || !evidenceDraft.trim()}
          style={{
            ...btnBase,
            background: organizingEvidence ? 'var(--cream)' : 'var(--rust)',
            color: organizingEvidence ? 'var(--muted)' : '#fff',
            border: organizingEvidence ? '1px solid var(--border)' : 'none',
            opacity: !evidenceDraft.trim() ? 0.45 : 1,
          }}
        >
          {organizingEvidence ? <><LoadingDots /> Organizing</> : 'Organize my evidence'}
        </button>

        {organizingEvidence && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i}>
                <ShimmerLine width="40%" height={11} style={{ marginBottom: 6 }} />
                <ShimmerLine width="85%" style={{ marginBottom: 4 }} />
                <ShimmerLine width="70%" style={{ marginBottom: 4 }} />
                <ShimmerLine width="78%" />
              </div>
            ))}
          </div>
        )}

        {evidenceResult && !evidenceResult.error && (
          <div key={evidenceResultKey} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(evidenceResult.categories || []).map((cat, ci) => (
              <div key={cat.name} style={{ animation: `eg-categoryIn 0.22s ease ${ci * 0.09}s both` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                  {cat.name}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(cat.items || []).map((item, ii) => {
                    const s = SCORE_STYLES[item.strength] || SCORE_STYLES.ok;
                    return (
                      <div
                        key={ii}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 8,
                          padding: '6px 9px', borderRadius: 4,
                          background: s.bg, borderLeft: `3px solid ${s.color}`,
                          animation: `eg-fadeUp 0.18s ease ${ci * 0.09 + ii * 0.05}s both`,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.4 }}>{item.text}</div>
                          <div style={{ fontSize: 10, color: s.color, marginTop: 2 }}>{item.note}</div>
                        </div>
                        <ScoreBadge status={item.strength} style={{ flexShrink: 0, marginTop: 1 }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {evidenceResult?.error && (
          <div style={{ fontSize: 11, color: '#991b1b', padding: '7px 10px', background: '#fdecea', borderRadius: 4 }}>
            Could not organize evidence. Try again.
          </div>
        )}
      </div>
    );
  }

  function renderCounterWorkshop() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
          Enter your thesis. The guide will challenge it with historically grounded counterarguments — write your rebuttal for each.
        </p>

        <textarea
          value={counterThesis}
          onChange={e => { setCounterThesis(e.target.value); setCounters([]); setRebuttals({}); setRebuttalFeedback({}); }}
          placeholder="Your thesis statement…"
          rows={3}
          style={{
            width: '100%', fontSize: 12, padding: '9px 11px',
            boxSizing: 'border-box', border: '1px solid var(--border)',
            borderRadius: 4, resize: 'vertical', lineHeight: 1.55,
            fontFamily: 'var(--font-body)', outline: 'none',
          }}
        />

        <button
          onClick={handleGenerateCounters}
          disabled={generatingCounter || !counterThesis.trim()}
          style={{
            ...btnBase,
            background: generatingCounter ? 'var(--cream)' : 'var(--rust)',
            color: generatingCounter ? 'var(--muted)' : '#fff',
            border: generatingCounter ? '1px solid var(--border)' : 'none',
            opacity: !counterThesis.trim() ? 0.45 : 1,
          }}
        >
          {generatingCounter ? <><LoadingDots /> Generating</> : 'Generate counterarguments'}
        </button>

        {counters.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {counters.map((counter, i) => {
              const rf = rebuttalFeedback[i];
              const rfStyle = rf ? (SCORE_STYLES[rf.status] || SCORE_STYLES.weak) : null;
              return (
                <div
                  key={i}
                  style={{
                    borderRadius: 6, border: '1px solid var(--border)',
                    padding: '12px 13px', background: '#fafafa',
                    animation: `eg-counterIn 0.25s cubic-bezier(0.25,0.46,0.45,0.94) ${i * 0.14}s both`,
                  }}
                >
                  {/* Counter header */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 9, alignItems: 'flex-start' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: '#fff',
                      background: 'var(--rust)', borderRadius: 20,
                      padding: '2px 7px', flexShrink: 0, marginTop: 1,
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.6 }}>{counter}</span>
                  </div>

                  {/* Rebuttal input */}
                  <textarea
                    value={rebuttals[i] || ''}
                    onChange={e => setRebuttals(prev => ({ ...prev, [i]: e.target.value }))}
                    placeholder="Write your rebuttal…"
                    rows={2}
                    style={{
                      width: '100%', fontSize: 12, padding: '7px 9px',
                      boxSizing: 'border-box',
                      border: rf ? `1px solid ${rfStyle.color}` : '1px solid var(--border)',
                      borderRadius: 4, resize: 'vertical', lineHeight: 1.5,
                      fontFamily: 'var(--font-body)', outline: 'none',
                      background: rf ? rfStyle.bg : '#fff',
                      transition: 'border-color 0.2s, background 0.3s',
                    }}
                  />

                  {/* Evaluate rebuttal */}
                  <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => handleEvalRebuttal(i)}
                      disabled={evalingRebuttal[i] || !(rebuttals[i] || '').trim()}
                      style={{
                        fontSize: 11, fontWeight: 600, padding: '4px 12px',
                        borderRadius: 4, border: '1px solid var(--border)',
                        background: 'var(--cream)', color: 'var(--ink)',
                        cursor: 'pointer', fontFamily: 'var(--font-body)',
                        opacity: !(rebuttals[i] || '').trim() ? 0.45 : 1,
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      {evalingRebuttal[i] ? <><LoadingDots /> Evaluating</> : 'Evaluate rebuttal'}
                    </button>
                    {rf && <ScoreBadge status={rf.status} />}
                  </div>

                  {rf?.feedback && (
                    <div style={{
                      fontSize: 11, color: rfStyle.color, lineHeight: 1.5,
                      marginTop: 7, padding: '5px 8px',
                      background: rfStyle.bg, borderRadius: 4,
                      animation: 'eg-feedbackIn 0.2s ease both',
                    }}>
                      {rf.feedback}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.16)',
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
          transition: 'opacity 0.28s ease',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
        width: 460, background: '#fff',
        boxShadow: '-4px 0 36px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--font-body)',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>

        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              Essay Guide
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
              AP History writing workshop
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 18, color: 'var(--muted)', lineHeight: 1, padding: 5,
              borderRadius: 4, transition: 'color 0.15s',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              style={{
                flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 500,
                background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t.key ? 'var(--rust)' : 'var(--muted)',
                borderBottom: tab === t.key ? '2px solid var(--rust)' : '2px solid transparent',
                marginBottom: -1, fontFamily: 'var(--font-body)',
                transition: 'color 0.15s',
                position: 'relative',
              }}
            >
              {t.label}
              {tab === t.key && (
                <span style={{
                  position: 'absolute', bottom: -1, left: '10%', right: '10%',
                  height: 2, background: 'var(--rust)',
                  animation: 'eg-indicatorMove 0.2s ease both',
                  borderRadius: 2,
                }} />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div key={tabKey} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: slideAnim }}>
          {tab === 'question' && renderQuestion()}
          {tab === 'plan'     && renderPlan()}
          {tab === 'review'   && renderReview()}
          {tab === 'workshop' && renderWorkshop()}
        </div>
      </div>
    </>
  );
}
