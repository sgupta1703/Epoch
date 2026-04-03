import { useLayoutEffect, useEffect, useState } from 'react';
import './TeacherOnboarding.css';

const STEPS = [
  {
    selector: '[data-onboarding="join-class"]',
    elevate:  '.db-panel',
    title: 'Join your first class',
    body: 'Enter the join code your teacher gave you and hit Join to get started.',
    placement: 'left',
  },
  {
    selector: '.sidebar-rail',
    elevate:  '.sidebar-shell',
    title: 'Your classes',
    body: 'Your classrooms appear here as icons. Click one to browse its units, notes, quizzes, and assignments.',
    placement: 'right',
  },
  {
    selector: '[data-onboarding="student-feed"]',
    elevate:  '.db-feed',
    title: 'Your work queue',
    body: 'Assignments and quizzes from all your classes show up here, sorted by urgency. Click any card to open it.',
    placement: 'bottom',
  },
  {
    selector: '[data-onboarding="profile-btn"]',
    elevate:  '.navbar',
    title: 'Profile & settings',
    body: 'Access your profile, adjust settings, or sign out from here.',
    placement: 'bottom-left',
  },
];

const PAD = 10;
const TOOLTIP_W = 290;
const TOOLTIP_GAP = 14;
const FADE_MS = 150;

export default function StudentOnboarding({ onDone }) {
  const [welcome, setWelcome] = useState(true);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [fading, setFading] = useState(false);

  useLayoutEffect(() => {
    if (welcome) return;
    function measure() {
      const el = document.querySelector(STEPS[step]?.selector ?? '');
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, welcome]);

  useEffect(() => {
    if (welcome) return;
    const { elevate } = STEPS[step] ?? {};
    if (!elevate) return;
    const el = document.querySelector(elevate);
    if (!el) return;
    const prevPosition = el.style.position;
    const prevZIndex   = el.style.zIndex;
    if (window.getComputedStyle(el).position === 'static') {
      el.style.position = 'relative';
    }
    el.style.zIndex = '9001';
    return () => {
      el.style.position = prevPosition;
      el.style.zIndex   = prevZIndex;
    };
  }, [step, welcome]);

  useEffect(() => {
    if (welcome) return;
    const { waitForEvent } = STEPS[step] ?? {};
    if (!waitForEvent) return;
    function onEvent() {
      setFading(true);
      setTimeout(() => { setStep(s => s + 1); setFading(false); }, FADE_MS);
    }
    window.addEventListener(waitForEvent, onEvent);
    return () => window.removeEventListener(waitForEvent, onEvent);
  }, [step, welcome]);

  useEffect(() => {
    document.body.classList.add('ob-active');
    return () => document.body.classList.remove('ob-active');
  }, []);

  function finish() {
    setFading(true);
    setTimeout(() => {
      localStorage.removeItem('epoch_student_onboarding');
      onDone?.();
    }, FADE_MS);
  }

  function startTour() {
    setFading(true);
    setTimeout(() => { setWelcome(false); setFading(false); }, FADE_MS);
  }

  function advance() {
    if (step >= STEPS.length - 1) { finish(); return; }
    setFading(true);
    setTimeout(() => { setStep(s => s + 1); setFading(false); }, FADE_MS);
  }

  const fadingClass = fading ? ' ob-fading' : '';

  if (welcome) {
    return (
      <>
        <div className={`ob-backdrop${fadingClass}`} />
        <div className={`ob-welcome${fadingClass}`}>
          <div className="ob-welcome-eyebrow">Getting started</div>
          <h2 className="ob-welcome-title">Welcome to Epoch</h2>
          <p className="ob-welcome-body">
            Let's take a quick look around — joining a class, finding your work,
            and navigating the sidebar. It only takes a moment.
          </p>
          <div className="ob-welcome-actions">
            <button className="ob-skip" onClick={finish}>Skip</button>
            <button className="ob-next ob-next--lg" onClick={startTour}>
              Start tour →
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!rect) return null;

  const current = STEPS[step];
  const wW = window.innerWidth;
  const wH = window.innerHeight;

  const hTop    = Math.max(0, rect.top - PAD);
  const hLeft   = Math.max(0, rect.left - PAD);
  const hRight  = Math.min(wW, rect.left + rect.width + PAD);
  const hBottom = Math.min(wH, rect.top + rect.height + PAD);

  let tooltipStyle;
  switch (current.placement) {
    case 'bottom':
      tooltipStyle = {
        top:  hBottom + TOOLTIP_GAP,
        left: Math.max(8, Math.min(hLeft, wW - TOOLTIP_W - 8)),
        width: TOOLTIP_W,
      };
      break;
    case 'right':
      tooltipStyle = {
        top:  hTop,
        left: Math.min(hRight + TOOLTIP_GAP, wW - TOOLTIP_W - 8),
        width: TOOLTIP_W,
      };
      break;
    case 'left':
      tooltipStyle = {
        top:  hTop,
        right: Math.max(8, wW - hLeft + TOOLTIP_GAP),
        width: TOOLTIP_W,
      };
      break;
    case 'top-left':
      tooltipStyle = {
        bottom: wH - hTop + TOOLTIP_GAP,
        right:  Math.max(8, wW - hRight),
        width:  TOOLTIP_W,
      };
      break;
    case 'bottom-left':
      tooltipStyle = {
        top:   hBottom + TOOLTIP_GAP,
        right: Math.max(8, wW - hRight),
        width: TOOLTIP_W,
      };
      break;
    default:
      tooltipStyle = { top: hBottom + TOOLTIP_GAP, left: hLeft, width: TOOLTIP_W };
  }

  return (
    <>
      <div className={`ob-backdrop${fadingClass}`} />
      <div
        className={`ob-tooltip${fadingClass}`}
        style={{ position: 'fixed', zIndex: 9002, ...tooltipStyle }}
      >
        <div className="ob-step-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`ob-dot${i === step ? ' ob-dot--active' : ''}`} />
          ))}
        </div>
        <h3 className="ob-title">{current.title}</h3>
        <p className="ob-body">{current.body}</p>
        <div className="ob-actions">
          <button className="ob-skip" onClick={finish}>Skip tour</button>
          {!current.waitForEvent && (
            <button className="ob-next" onClick={advance}>
              {step === STEPS.length - 1 ? 'Done' : 'Next →'}
            </button>
          )}
          {current.waitForEvent && (
            <span className="ob-waiting">Waiting for you to join one…</span>
          )}
        </div>
      </div>
    </>
  );
}
