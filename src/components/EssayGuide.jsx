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
@keyframes eg-modalIn {
  from { opacity: 0; transform: scale(0.96) translateY(12px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
}
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
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes eg-slideLeft {
  from { opacity: 0; transform: translateX(-20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes eg-feedbackIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes eg-counterIn {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes eg-categoryIn {
  from { opacity: 0; transform: translateX(-10px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes eg-scoreReveal {
  0%  { opacity: 0; transform: scale(0.65); }
  55% { transform: scale(1.12); }
  100%{ opacity: 1; transform: scale(1); }
}
@keyframes eg-dotBounce {
  0%,80%,100% { transform: translateY(0);  opacity: 0.45; }
  40%         { transform: translateY(-5px); opacity: 1; }
}
@keyframes eg-chipPop {
  0%  { transform: scale(1); }
  35% { transform: scale(0.90); }
  100%{ transform: scale(1); }
}
@keyframes eg-barFill {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
@keyframes eg-shimmer {
  0%   { background-position: -300px 0; }
  100% { background-position: 300px 0; }
}
@keyframes eg-flashGreen {
  0%,100% { background: #eaf6ea; }
  40%     { background: #b3edbb; }
}
@keyframes eg-flashAmber {
  0%,100% { background: #fef9ec; }
  40%     { background: #fde8a0; }
}
@keyframes eg-flashRed {
  0%,100% { background: #fdecea; }
  40%     { background: #fbbcb8; }
}
@keyframes eg-priorityPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(192,57,43,0); }
  50%     { box-shadow: 0 0 0 5px rgba(192,57,43,0.12); }
}
`;
if (typeof document !== 'undefined' && !document.getElementById('essay-guide-styles')) {
  const tag = document.createElement('style');
  tag.id = 'essay-guide-styles';
  tag.textContent = CSS;
  document.head.appendChild(tag);
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'question', label: 'Question' },
  { key: 'plan',     label: 'Plan'     },
  { key: 'review',   label: 'Review'   },
  { key: 'workshop', label: 'Workshop' },
];

const PLAN_FIELDS = [
  {
    key: 'thesis', label: 'Thesis',
    placeholder: 'State your central argument in one clear sentence.',
    color: '#7a5c00', bg: '#fef3cd', border: '#f0c040',
    tip: 'A strong thesis makes a clear, arguable claim — not a fact, but a position you defend. It should go beyond restating the question and signal your line of reasoning.',
    phrases: ['which ultimately led to', 'fundamentally altered', 'by arguing that', 'as a direct result of'],
  },
  {
    key: 'evidence1', label: 'Evidence 1',
    placeholder: 'A specific historical event, person, law, or date.',
    color: '#1e4d8c', bg: '#dbeafe', border: '#93c5fd',
    tip: 'Name it. "Many people suffered" scores nothing. "The Triangle Shirtwaist Fire of 1911" earns the point.',
    phrases: ['as demonstrated by', 'notably', 'for example', 'as seen in'],
  },
  {
    key: 'evidence2', label: 'Evidence 2',
    placeholder: 'A second piece of evidence from a different category or time period.',
    color: '#1e4d8c', bg: '#dbeafe', border: '#93c5fd',
    tip: 'Evidence from different categories (political, economic, social) shows breadth and earns the complexity point.',
    phrases: ['furthermore', 'in contrast', 'similarly', 'this parallels'],
  },
  {
    key: 'analysis', label: 'Analysis',
    placeholder: 'How does your evidence prove your thesis? Explain the "so what."',
    color: '#166534', bg: '#dcfce7', border: '#86efac',
    tip: "Don't just describe — explain why it matters and how it proves your argument.",
    phrases: ['this illustrates', 'this demonstrates that', 'which suggests', 'this was significant because'],
  },
  {
    key: 'counterclaim', label: 'Counterclaim',
    placeholder: 'The strongest argument against your thesis, and your rebuttal.',
    color: '#6b21a8', bg: '#f3e8ff', border: '#c084fc',
    tip: 'Name a real opposing perspective — not "some people disagreed." Specific viewpoints earn the complexity point.',
    phrases: ['while some historians argue', 'despite the fact that', 'although', 'one might contend that'],
  },
];

const REVIEW_MODES = [
  { key: 'analyze',  label: 'Analyze',  icon: '◈', desc: 'Full breakdown' },
  { key: 'thesis',   label: 'Thesis',   icon: '◎', desc: 'Thesis only' },
  { key: 'evidence', label: 'Evidence', icon: '◆', desc: 'Evidence quality' },
  { key: 'rubric',   label: 'Rubric',   icon: '◉', desc: 'Point by point' },
];

const SCORE_STYLES = {
  strong: { label: 'Strong',     color: '#166534', bg: '#eaf6ea', flash: 'eg-flashGreen 0.55s ease' },
  ok:     { label: 'Okay',       color: '#92400e', bg: '#fef9ec', flash: 'eg-flashAmber 0.55s ease' },
  weak:   { label: 'Needs work', color: '#991b1b', bg: '#fdecea', flash: 'eg-flashRed 0.55s ease'   },
};

// ─── Inline helpers ───────────────────────────────────────────────────────────
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
  if (parts.length === 1) return text;
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('*')  && p.endsWith('*'))  return <em key={i}>{p.slice(1, -1)}</em>;
    return p || null;
  });
}

function renderMarkdown(text) {
  if (!text) return null;
  const raw = text.split('\n');
  const lines = [];
  let i = 0;
  while (i < raw.length) {
    const t = raw[i].trim();
    const next = i + 1 < raw.length ? raw[i + 1].trim() : '';
    if (/^[•\-]$/.test(t) && next) { lines.push(`• ${next}`); i += 2; }
    else if (/^\d+\.$/.test(t) && next) { lines.push(`${t} ${next}`); i += 2; }
    else { lines.push(raw[i]); i++; }
  }
  const out = [];
  let k = 0;
  for (const line of lines) {
    const t = line.trim();
    if (!t) { out.push(<div key={k++} style={{ height: 5 }} />); continue; }
    const h4 = t.match(/^#{3,4}\s+(.+)/);
    if (h4) { out.push(<div key={k++} style={{ fontWeight: 700, fontSize: 12, color: 'var(--ink)', marginTop: 10, marginBottom: 3 }}>{renderInline(h4[1])}</div>); continue; }
    const h3 = t.match(/^#{1,2}\s+(.+)/);
    if (h3) { out.push(<div key={k++} style={{ fontWeight: 700, fontSize: 13, color: 'var(--rust)', marginTop: 13, marginBottom: 4 }}>{renderInline(h3[1])}</div>); continue; }
    if (/^[-•*]\s/.test(t)) {
      out.push(<div key={k++} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 3 }}><span style={{ color: 'var(--rust)', flexShrink: 0, fontWeight: 700, fontSize: 10, marginTop: 3 }}>•</span><span style={{ lineHeight: 1.6 }}>{renderInline(t.slice(2))}</span></div>);
      continue;
    }
    const num = t.match(/^(\d+)\.\s+(.+)/);
    if (num) { out.push(<div key={k++} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 3 }}><span style={{ color: 'var(--rust)', flexShrink: 0, fontWeight: 700, fontSize: 11, minWidth: 16 }}>{num[1]}.</span><span style={{ lineHeight: 1.6 }}>{renderInline(num[2])}</span></div>); continue; }
    const fullBold = t.match(/^\*\*([^*]+)\*\*:?\s*$/);
    if (fullBold) { out.push(<div key={k++} style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 12, marginTop: 9, marginBottom: 3 }}>{fullBold[1]}</div>); continue; }
    out.push(<div key={k++} style={{ lineHeight: 1.65, marginBottom: 2 }}>{renderInline(t)}</div>);
  }
  return out;
}

// ─── Small UI primitives ──────────────────────────────────────────────────────
function ScoreBadge({ status, size = 'sm', style = {} }) {
  if (!status || !SCORE_STYLES[status]) return null;
  const s = SCORE_STYLES[status];
  return (
    <span style={{
      fontSize: size === 'lg' ? 13 : 10, fontWeight: 700,
      padding: size === 'lg' ? '5px 14px' : '2px 8px',
      borderRadius: 20, color: s.color, background: s.bg,
      letterSpacing: '0.03em', whiteSpace: 'nowrap',
      animation: 'eg-scoreReveal 0.32s cubic-bezier(0.34,1.56,0.64,1) both',
      ...style,
    }}>
      {s.label}
    </span>
  );
}

function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', padding: '0 2px' }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block',
          animation: `eg-dotBounce 1.1s ease ${i * 0.18}s infinite`,
        }} />
      ))}
    </span>
  );
}

function ShimmerBlock({ lines = 3 }) {
  const widths = ['90%', '75%', '82%', '60%', '70%'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} style={{
          height: 13, borderRadius: 4, width: widths[i % widths.length],
          background: 'linear-gradient(90deg,#f0f0f0 25%,#e4e4e4 50%,#f0f0f0 75%)',
          backgroundSize: '300px 100%',
          animation: 'eg-shimmer 1.4s linear infinite',
        }} />
      ))}
    </div>
  );
}

function Chip({ label, onClick, copied, style = {} }) {
  const [pop, setPop] = useState(false);
  return (
    <button onClick={() => { setPop(true); setTimeout(() => setPop(false), 320); onClick?.(); }}
      title="Click to copy"
      style={{
        fontSize: 10, padding: '3px 9px', borderRadius: 20,
        border: '1px solid var(--border)', background: copied ? '#eaf6ea' : '#fafafa',
        color: copied ? '#166534' : 'var(--muted)', cursor: 'pointer',
        fontFamily: 'var(--font-body)', transition: 'background 0.2s, color 0.2s',
        animation: pop ? 'eg-chipPop 0.32s ease' : 'none',
        ...style,
      }}>
      {copied ? '✓ copied' : label}
    </button>
  );
}

function ScoreBar({ earned, max, color }) {
  const pct = max > 0 ? (earned / max) * 100 : 0;
  return (
    <div style={{ background: '#ebebeb', height: 5, borderRadius: 3, overflow: 'hidden', flex: 1 }}>
      <div style={{
        height: '100%', background: color, borderRadius: 3,
        width: `${pct}%`, transformOrigin: 'left',
        animation: 'eg-barFill 0.5s cubic-bezier(0.25,0.46,0.45,0.94) 0.1s both',
      }} />
    </div>
  );
}

// ─── 3D Charts ────────────────────────────────────────────────────────────────
const STATUS_VAL = { strong: 1, ok: 0.55, weak: 0.15 };

function RadarChart({ sections, size = 260 }) {
  const [tilt, setTilt] = useState({ x: 4, y: 0 });
  const data = sections.map(s => ({ label: s.name, value: STATUS_VAL[s.status] ?? 0.15 }));
  const n = data.length;
  const cx = size / 2, cy = size / 2;
  const r = size * 0.32;
  const labelR = r + 28;
  const angle = i => (i / n) * Math.PI * 2 - Math.PI / 2;
  const pt = (i, v) => ({ x: cx + r * v * Math.cos(angle(i)), y: cy + r * v * Math.sin(angle(i)) });

  const avg = data.reduce((s, d) => s + d.value, 0) / n;
  const strokeColor = avg > 0.7 ? '#16a34a' : avg > 0.42 ? '#d97706' : '#dc2626';
  const fillColor   = avg > 0.7 ? 'rgba(22,163,74,0.18)' : avg > 0.42 ? 'rgba(217,119,6,0.18)' : 'rgba(220,38,38,0.18)';
  const glowColor   = avg > 0.7 ? 'rgba(22,163,74,0.35)' : avg > 0.42 ? 'rgba(217,119,6,0.35)' : 'rgba(220,38,38,0.35)';
  const dotColor    = avg > 0.7 ? '#22c55e' : avg > 0.42 ? '#f59e0b' : '#ef4444';

  const dataPoints = data.map((d, i) => pt(i, d.value));
  const dataPath   = dataPoints.map(p => `${p.x},${p.y}`).join(' ');
  const rings = [0.3, 0.55, 0.8, 1.0];

  return (
    <div
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTilt({
          x: ((e.clientY - rect.top)  / rect.height - 0.5) * 22,
          y: -((e.clientX - rect.left) / rect.width  - 0.5) * 22,
        });
      }}
      onMouseLeave={() => setTilt({ x: 4, y: 0 })}
      style={{ perspective: 700, display: 'flex', justifyContent: 'center', cursor: 'default' }}
    >
      <div style={{
        transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: 'transform 0.12s ease',
        transformStyle: 'preserve-3d',
        filter: `drop-shadow(0 8px 20px ${glowColor})`,
      }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <filter id="eg-glow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Grid rings */}
          {rings.map((rv, ri) => (
            <polygon key={ri}
              points={data.map((_, i) => `${cx + r*rv*Math.cos(angle(i))},${cy + r*rv*Math.sin(angle(i))}`).join(' ')}
              fill={ri === 3 ? '#f5f5f5' : 'none'}
              stroke={ri === 3 ? '#e0e0e0' : '#ececec'} strokeWidth={ri === 3 ? 1.5 : 1}
            />
          ))}

          {/* Axes */}
          {data.map((_, i) => {
            const a = pt(i, 1);
            return <line key={i} x1={cx} y1={cy} x2={a.x} y2={a.y} stroke="#e0e0e0" strokeWidth="1" />;
          })}

          {/* Data fill */}
          <polygon points={dataPath} fill={fillColor} stroke={strokeColor} strokeWidth="2.5"
            filter="url(#eg-glow)" strokeLinejoin="round" />

          {/* Dot halos + dots */}
          {dataPoints.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="7" fill={dotColor} opacity="0.2" />
              <circle cx={p.x} cy={p.y} r="4" fill={dotColor} stroke="#fff" strokeWidth="1.5" />
            </g>
          ))}

          {/* Labels */}
          {data.map((d, i) => {
            const a = angle(i);
            const lx = cx + labelR * Math.cos(a);
            const ly = cy + labelR * Math.sin(a);
            const anchor = Math.cos(a) > 0.15 ? 'start' : Math.cos(a) < -0.15 ? 'end' : 'middle';
            return (
              <text key={i} x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle"
                fontSize="10.5" fontWeight="600" fill="#666" fontFamily="var(--font-body)">
                {d.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function ScoreRing({ earned, max, color, size = 90 }) {
  const pct = max > 0 ? earned / max : 0;
  const radius = (size - 14) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = circ * pct;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <defs>
        <filter id={`ring-glow-${earned}-${max}`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#ebebeb" strokeWidth="7" />
      <circle cx={size/2} cy={size/2} r={radius} fill="none"
        stroke={color} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        filter={`url(#ring-glow-${earned}-${max})`}
        style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.25,0.46,0.45,0.94)' }}
      />
      <text x={size/2} y={size/2 - 6} textAnchor="middle" dominantBaseline="middle"
        fontSize="18" fontWeight="800" fill={color} fontFamily="var(--font-display)">{earned}</text>
      <text x={size/2} y={size/2 + 11} textAnchor="middle" dominantBaseline="middle"
        fontSize="9" fill="#999" fontFamily="var(--font-body)">/{max}</text>
    </svg>
  );
}

// ─── Review structured result cards ──────────────────────────────────────────
function AnalyzeResult({ data }) {
  if (!data) return null;
  const hasSections = (data.sections || []).length > 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'eg-fadeUp 0.25s ease both' }}>
      {/* Radar chart + overview side by side */}
      {hasSections && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 12px', background: 'var(--cream)', borderRadius: 10 }}>
          <RadarChart sections={data.sections} size={200} />
          <div style={{ flex: 1, fontSize: 13, color: 'var(--ink)', lineHeight: 1.7 }}>{data.overview}</div>
        </div>
      )}
      {!hasSections && (
        <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.7, padding: '12px 16px', background: 'var(--cream)', borderRadius: 8 }}>
          {data.overview}
        </div>
      )}

      {/* Section cards — single column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {(data.sections || []).map((s, i) => {
          const st = SCORE_STYLES[s.status] || SCORE_STYLES.weak;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '10px 14px', borderRadius: 8,
              borderLeft: `3px solid ${st.color}`, background: st.bg,
              animation: `eg-fadeUp 0.2s ease ${i * 0.06}s both`,
            }}>
              <div style={{ minWidth: 110, flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: st.color, marginBottom: 3 }}>{s.name}</div>
                <ScoreBadge status={s.status} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.6 }}>{s.feedback}</div>
            </div>
          );
        })}
      </div>

      {/* Priority */}
      {data.priority && (
        <div style={{
          padding: '11px 15px', borderRadius: 8,
          background: '#fff8f6', borderLeft: '3px solid var(--rust)',
          animation: 'eg-priorityPulse 2s ease 0.4s 2, eg-fadeUp 0.25s ease 0.3s both',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--rust)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
            Fix this first
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.6 }}>{data.priority}</div>
        </div>
      )}
    </div>
  );
}

function ThesisResult({ data }) {
  if (!data) return null;
  const st = SCORE_STYLES[data.status] || SCORE_STYLES.weak;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'eg-fadeUp 0.25s ease both' }}>
      {/* Status + verdict */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: st.bg, borderRadius: 8, borderLeft: `3px solid ${st.color}` }}>
        <ScoreBadge status={data.status} size="lg" />
        <span style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>{data.verdict}</span>
      </div>
      {/* Strengths */}
      {data.strengths && (
        <div style={{ padding: '10px 14px', background: '#eaf6ea', borderRadius: 8, animation: 'eg-fadeUp 0.2s ease 0.07s both' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>What works</div>
          <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.6 }}>{data.strengths}</div>
        </div>
      )}
      {/* Fix */}
      {data.fix && (
        <div style={{ padding: '10px 14px', background: '#fdecea', borderRadius: 8, animation: 'eg-fadeUp 0.2s ease 0.12s both' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Change this</div>
          <div style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.6 }}>{data.fix}</div>
        </div>
      )}
      {/* Direction */}
      {data.direction && (
        <div style={{ padding: '10px 14px', background: 'var(--cream)', borderRadius: 8, animation: 'eg-fadeUp 0.2s ease 0.18s both' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Direction</div>
          <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.6, fontStyle: 'italic' }}>{data.direction}</div>
        </div>
      )}
    </div>
  );
}

function EvidenceResult({ data }) {
  if (!data) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'eg-fadeUp 0.25s ease both' }}>
      {/* Verdict */}
      <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.65, padding: '11px 15px', background: 'var(--cream)', borderRadius: 8 }}>
        {data.verdict}
      </div>
      {/* Present */}
      {data.present?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Evidence present</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {data.present.map((item, i) => {
              const st = SCORE_STYLES[item.strength] || SCORE_STYLES.ok;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '8px 11px', borderRadius: 6, background: st.bg,
                  borderLeft: `3px solid ${st.color}`,
                  animation: `eg-categoryIn 0.2s ease ${i * 0.06}s both`,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.4 }}>{item.text}</div>
                    <div style={{ fontSize: 10, color: st.color, marginTop: 2 }}>{item.note}</div>
                  </div>
                  <ScoreBadge status={item.strength} style={{ flexShrink: 0, marginTop: 1 }} />
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Missing */}
      {data.missing?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Add this</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {data.missing.map((item, i) => (
              <div key={i} style={{
                display: 'flex', gap: 8, alignItems: 'flex-start',
                padding: '8px 11px', background: '#fafafa', borderRadius: 6,
                border: '1px dashed var(--border)',
                animation: `eg-slideRight 0.2s ease ${i * 0.06}s both`,
              }}>
                <span style={{ color: 'var(--rust)', fontWeight: 700, fontSize: 13, flexShrink: 0, marginTop: -1 }}>+</span>
                <span style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RubricResult({ data }) {
  if (!data) return null;
  const total  = (data.points || []).reduce((s, p) => s + (p.earned || 0), 0);
  const maxTotal = (data.points || []).reduce((s, p) => s + (p.max || 0), 0);
  const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
  const scoreColor = pct >= 70 ? '#166534' : pct >= 40 ? '#92400e' : '#991b1b';
  const scoreBg    = pct >= 70 ? '#eaf6ea'  : pct >= 40 ? '#fef9ec'  : '#fdecea';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'eg-fadeUp 0.25s ease both' }}>
      {/* Score summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', background: scoreBg, borderRadius: 10 }}>
        <ScoreRing earned={total} max={maxTotal} color={scoreColor} size={90} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: scoreColor, marginBottom: 6 }}>
            {total}/{maxTotal} points
          </div>
          <ScoreBar earned={total} max={maxTotal} color={scoreColor} />
          <div style={{ fontSize: 11, color: scoreColor, marginTop: 5 }}>
            {pct >= 70 ? 'Strong score — refine to push higher.' : pct >= 40 ? 'Approaching passing — focus on the weakest points.' : 'Significant gaps — target the highest-weight points first.'}
          </div>
        </div>
      </div>
      {/* Rubric points */}
      {(data.points || []).map((pt, i) => {
        const earned = pt.earned ?? 0;
        const ptColor = earned === pt.max ? '#166534' : earned > 0 ? '#92400e' : '#991b1b';
        const ptBg    = earned === pt.max ? '#eaf6ea'  : earned > 0 ? '#fef9ec'  : '#fdecea';
        return (
          <div key={i} style={{
            padding: '11px 14px', borderRadius: 8, background: ptBg,
            animation: `eg-fadeUp 0.2s ease ${i * 0.07}s both`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: ptColor, flex: 1 }}>{pt.name}</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {Array.from({ length: pt.max }, (_, di) => (
                  <div key={di} style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: di < earned ? ptColor : '#d5d5d5',
                    transition: 'background 0.2s',
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: ptColor }}>{earned}/{pt.max}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <ScoreBar earned={earned} max={pt.max} color={ptColor} />
            </div>
            <div style={{ fontSize: 11, color: ptColor, lineHeight: 1.55, marginTop: 6 }}>{pt.feedback}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function EssayGuide({ isOpen, onClose, question, essayDraft }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

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

  // Tab navigation
  const TAB_ORDER = ['question', 'plan', 'review', 'workshop'];
  const [tab,    setTab]    = useState('question');
  const [tabDir, setTabDir] = useState('right');
  const [tabKey, setTabKey] = useState(0);

  function switchTab(next) {
    const from = TAB_ORDER.indexOf(tab), to = TAB_ORDER.indexOf(next);
    setTabDir(to > from ? 'right' : 'left');
    setTab(next);
    setTabKey(k => k + 1);
  }

  // ── Question tab ────────────────────────────────────────────────
  const [qAnalysis,  setQAnalysis]  = useState(null);
  const [qLoading,   setQLoading]   = useState(false);
  const [qError,     setQError]     = useState('');
  const [copiedChip, setCopiedChip] = useState(null);

  async function handleAnalyzeQuestion() {
    if (!question || qLoading) return;
    setQLoading(true); setQError('');
    try { setQAnalysis(await decodeEssayQuestionApi(question)); }
    catch { setQError('Could not analyze the question. Try again.'); }
    finally { setQLoading(false); }
  }

  function copyChip(term, key) {
    navigator.clipboard?.writeText(term).catch(() => {});
    setCopiedChip(key);
    setTimeout(() => setCopiedChip(null), 1600);
  }

  // ── Plan tab ────────────────────────────────────────────────────
  const [outline,      setOutline]      = useState({ thesis: '', evidence1: '', evidence2: '', analysis: '', counterclaim: '' });
  const [planFeedback, setPlanFeedback] = useState(null);
  const [evaluating,   setEvaluating]   = useState(false);
  const [evalError,    setEvalError]    = useState('');
  const [expandedTip,  setExpandedTip]  = useState(null);

  async function handleEvaluate() {
    if (!question || evaluating) return;
    setEvaluating(true); setEvalError('');
    try { const { feedback } = await evaluateEssayGuideOutline(question, outline); setPlanFeedback(feedback); }
    catch { setEvalError('Evaluation failed. Try again.'); }
    finally { setEvaluating(false); }
  }

  // ── Review tab ──────────────────────────────────────────────────
  const [reviewMode,   setReviewMode]   = useState(null);
  const [reviewResult, setReviewResult] = useState(null);
  const [reviewInput,  setReviewInput]  = useState('');
  const [reviewing,    setReviewing]    = useState(false);
  const [reviewKey,    setReviewKey]    = useState(0);

  async function handleReview(mode, customText) {
    if (reviewing) return;
    setReviewMode(mode); setReviewing(true); setReviewResult(null);
    try {
      const result = await coachEssayDraftApi(question, essayDraft, mode, customText || '');
      setReviewResult(result);
      setReviewKey(k => k + 1);
    } catch {
      setReviewResult({ type: 'custom', data: { text: 'Something went wrong. Try again.' } });
      setReviewKey(k => k + 1);
    } finally { setReviewing(false); }
  }

  // ── Workshop tab ────────────────────────────────────────────────
  const [workshopMode, setWorkshopMode] = useState('thesis');
  const [workshopKey,  setWorkshopKey]  = useState(0);
  function switchWorkshop(mode) { setWorkshopMode(mode); setWorkshopKey(k => k + 1); }

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
    } finally { setScoringThesis(false); }
  }

  // Workshop – Evidence
  const [evidenceDraft,  setEvidenceDraft]  = useState('');
  const [evidenceResult, setEvidenceResult] = useState(null);
  const [organizing,     setOrganizing]     = useState(false);
  const [evidenceKey,    setEvidenceKey]    = useState(0);
  async function handleOrganizeEvidence() {
    const text = evidenceDraft.trim();
    if (!text || organizing) return;
    setOrganizing(true); setEvidenceResult(null);
    try { setEvidenceResult(await organizeEvidenceVaultApi(question, text)); setEvidenceKey(k => k + 1); }
    catch { setEvidenceResult({ error: true }); }
    finally { setOrganizing(false); }
  }

  // Workshop – Counter
  const [counterThesis,    setCounterThesis]    = useState('');
  const [counters,         setCounters]         = useState([]);
  const [generatingCounter,setGeneratingCounter]= useState(false);
  const [rebuttals,        setRebuttals]        = useState({});
  const [rebuttalFeedback, setRebuttalFeedback] = useState({});
  const [evalingRebuttal,  setEvalingRebuttal]  = useState({});
  async function handleGenerateCounters() {
    const text = counterThesis.trim();
    if (!text || generatingCounter) return;
    setGeneratingCounter(true); setCounters([]); setRebuttals({}); setRebuttalFeedback({});
    try { const { counterarguments } = await generateCounterargumentsApi(question, text); setCounters(counterarguments || []); }
    catch { setCounters(['Could not generate counterarguments. Try again.']); }
    finally { setGeneratingCounter(false); }
  }
  async function handleEvalRebuttal(i) {
    const rebuttal = (rebuttals[i] || '').trim();
    if (!rebuttal || evalingRebuttal[i]) return;
    setEvalingRebuttal(p => ({ ...p, [i]: true }));
    setRebuttalFeedback(p => ({ ...p, [i]: null }));
    try { setRebuttalFeedback(p => ({ ...p, [i]: null })); const r = await evaluateRebuttalApi(question, counterThesis, counters[i], rebuttal); setRebuttalFeedback(p => ({ ...p, [i]: r })); }
    catch { setRebuttalFeedback(p => ({ ...p, [i]: { status: 'weak', feedback: 'Could not evaluate. Try again.' } })); }
    finally { setEvalingRebuttal(p => ({ ...p, [i]: false })); }
  }

  // ─── Shared style helpers ──────────────────────────────────────
  const btn = (active, loading) => ({
    padding: '9px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    background: loading ? 'var(--cream)' : active ? 'var(--rust)' : 'var(--rust)',
    color: loading ? 'var(--muted)' : '#fff',
    ...(loading ? { border: '1px solid var(--border)' } : {}),
    transition: 'opacity 0.15s',
  });

  const slideAnim = tabDir === 'right'
    ? 'eg-slideRight 0.22s cubic-bezier(0.25,0.46,0.45,0.94) both'
    : 'eg-slideLeft  0.22s cubic-bezier(0.25,0.46,0.45,0.94) both';

  // ─── Tab: Question ─────────────────────────────────────────────
  function renderQuestion() {
    const section = (label, children, delay = 0) => (
      <div style={{ animation: `eg-fadeUp 0.22s ease ${delay}s both` }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 9 }}>{label}</div>
        {children}
      </div>
    );

    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Prompt box */}
        <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.7, padding: '13px 16px', background: 'var(--cream)', borderRadius: 8, borderLeft: '3px solid var(--rust)' }}>
          {question || 'No question loaded.'}
        </div>

        <button onClick={handleAnalyzeQuestion} disabled={qLoading || !question}
          style={{ ...btn(true, qLoading), opacity: !question ? 0.5 : 1 }}>
          {qLoading ? <><LoadingDots /> Analyzing</> : 'Analyze this question'}
        </button>

        {qError && <div style={{ fontSize: 11, color: '#991b1b', padding: '8px 12px', background: '#fdecea', borderRadius: 6 }}>{qError}</div>}

        {qAnalysis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Skill + Period */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, animation: 'eg-fadeUp 0.2s ease both' }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '5px 13px', borderRadius: 20, background: 'var(--rust)', color: '#fff', animation: 'eg-scaleIn 0.28s ease 0.04s both' }}>
                {qAnalysis.skill}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '5px 13px', borderRadius: 20, background: 'var(--cream)', color: 'var(--ink)', border: '1px solid var(--border)', animation: 'eg-scaleIn 0.28s ease 0.1s both' }}>
                {qAnalysis.period}
              </span>
            </div>

            {/* What the question is really asking */}
            {qAnalysis.breakdown && section('What this question is asking', (
              <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.75, padding: '12px 16px', background: 'var(--cream)', borderRadius: 8 }}>
                {qAnalysis.breakdown}
              </div>
            ), 0.05)}

            {/* Historical context */}
            {qAnalysis.context && section('Historical context', (
              <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.75, padding: '12px 16px', background: '#fafafa', borderRadius: 8, borderLeft: '3px solid #d5d5d5' }}>
                {qAnalysis.context}
              </div>
            ), 0.1)}

            {/* Strong argument directions */}
            {qAnalysis.strongArguments?.length > 0 && section('Strong argument directions', (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {qAnalysis.strongArguments.map((arg, i) => (
                  <div key={i} style={{
                    padding: '11px 14px', borderRadius: 8,
                    background: '#fff', border: '1px solid var(--border)',
                    borderLeft: '3px solid var(--rust)',
                    animation: `eg-slideRight 0.2s ease ${0.12 + i * 0.07}s both`,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--rust)', marginBottom: 4 }}>Direction {i + 1}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.65 }}>{arg}</div>
                  </div>
                ))}
              </div>
            ), 0.15)}

            {/* Key evidence */}
            {qAnalysis.keyEvidence?.length > 0 && section('Key evidence to use', (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {qAnalysis.keyEvidence.map((ev, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    padding: '9px 13px', background: '#fafafa', borderRadius: 7,
                    border: '1px solid var(--border)',
                    animation: `eg-fadeUp 0.2s ease ${0.18 + i * 0.06}s both`,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{ev.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{ev.relevance}</div>
                    </div>
                  </div>
                ))}
              </div>
            ), 0.2)}

            {/* Vocabulary */}
            {qAnalysis.vocabulary?.length > 0 && section('Vocabulary to use', (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {qAnalysis.vocabulary.map((term, i) => (
                  <Chip key={term} label={term} copied={copiedChip === `v-${i}`} onClick={() => copyChip(term, `v-${i}`)}
                    style={{ fontSize: 11, padding: '4px 12px', animation: `eg-scaleIn 0.22s ease ${0.22 + i * 0.04}s both` }} />
                ))}
              </div>
            ), 0.24)}

            {/* Complexity angles */}
            {qAnalysis.complexityAngles?.length > 0 && section('How to add complexity', (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {qAnalysis.complexityAngles.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '8px 12px', background: '#f5f0ff', borderRadius: 7, animation: `eg-slideLeft 0.2s ease ${0.26 + i * 0.07}s both` }}>
                    <span style={{ color: '#6b21a8', fontWeight: 700, flexShrink: 0, fontSize: 13, marginTop: -1 }}>◈</span>
                    <span style={{ fontSize: 12, color: '#3b1764', lineHeight: 1.6 }}>{item}</span>
                  </div>
                ))}
              </div>
            ), 0.28)}

            {/* What rewards */}
            {qAnalysis.whatAPWants?.length > 0 && section('What this essay rewards', (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {qAnalysis.whatAPWants.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '8px 12px', background: '#eaf6ea', borderRadius: 7, animation: `eg-slideLeft 0.2s ease ${0.3 + i * 0.07}s both` }}>
                    <span style={{ color: '#166534', fontWeight: 700, flexShrink: 0, fontSize: 12 }}>✓</span>
                    <span style={{ fontSize: 12, color: '#166534', lineHeight: 1.6 }}>{item}</span>
                  </div>
                ))}
              </div>
            ), 0.32)}

            {/* Common mistakes */}
            {qAnalysis.commonMistakes?.length > 0 && section('Common mistakes', (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {qAnalysis.commonMistakes.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '8px 12px', background: '#fdecea', borderRadius: 7, animation: `eg-slideRight 0.2s ease ${0.34 + i * 0.07}s both` }}>
                    <span style={{ color: '#991b1b', fontWeight: 700, flexShrink: 0, fontSize: 12 }}>✗</span>
                    <span style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.6 }}>{item}</span>
                  </div>
                ))}
              </div>
            ), 0.36)}

          </div>
        )}
      </div>
    );
  }

  // ─── Tab: Plan ─────────────────────────────────────────────────
  function renderPlan() {
    const filled = PLAN_FIELDS.filter(f => outline[f.key].trim()).length;
    const evaluated = planFeedback ? PLAN_FIELDS.filter(f => planFeedback[f.key]?.status).length : 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {/* Progress strip */}
        <div style={{ padding: '12px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: '#fafafa' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {PLAN_FIELDS.map((f) => {
              const fb = planFeedback?.[f.key];
              const color = fb ? (SCORE_STYLES[fb.status]?.color || f.color) : (outline[f.key] ? f.color : '#d5d5d5');
              return <div key={f.key} title={f.label} style={{ width: 10, height: 10, borderRadius: '50%', background: color, transition: 'background 0.3s', cursor: 'default' }} />;
            })}
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            {evaluated > 0 ? `${evaluated}/5 evaluated` : filled > 0 ? `${filled}/5 filled` : 'Fill in your outline below'}
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PLAN_FIELDS.map((f, fi) => {
            const fb = planFeedback?.[f.key];
            const tipOpen = expandedTip === f.key;
            return (
              <div key={f.key} style={{
                borderRadius: 8, overflow: 'hidden',
                border: `1px solid ${fb ? f.border : 'var(--border)'}`,
                borderLeft: `4px solid ${f.border}`,
                background: '#fff',
                animation: `eg-fadeUp 0.2s ease ${fi * 0.05}s both`,
                transition: 'border-color 0.25s',
              }}>
                {/* Card header */}
                <div style={{ padding: '10px 14px', background: outline[f.key] ? `${f.bg}55` : '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: f.color }}>{f.label}</span>
                    <button onClick={() => setExpandedTip(tipOpen ? null : f.key)}
                      style={{ fontSize: 10, color: tipOpen ? f.color : 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px' }}>
                      {tipOpen ? '▾ tip' : '▸ tip'}
                    </button>
                  </div>
                  {fb && <ScoreBadge status={fb.status} />}
                </div>

                {/* Tip */}
                {tipOpen && (
                  <div style={{ padding: '8px 14px', fontSize: 11, color: f.color, lineHeight: 1.6, background: `${f.bg}55`, borderBottom: '1px solid var(--border)', animation: 'eg-feedbackIn 0.18s ease both' }}>
                    {f.tip}
                  </div>
                )}

                {/* Textarea */}
                <textarea value={outline[f.key]}
                  onChange={e => { setOutline(o => ({ ...o, [f.key]: e.target.value })); if (planFeedback) setPlanFeedback(fb2 => ({ ...fb2, [f.key]: null })); }}
                  placeholder={f.placeholder} rows={3}
                  style={{ width: '100%', fontSize: 12, padding: '10px 14px', boxSizing: 'border-box', border: 'none', resize: 'vertical', lineHeight: 1.55, fontFamily: 'var(--font-body)', outline: 'none', background: 'transparent' }}
                />

                {/* Phrase chips */}
                <div style={{ padding: '6px 14px 10px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {f.phrases.map((p, pi) => (
                    <Chip key={p} label={p} copied={copiedChip === `${f.key}-${pi}`} onClick={() => copyChip(p, `${f.key}-${pi}`)} />
                  ))}
                </div>

                {/* Feedback */}
                {fb?.feedback && (
                  <div style={{ padding: '9px 14px', background: `${f.bg}55`, borderTop: '1px solid var(--border)', fontSize: 11, color: f.color, lineHeight: 1.55, animation: 'eg-feedbackIn 0.22s ease both' }}>
                    {renderMarkdown(fb.feedback)}
                  </div>
                )}
              </div>
            );
          })}

          {evalError && <div style={{ fontSize: 11, color: '#991b1b', padding: '8px 12px', background: '#fdecea', borderRadius: 6 }}>{evalError}</div>}

          <button onClick={handleEvaluate} disabled={evaluating} style={btn(true, evaluating)}>
            {evaluating ? <><LoadingDots /> Evaluating</> : 'Evaluate outline'}
          </button>

          {planFeedback && !evaluating && (
            <div style={{ fontSize: 11, color: '#166534', textAlign: 'center', padding: '7px', background: '#eaf6ea', borderRadius: 6, animation: 'eg-scaleIn 0.2s ease both' }}>
              Feedback applied — see each section above.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Tab: Review ───────────────────────────────────────────────
  function renderReview() {
    return (
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: mode selector + custom input */}
        <div style={{ width: 200, borderRight: '1px solid var(--border)', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Focus</div>
          {REVIEW_MODES.map(m => {
            const active  = reviewMode === m.key;
            const loading = reviewing && reviewMode === m.key;
            return (
              <button key={m.key} onClick={() => handleReview(m.key)} disabled={reviewing}
                style={{
                  padding: '10px 12px', borderRadius: 7, cursor: 'pointer',
                  fontFamily: 'var(--font-body)', textAlign: 'left',
                  border: active ? '1.5px solid var(--rust)' : '1px solid var(--border)',
                  background: active ? '#fff8f6' : '#fafafa',
                  opacity: reviewing && !loading ? 0.45 : 1,
                  transition: 'border-color 0.15s, background 0.15s',
                }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: active ? 'var(--rust)' : 'var(--ink)' }}>
                  {loading ? <LoadingDots /> : m.label}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{m.desc}</div>
              </button>
            );
          })}

          <div style={{ marginTop: 8, flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ask something</div>
            <textarea value={reviewInput} onChange={e => setReviewInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && reviewInput.trim()) { e.preventDefault(); handleReview('custom', reviewInput.trim()); setReviewInput(''); } }}
              placeholder="Specific question… (Enter to send)"
              rows={3} disabled={reviewing}
              style={{ fontSize: 11, padding: '8px 9px', border: '1px solid var(--border)', borderRadius: 5, resize: 'none', lineHeight: 1.5, fontFamily: 'var(--font-body)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
            <button onClick={() => { if (reviewInput.trim()) { handleReview('custom', reviewInput.trim()); setReviewInput(''); } }}
              disabled={reviewing || !reviewInput.trim()}
              style={{ ...btn(true, false), opacity: reviewing || !reviewInput.trim() ? 0.45 : 1, fontSize: 11, padding: '7px 0' }}>
              Ask
            </button>
          </div>
        </div>

        {/* Right: result */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {!reviewResult && !reviewing && (
            <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', marginTop: 60, lineHeight: 1.8 }}>
              Select a focus area on the left<br />to get structured feedback.
            </div>
          )}
          {reviewing && (
            <div style={{ padding: '8px 0' }}>
              <ShimmerBlock lines={5} />
            </div>
          )}
          {reviewResult && !reviewing && (
            <div key={reviewKey}>
              {reviewResult.type === 'analyze'  && <AnalyzeResult  data={reviewResult.data} />}
              {reviewResult.type === 'thesis'   && <ThesisResult   data={reviewResult.data} />}
              {reviewResult.type === 'evidence' && <EvidenceResult data={reviewResult.data} />}
              {reviewResult.type === 'rubric'   && <RubricResult   data={reviewResult.data} />}
              {reviewResult.type === 'custom'   && (
                <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.7, animation: 'eg-fadeUp 0.25s ease both' }}>
                  {renderMarkdown(reviewResult.data?.text)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Tab: Workshop ─────────────────────────────────────────────
  function renderWorkshop() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {[{ key:'thesis',label:'Thesis' },{ key:'evidence',label:'Evidence' },{ key:'counter',label:'Counter' }].map(m => (
            <button key={m.key} onClick={() => switchWorkshop(m.key)}
              style={{ flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', color: workshopMode === m.key ? 'var(--rust)' : 'var(--muted)', borderBottom: workshopMode === m.key ? '2px solid var(--rust)' : '2px solid transparent', marginBottom: -1, fontFamily: 'var(--font-body)', transition: 'color 0.15s' }}>
              {m.label}
            </button>
          ))}
        </div>
        <div key={workshopKey} style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', animation: 'eg-fadeUp 0.2s ease both' }}>
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
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          Write a thesis, score it, adjust, and compare attempts. See what makes one stronger than another.
        </p>
        <textarea value={thesisDraft} onChange={e => setThesisDraft(e.target.value)} placeholder="Write a thesis statement for this question…" rows={3}
          style={{ width: '100%', fontSize: 13, padding: '11px 13px', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: 7, resize: 'vertical', lineHeight: 1.55, fontFamily: 'var(--font-body)', outline: 'none' }} />
        <button onClick={handleScoreThesis} disabled={scoringThesis || !thesisDraft.trim()} style={{ ...btn(true, scoringThesis), opacity: !thesisDraft.trim() ? 0.45 : 1 }}>
          {scoringThesis ? <><LoadingDots /> Scoring</> : 'Score this thesis'}
        </button>

        {thesisAttempts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Attempts</div>
            {thesisAttempts.map((a, i) => {
              const s = SCORE_STYLES[a.status] || SCORE_STYLES.weak;
              return (
                <div key={a.id} style={{
                  borderRadius: 8, padding: '12px 14px', background: s.bg,
                  borderTop: `3px solid ${s.color}`,
                  animation: `eg-slideRight 0.22s ease both, ${i === 0 ? `${s.flash} 0.1s ease 0.2s both` : 'none'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>#{thesisAttempts.length - i}</span>
                    <ScoreBadge status={a.status} />
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.55, marginBottom: 7 }}>{a.thesis}</div>
                  <div style={{ fontSize: 11, color: s.color, lineHeight: 1.5 }}>{renderMarkdown(a.feedback)}</div>
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
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          Write down everything you remember about this topic — events, people, dates, laws. Don't filter yourself.
        </p>
        <textarea value={evidenceDraft} onChange={e => setEvidenceDraft(e.target.value)}
          placeholder="Brain-dump everything you know… e.g. Sherman Antitrust Act, Carnegie Steel, Pullman Strike 1894, laissez-faire policy…"
          rows={5}
          style={{ width: '100%', fontSize: 13, padding: '11px 13px', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: 7, resize: 'vertical', lineHeight: 1.55, fontFamily: 'var(--font-body)', outline: 'none' }} />
        <button onClick={handleOrganizeEvidence} disabled={organizing || !evidenceDraft.trim()} style={{ ...btn(true, organizing), opacity: !evidenceDraft.trim() ? 0.45 : 1 }}>
          {organizing ? <><LoadingDots /> Organizing</> : 'Organize my evidence'}
        </button>

        {organizing && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[1,2,3].map(i => <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}><ShimmerBlock lines={3} /></div>)}
          </div>
        )}

        {evidenceResult && !evidenceResult.error && (
          <div key={evidenceKey} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
            {(evidenceResult.categories || []).map((cat, ci) => (
              <div key={cat.name} style={{ animation: `eg-categoryIn 0.22s ease ${ci * 0.09}s both` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>{cat.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {(cat.items || []).map((item, ii) => {
                    const s = SCORE_STYLES[item.strength] || SCORE_STYLES.ok;
                    return (
                      <div key={ii} style={{ padding: '7px 10px', borderRadius: 6, background: s.bg, borderLeft: `3px solid ${s.color}`, animation: `eg-fadeUp 0.18s ease ${ci * 0.09 + ii * 0.05}s both` }}>
                        <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.4 }}>{item.text}</div>
                        <div style={{ fontSize: 10, color: s.color, marginTop: 2 }}>{renderInline(item.note)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        {evidenceResult?.error && <div style={{ fontSize: 11, color: '#991b1b', padding: '8px 12px', background: '#fdecea', borderRadius: 6 }}>Could not organize evidence. Try again.</div>}
      </div>
    );
  }

  function renderCounterWorkshop() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          Enter your thesis. The guide challenges it with historically grounded counterarguments — write and score a rebuttal for each.
        </p>
        <textarea value={counterThesis} onChange={e => { setCounterThesis(e.target.value); setCounters([]); setRebuttals({}); setRebuttalFeedback({}); }}
          placeholder="Your thesis statement…" rows={3}
          style={{ width: '100%', fontSize: 13, padding: '11px 13px', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: 7, resize: 'vertical', lineHeight: 1.55, fontFamily: 'var(--font-body)', outline: 'none' }} />
        <button onClick={handleGenerateCounters} disabled={generatingCounter || !counterThesis.trim()} style={{ ...btn(true, generatingCounter), opacity: !counterThesis.trim() ? 0.45 : 1 }}>
          {generatingCounter ? <><LoadingDots /> Generating</> : 'Generate counterarguments'}
        </button>

        {counters.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {counters.map((counter, i) => {
              const rf = rebuttalFeedback[i];
              const rfStyle = rf ? (SCORE_STYLES[rf.status] || SCORE_STYLES.weak) : null;
              return (
                <div key={i} style={{ borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', animation: `eg-counterIn 0.25s ease ${i * 0.14}s both` }}>
                  {/* Counter header */}
                  <div style={{ padding: '12px 15px', background: '#fff8f6', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'var(--rust)', borderRadius: 20, padding: '3px 8px', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.65 }}>{counter}</span>
                  </div>
                  {/* Rebuttal input */}
                  <div style={{ padding: '12px 15px', background: rfStyle ? rfStyle.bg : '#fff', transition: 'background 0.3s' }}>
                    <textarea value={rebuttals[i] || ''} onChange={e => setRebuttals(p => ({ ...p, [i]: e.target.value }))}
                      placeholder="Write your rebuttal…" rows={2}
                      style={{
                        width: '100%', fontSize: 12, padding: '8px 10px', boxSizing: 'border-box',
                        borderTop: `1px solid ${rfStyle ? rfStyle.color : 'var(--border)'}`,
                        borderRight: `1px solid ${rfStyle ? rfStyle.color : 'var(--border)'}`,
                        borderBottom: `1px solid ${rfStyle ? rfStyle.color : 'var(--border)'}`,
                        borderLeft: `3px solid ${rfStyle ? rfStyle.color : 'var(--border)'}`,
                        borderRadius: 5, resize: 'vertical', lineHeight: 1.5,
                        fontFamily: 'var(--font-body)', outline: 'none', background: 'transparent',
                        transition: 'border-color 0.2s',
                      }} />
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 9 }}>
                      <button onClick={() => handleEvalRebuttal(i)} disabled={evalingRebuttal[i] || !(rebuttals[i]||'').trim()}
                        style={{ fontSize: 11, fontWeight: 600, padding: '5px 13px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--cream)', color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--font-body)', opacity: !(rebuttals[i]||'').trim() ? 0.45 : 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                        {evalingRebuttal[i] ? <><LoadingDots /> Evaluating</> : 'Evaluate rebuttal'}
                      </button>
                      {rf && <ScoreBadge status={rf.status} />}
                    </div>
                    {rf?.feedback && (
                      <div style={{ marginTop: 8, fontSize: 11, color: rfStyle.color, lineHeight: 1.55, padding: '7px 10px', background: rfStyle.bg, borderRadius: 5, animation: 'eg-feedbackIn 0.2s ease both' }}>
                        {renderMarkdown(rf.feedback)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────────────
  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none', transition: 'opacity 0.28s ease' }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 201,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: visible ? 'auto' : 'none',
      }}>
        <div style={{
          width: 'min(94vw, 1020px)', height: 'min(90vh, 740px)',
          background: '#fff', borderRadius: 12,
          boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'var(--font-body)', overflow: 'hidden',
          opacity: visible ? 1 : 0,
          animation: visible ? 'eg-modalIn 0.28s cubic-bezier(0.16,1,0.3,1) both' : 'none',
        }}>
          {/* Header */}
          <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Essay Guide</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>History essay workshop</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', lineHeight: 1, padding: 6, borderRadius: 5, transition: 'color 0.15s' }}>✕</button>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => switchTab(t.key)}
                style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', color: tab === t.key ? 'var(--rust)' : 'var(--muted)', borderBottom: tab === t.key ? '2px solid var(--rust)' : '2px solid transparent', marginBottom: -1, fontFamily: 'var(--font-body)', transition: 'color 0.15s' }}>
                {t.label}
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
      </div>
    </>
  );
}
