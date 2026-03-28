import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const steps = [
  { n: '01', t: 'Build a unit', d: 'Choose your topic, era, and learning objectives.' },
  { n: '02', t: 'Add your personas', d: 'Select historical figures tied to that unit.' },
  { n: '03', t: 'Students explore', d: 'Conversations, notes, and quizzes in one place.' },
  { n: '04', t: 'Review insights', d: 'Per-student AI analytics land in your dashboard.' },
];

const htimeline = [
  {
    year: '44 BC', event: "Caesar's Fall", note: 'Ask Brutus what he told himself',
    persona: { initial: 'C', name: 'Gaius Julius Caesar', era: 'ROMAN REPUBLIC · 44 BC · DICTATOR PERPETUO' },
    messages: [
      { from: 'student', text: 'Why did you cross the Rubicon? Did you not know what it would mean?' },
      { from: 'persona', text: 'I knew precisely what it meant. The Senate had stripped me of my command and they demanded my head. I chose Rome over the law, because Rome was the law.' },
      { from: 'student', text: 'Were you afraid?' },
      { from: 'persona', text: 'Fear is for men with something left to lose. I had already wagered everything.' },
    ]
  },
  {
    year: '1215', event: 'Magna Carta', note: 'Debate limits with a baron',
    persona: { initial: 'W', name: 'William Marshal, 1st Earl', era: 'ENGLAND · 1215 · BARON & KNIGHT' },
    messages: [
      { from: 'student', text: 'Why did the barons force King John to sign this document?' },
      { from: 'persona', text: 'Because a king who breaks his own laws is no king at all. We did not rebel against the crown — we reminded it of its obligations.' },
      { from: 'student', text: 'Do you think it will hold?' },
      { from: 'persona', text: 'That depends on whether those who come after us have the courage to enforce it. A charter is only as strong as the men willing to die for it.' },
    ]
  },
  {
    year: '1776', event: 'Independence', note: 'Hear Hamilton explain the stakes',
    persona: { initial: 'H', name: 'Alexander Hamilton', era: 'CONTINENTAL ARMY · 1776 · AIDE-DE-CAMP' },
    messages: [
      { from: 'student', text: 'Were you sure the colonies could actually win this war?' },
      { from: 'persona', text: 'Certainty is a luxury we could not afford. What I was sure of was this: the alternative — submission — was a far worse defeat than any battlefield could deliver.' },
      { from: 'student', text: 'What did independence mean to you personally?' },
      { from: 'persona', text: 'It meant that a man born with nothing — no name, no land, no inheritance — could build something permanent. America was the first argument in history that merit could outrank birth.' },
    ]
  },
  {
    year: '1865', event: 'Civil War Ends', note: 'Ask a freedman what freedom meant',
    persona: { initial: 'F', name: 'Frederick Douglass', era: 'UNITED STATES · 1865 · ABOLITIONIST' },
    messages: [
      { from: 'student', text: 'The war is over and slavery is abolished. Is this what you fought for?' },
      { from: 'persona', text: 'The law has changed. Whether the nation has changed — that remains to be seen. A proclamation frees a man on paper. It takes far longer to free a people in the minds of those who once owned them.' },
      { from: 'student', text: 'What do you fear most now?' },
      { from: 'persona', text: 'That we will call this finished when the work has barely begun. Freedom without land, without education, without the vote — that is not liberty. It is merely a different cage.' },
    ]
  },
  {
    year: '1969', event: 'Moon Landing', note: 'Ask Armstrong about the silence',
    persona: { initial: 'A', name: 'Neil Armstrong', era: 'NASA · 1969 · APOLLO 11 COMMANDER' },
    messages: [
      { from: 'student', text: 'What was it like the moment you stepped onto the surface?' },
      { from: 'persona', text: 'The silence was the first thing. Not peaceful — absolute. No wind, no sound of any kind. Just the hiss of the suit and the knowledge that everything alive in the universe, as far as I could see, was inside it.' },
      { from: 'student', text: 'Did it feel like victory — beating the Soviets?' },
      { from: 'persona', text: 'In the moment, no. You cannot stand on the Moon and think about politics. What I felt was something much older than nations. I was standing somewhere no human being had ever stood. That has nothing to do with a race.' },
    ]
  },
];

const quotes = [
  { text: "Those who cannot remember the past are condemned to repeat it.", source: "George Santayana — The Life of Reason, 1905" },
  { text: "History is written by the victors.", source: "Winston Churchill" },
  { text: "The more you know about the past, the better prepared you are for the future.", source: "Theodore Roosevelt" },
  { text: "Study the past if you would define the future.", source: "Confucius" }
];

const features = [
  { code: 'SYS-01', icon: '◈', title: 'AI-Powered Personas', body: 'Historical figures reconstructed from primary sources. Every response grounded in their documented words, decisions, and context.' },
  { code: 'SYS-02', icon: '⬡', title: 'Adaptive Dialogue Engine', body: 'Each conversation adapts to the student\'s depth of inquiry. The harder they push, the more the persona reveals.' },
  { code: 'SYS-03', icon: '◎', title: 'Teacher Command Center', body: 'Monitor every student session in real time. See engagement scores, conversation quality, and comprehension flags.' },
  { code: 'SYS-04', icon: '⬢', title: 'Standards-Aligned Units', body: 'Build units mapped to AP, IB, and state standards. Epoch fits your curriculum — not the other way around.' },
  { code: 'SYS-05', icon: '◇', title: 'Integrated Assessments', body: 'Auto-generated quizzes that pull directly from the conversations students just had. Assessment as a natural extension of learning.' },
  { code: 'SYS-06', icon: '⬟', title: 'Multilingual Support', body: 'Students can explore in their native language. Personas respond with cultural and linguistic nuance intact.' },
];

const stats = [
  { val: 5000, suffix: '+', label: 'Years of history covered' },
  { val: 200, suffix: '+', label: 'Historical personas' },
  { val: 98, suffix: '%', label: 'Teacher satisfaction rate' },
  { val: 3, suffix: 'x', label: 'Deeper engagement vs. textbooks' },
];

function useCounter(target, duration = 1800, started = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(ease * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, started]);
  return count;
}

function StatCounter({ val, suffix, label, started }) {
  const count = useCounter(val, 1800, started);
  return (
    <div className="stat-item">
      <div className="stat-val">{count}{suffix}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [activeEra, setActiveEra] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [showTyping, setShowTyping] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(true);
  const [statsStarted, setStatsStarted] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);

  const canvasRef = useRef(null);
  const heroRef = useRef(null);
  const statsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const userChangedEra = useRef(false);
  const animRef = useRef(null);

  // Animated star-field canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const stars = Array.from({ length: 130 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.1 + 0.2,
      vx: (Math.random() - 0.5) * 0.1, vy: (Math.random() - 0.5) * 0.1,
      alpha: Math.random() * 0.45 + 0.1,
    }));
    const sparks = Array.from({ length: 9 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      size: Math.random() * 7 + 3,
      alpha: Math.random() * 0.2 + 0.06,
      pulse: Math.random() * Math.PI * 2,
    }));

    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      stars.forEach(s => {
        s.x += s.vx; s.y += s.vy;
        if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
        if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(24,20,15,${s.alpha})`; ctx.fill();
      });
      sparks.forEach(s => {
        s.pulse += 0.016;
        const a = s.alpha * (0.55 + 0.45 * Math.sin(s.pulse));
        const sz = s.size * (0.82 + 0.18 * Math.sin(s.pulse));
        ctx.save(); ctx.translate(s.x, s.y);
        ctx.strokeStyle = `rgba(200,64,31,${a})`; ctx.lineWidth = 0.7;
        [[- sz, 0, sz, 0], [0, -sz, 0, sz], [-sz * .5, -sz * .5, sz * .5, sz * .5], [sz * .5, -sz * .5, -sz * .5, sz * .5]].forEach(([x1, y1, x2, y2]) => {
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        });
        ctx.restore();
      });
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setTimeout(() => setHeroLoaded(true), 80); }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); }),
      { threshold: 0.07 }
    );
    document.querySelectorAll('.rev').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!statsRef.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsStarted(true); }, { threshold: 0.3 });
    obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const ts = [];
    setVisibleMessages([]); setShowTyping(false);
    const msgs = htimeline[activeEra].messages;
    let delay = 300;
    msgs.forEach(msg => {
      if (msg.from === 'persona') {
        ts.push(setTimeout(() => setShowTyping(true), delay));
        delay += 900;
        ts.push(setTimeout(() => { setShowTyping(false); setVisibleMessages(p => [...p, msg]); }, delay));
      } else {
        ts.push(setTimeout(() => setVisibleMessages(p => [...p, msg]), delay));
      }
      delay += 600;
    });
    return () => ts.forEach(clearTimeout);
  }, [activeEra]);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteVisible(false);
      setTimeout(() => { setQuoteIndex(i => (i + 1) % quotes.length); setQuoteVisible(true); }, 500);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!userChangedEra.current || (visibleMessages.length === 0 && !showTyping)) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [visibleMessages, showTyping]);

  const hl = heroLoaded;

  return (
    <div style={{ fontFamily: 'sans-serif', background: 'var(--paper)', color: 'var(--ink)', minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap');

        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        :root{
          --paper:#F4EFE6;--paper2:#EDE6D8;--paper3:#E4DBC9;--paper4:#D6C9B0;
          --ink:#18140F;--ink70:rgba(24,20,15,.72);--ink50:rgba(24,20,15,.52);
          --ink30:rgba(24,20,15,.3);--ink10:rgba(24,20,15,.1);
          --red:#C8401F;--red-hi:#E04E28;--red-lo:rgba(200,64,31,.08);--red-mid:rgba(200,64,31,.2);
          --amber:#B87A0A;--teal:#1B6358;
          --border:rgba(24,20,15,.1);--border-hi:rgba(24,20,15,.18);
          --mono:'IBM Plex Mono',monospace;--sans:'IBM Plex Sans',sans-serif;
          --serif:'DM Serif Display',serif;
        }
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:var(--paper2);}::-webkit-scrollbar-thumb{background:var(--red);}

        /* NAV */
        .nav{position:fixed;top:0;left:0;right:0;z-index:200;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 52px;height:54px;border-bottom:1px solid transparent;transition:border-color .35s,background .35s;}
        .nav.scrolled{background:rgba(244,239,230,.96);border-bottom:1px solid var(--border-hi);backdrop-filter:blur(14px);}
        .nav-logo{font-family:var(--mono);font-size:14px;font-weight:600;letter-spacing:.1em;color:var(--ink);justify-self:start;display:flex;align-items:center;gap:3px;}
        .nl-b{color:var(--red);font-weight:300;font-size:18px;line-height:1;}
        .nl-dot{width:5px;height:5px;background:var(--red);border-radius:50%;margin:0 2px;animation:blink 2.2s ease-in-out infinite;}
        .nav-center{display:flex;gap:44px;align-items:center;justify-self:center;}
        .nav-link{font-family:var(--mono);font-size:10px;font-weight:400;letter-spacing:.16em;text-transform:uppercase;color:var(--ink50);background:none;border:none;cursor:pointer;transition:color .2s;padding:0;}
        .nav-link:hover{color:var(--red);}
        .nav-right{display:flex;gap:22px;align-items:center;justify-self:end;}
        .nav-signin{font-family:var(--mono);font-size:10px;font-weight:400;letter-spacing:.14em;text-transform:uppercase;color:var(--ink50);background:none;border:none;cursor:pointer;transition:color .2s;padding:0;}
        .nav-signin:hover{color:var(--ink);}
        .nav-cta{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;padding:8px 20px;background:var(--red);color:#fff;border:none;cursor:pointer;transition:all .2s;border-radius:1px;position:relative;overflow:hidden;}
        .nav-cta::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);transform:translateX(-100%);transition:transform .4s;}
        .nav-cta:hover::after{transform:translateX(100%);}
        .nav-cta:hover{background:var(--red-hi);transform:translateY(-1px);}

        /* HERO */
        .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:120px 24px 100px;position:relative;overflow:hidden;}
        .hero-canvas{position:absolute;inset:0;z-index:0;opacity:.65;}
        .hero-scanlines{position:absolute;inset:0;z-index:1;pointer-events:none;background-image:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(24,20,15,.02) 2px,rgba(24,20,15,.02) 3px);}
        .hero-vignette{position:absolute;inset:0;z-index:2;background:radial-gradient(ellipse 68% 58% at 50% 48%,transparent 28%,rgba(244,239,230,.7) 100%);}
        .hero-horizon{position:absolute;bottom:0;left:0;right:0;z-index:2;height:160px;background:linear-gradient(to top,var(--paper),transparent);}

        /* cinematic frame lines */
        .h-line{position:absolute;z-index:2;background:var(--red);opacity:.1;}
        .h-line-h{height:1px;left:0;right:0;}
        .h-line-v{width:1px;top:0;bottom:0;}

        /* corner brackets */
        .hc{position:absolute;z-index:3;width:38px;height:38px;border-color:var(--red);border-style:solid;opacity:.32;}
        .hc-tl{top:76px;left:40px;border-width:1px 0 0 1px;}
        .hc-tr{top:76px;right:40px;border-width:1px 1px 0 0;}
        .hc-bl{bottom:36px;left:40px;border-width:0 0 1px 1px;}
        .hc-br{bottom:36px;right:40px;border-width:0 1px 1px 0;}

        .hero-inner{position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;max-width:880px;}

        .h-badge{font-family:var(--mono);font-size:9px;font-weight:500;letter-spacing:.3em;text-transform:uppercase;color:var(--red);margin-bottom:28px;display:flex;align-items:center;gap:16px;opacity:0;transform:translateY(14px);transition:opacity .7s .12s,transform .7s .12s;}
        .h-badge.in{opacity:1;transform:translateY(0);}
        .h-badge::before,.h-badge::after{content:'';width:44px;height:1px;background:currentColor;opacity:.5;}

        .h-title{font-family:var(--serif);font-size:clamp(68px,11vw,150px);font-weight:400;line-height:.88;letter-spacing:-.01em;color:var(--ink);margin-bottom:10px;opacity:0;transform:translateY(22px);transition:opacity 1s .28s,transform 1s .28s cubic-bezier(.16,1,.3,1);}
        .h-title.in{opacity:1;transform:translateY(0);}
        .h-title-red{color:var(--red);display:block;font-style:italic;}

        .h-sub-label{font-family:var(--mono);font-size:clamp(10px,1.1vw,12px);font-weight:400;letter-spacing:.22em;text-transform:uppercase;color:var(--ink50);margin-bottom:26px;opacity:0;transition:opacity .8s .52s;}
        .h-sub-label.in{opacity:1;}

        .h-sub{font-family:var(--sans);font-size:clamp(14px,1.7vw,17px);font-weight:300;line-height:1.84;color:var(--ink70);max-width:520px;margin:0 auto 44px;opacity:0;transform:translateY(12px);transition:opacity .8s .58s,transform .8s .58s;}
        .h-sub.in{opacity:1;transform:translateY(0);}

        .h-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;opacity:0;transform:translateY(12px);transition:opacity .8s .7s,transform .8s .7s;}
        .h-actions.in{opacity:1;transform:translateY(0);}

        .scroll-ind{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);z-index:10;display:flex;flex-direction:column;align-items:center;gap:8px;opacity:0;transition:opacity 1s 1.35s;font-family:var(--mono);font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink30);}
        .scroll-ind.in{opacity:1;}
        .s-line{width:1px;height:38px;background:linear-gradient(to bottom,var(--red),transparent);animation:sdrop 2s ease-in-out infinite;}
        @keyframes sdrop{0%{transform:scaleY(0);transform-origin:top}50%{transform:scaleY(1);transform-origin:top}50.01%{transform:scaleY(1);transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}

        /* TICKER */
        .ticker{border-top:1px solid var(--border-hi);border-bottom:1px solid var(--border-hi);background:var(--ink);padding:11px 0;display:flex;overflow:hidden;}
        .ticker-track{display:flex;gap:64px;animation:tick 24s linear infinite;white-space:nowrap;}
        @keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .t-item{display:flex;align-items:center;gap:10px;flex-shrink:0;font-family:var(--mono);font-size:9px;color:rgba(244,239,230,.32);letter-spacing:.14em;text-transform:uppercase;}
        .t-dot{width:4px;height:4px;border-radius:50%;background:var(--red);animation:blink 2.4s ease-in-out infinite;}
        .t-val{color:rgba(244,239,230,.72);font-weight:500;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.12}}

        /* BUTTONS */
        .btn-red{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:15px 42px;background:var(--red);color:#fff;border:none;cursor:pointer;transition:all .22s;white-space:nowrap;border-radius:1px;position:relative;overflow:hidden;}
        .btn-red::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);transform:translateX(-100%);transition:transform .45s;}
        .btn-red:hover::after{transform:translateX(100%);}
        .btn-red:hover{background:var(--red-hi);transform:translateY(-2px);box-shadow:0 8px 30px rgba(200,64,31,.26);}
        .btn-outline{font-family:var(--mono);font-size:11px;font-weight:400;letter-spacing:.14em;text-transform:uppercase;padding:15px 42px;background:transparent;color:var(--ink70);border:1px solid var(--border-hi);cursor:pointer;transition:all .22s;white-space:nowrap;border-radius:1px;}
        .btn-outline:hover{border-color:var(--red);color:var(--red);}
        .btn-outline-light{font-family:var(--mono);font-size:11px;font-weight:400;letter-spacing:.14em;text-transform:uppercase;padding:15px 42px;background:transparent;color:rgba(244,239,230,.7);border:1px solid rgba(244,239,230,.2);cursor:pointer;transition:all .22s;white-space:nowrap;border-radius:1px;}
        .btn-outline-light:hover{border-color:rgba(244,239,230,.5);color:#F4EFE6;}

        /* QUOTE */
        .quote-wrap{background:var(--ink);padding:90px 72px 86px;text-align:center;position:relative;overflow:hidden;}
        .q-scan{position:absolute;inset:0;background-image:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,.014) 2px,rgba(255,255,255,.014) 3px);}
        .q-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px);background-size:64px 64px;mask-image:radial-gradient(ellipse 70% 60% at 50% 50%,black,transparent);}
        .q-corner{position:absolute;width:26px;height:26px;border-color:var(--red);border-style:solid;opacity:.38;}
        .q-tl{top:22px;left:22px;border-width:1px 0 0 1px;}.q-tr{top:22px;right:22px;border-width:1px 1px 0 0;}
        .q-bl{bottom:22px;left:22px;border-width:0 0 1px 1px;}.q-br{bottom:22px;right:22px;border-width:0 1px 1px 0;}
        .q-text{font-family:var(--serif);font-style:italic;font-size:clamp(26px,3.5vw,46px);color:#F4EFE6;line-height:1.42;max-width:760px;margin:0 auto 22px;position:relative;z-index:1;transition:opacity .5s,transform .5s;}
        .q-text.fade-out{opacity:0;transform:translateY(10px);}.q-text.fade-in{opacity:1;transform:translateY(0);}
        .q-source{font-family:var(--mono);font-size:10px;font-weight:400;letter-spacing:.22em;text-transform:uppercase;color:var(--red);transition:opacity .5s;position:relative;z-index:1;}
        .q-source.fade-out{opacity:0;}.q-source.fade-in{opacity:1;}

        /* SECTION PRIMITIVES */
        .sec{padding:100px 72px;max-width:1320px;margin:0 auto;}
        .s-tag{font-family:var(--mono);font-size:9px;font-weight:500;letter-spacing:.26em;text-transform:uppercase;color:var(--red);margin-bottom:18px;display:flex;align-items:center;gap:12px;}
        .s-tag::before{content:'//';color:var(--ink30);}
        .s-title{font-family:var(--serif);font-size:clamp(42px,5.5vw,70px);font-weight:400;line-height:1.04;color:var(--ink);}
        .s-title em{font-style:italic;color:var(--red);}
        .s-body{font-family:var(--sans);font-size:15px;font-weight:300;line-height:1.88;color:var(--ink70);max-width:420px;margin-top:16px;}

        /* STEPS */
        .step{display:flex;align-items:flex-start;gap:22px;padding:16px 0;border-bottom:1px solid var(--border);}
        .step-n{font-family:var(--mono);font-size:10px;font-weight:500;color:var(--red);min-width:28px;flex-shrink:0;padding-top:3px;}
        .step-title{font-family:var(--sans);font-size:14px;font-weight:600;color:var(--ink);margin-bottom:3px;}
        .step-desc{font-family:var(--sans);font-size:13px;font-weight:300;color:var(--ink30);line-height:1.66;}

        /* PERSONA */
        .pd{background:#fff;border:1px solid var(--border-hi);overflow:hidden;margin-bottom:26px;box-shadow:5px 5px 0 var(--paper3);transition:box-shadow .2s;}
        .pd:hover{box-shadow:8px 8px 0 var(--paper4);}
        .pd-header{padding:10px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--paper2);}
        .pd-title{font-family:var(--mono);font-size:9px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--ink50);}
        .pd-live{display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:9px;color:var(--teal);letter-spacing:.1em;text-transform:uppercase;}
        .live-dot{width:5px;height:5px;border-radius:50%;background:var(--teal);animation:pulse 2s ease-in-out infinite;}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.6)}}
        .pd-who{display:flex;align-items:center;gap:12px;padding:16px 18px 0;}
        .pd-avatar{width:40px;height:40px;border-radius:2px;background:var(--red-lo);border:1px solid var(--red-mid);display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:18px;font-style:italic;color:var(--red);flex-shrink:0;}
        .pd-name{font-family:var(--sans);font-size:14px;font-weight:600;color:var(--ink);}
        .pd-era{font-family:var(--mono);font-size:9px;color:var(--ink30);letter-spacing:.1em;margin-top:3px;text-transform:uppercase;}
        .pd-messages{padding:14px 18px 18px;display:flex;flex-direction:column;gap:9px;min-height:160px;overflow-y:auto;max-height:260px;}
        .bw-s{display:flex;justify-content:flex-end;}.bw-p{display:flex;justify-content:flex-start;}
        .bubble{padding:10px 14px;font-family:var(--sans);font-size:13px;font-weight:300;line-height:1.7;max-width:84%;border-radius:1px;}
        .b-s{background:var(--red-lo);border:1px solid var(--red-mid);color:var(--ink70);}
        .b-p{background:var(--paper2);border:1px solid var(--border);border-left:2px solid var(--red);color:var(--ink70);}
        .msg-in{animation:mIn .32s cubic-bezier(.16,1,.3,1) both;}
        @keyframes mIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .typing{display:flex;align-items:center;gap:5px;padding:11px 14px;background:var(--paper2);border:1px solid var(--border);border-left:2px solid var(--red);width:fit-content;animation:mIn .22s ease both;}
        .td{width:5px;height:5px;border-radius:50%;background:var(--red);opacity:.4;animation:tb 1.2s ease-in-out infinite;}
        .td:nth-child(2){animation-delay:.2s;}.td:nth-child(3){animation-delay:.4s;}
        @keyframes tb{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}

        /* TIMELINE */
        .ht{position:relative;padding-top:22px;}
        .ht-track{position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(to right,var(--red),rgba(200,64,31,.05));}
        .ht-items{display:grid;grid-template-columns:repeat(5,1fr);}
        .ht-item{padding:16px 10px 0;position:relative;cursor:pointer;transition:background .18s;border-right:1px solid var(--border);}
        .ht-item:last-child{border-right:none;}
        .ht-item:hover{background:var(--red-lo);}
        .ht-dot{position:absolute;top:-30px;left:10px;width:8px;height:8px;background:var(--paper);border:1px solid rgba(200,64,31,.28);transition:all .22s;transform:rotate(45deg);}
        .ht-item:hover .ht-dot{background:var(--red);border-color:var(--red);box-shadow:0 0 12px rgba(200,64,31,.4);}
        .ht-year{font-family:var(--mono);font-size:10px;font-weight:500;margin-bottom:5px;transition:color .18s;}
        .ht-event{font-family:var(--sans);font-size:12px;font-weight:600;margin-bottom:4px;line-height:1.2;transition:color .18s;}
        .ht-note{font-family:var(--sans);font-size:11px;font-weight:300;line-height:1.55;font-style:italic;transition:color .18s;}

        /* FEATURES GRID */
        .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border-hi);border:1px solid var(--border-hi);margin-top:56px;}
        .feat-card{background:var(--paper);padding:36px 30px;position:relative;overflow:hidden;transition:background .2s;}
        .feat-card:hover{background:#fff;}
        .feat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--red);transform:scaleX(0);transform-origin:left;transition:transform .3s;}
        .feat-card:hover::before{transform:scaleX(1);}
        .feat-code{font-family:var(--mono);font-size:9px;font-weight:500;letter-spacing:.18em;color:var(--ink30);margin-bottom:20px;text-transform:uppercase;}
        .feat-icon{font-size:22px;color:var(--red);margin-bottom:16px;display:block;line-height:1;}
        .feat-title{font-family:var(--sans);font-size:15px;font-weight:600;color:var(--ink);margin-bottom:10px;}
        .feat-body{font-family:var(--sans);font-size:13px;font-weight:300;line-height:1.72;color:var(--ink50);}

        /* STATS */
        .stats-sec{background:var(--ink);padding:80px 72px;position:relative;overflow:hidden;}
        .st-scan{position:absolute;inset:0;background-image:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,.016) 2px,rgba(255,255,255,.016) 3px);}
        .st-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.028) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.028) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse 80% 100% at 50% 50%,black,transparent);}
        .st-inner{position:relative;z-index:1;max-width:1320px;margin:0 auto;text-align:center;}
        .st-tag{font-family:var(--mono);font-size:9px;font-weight:500;letter-spacing:.28em;text-transform:uppercase;color:var(--red);margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:12px;}
        .st-tag::before,.st-tag::after{content:'';width:30px;height:1px;background:var(--red);opacity:.4;}
        .st-title{font-family:var(--serif);font-size:clamp(36px,4vw,54px);font-weight:400;color:#F4EFE6;margin-bottom:64px;}
        .st-title em{font-style:italic;color:var(--red);}
        .st-row{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(244,239,230,.07);}
        .stat-item{padding:40px 24px;background:rgba(24,20,15,.55);text-align:center;position:relative;overflow:hidden;}
        .stat-item::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(200,64,31,.055),transparent);}
        .stat-val{font-family:var(--serif);font-size:clamp(48px,5vw,72px);font-weight:400;color:#F4EFE6;line-height:1;margin-bottom:12px;font-style:italic;}
        .stat-label{font-family:var(--mono);font-size:10px;font-weight:400;letter-spacing:.18em;text-transform:uppercase;color:rgba(244,239,230,.38);}

        /* TRANSMISSION */
        .tx-sec{background:var(--paper2);border-top:1px solid var(--border-hi);border-bottom:1px solid var(--border-hi);padding:100px 72px;position:relative;overflow:hidden;}
        .tx-grid-bg{position:absolute;inset:0;background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(ellipse 90% 80% at 50% 50%,black 40%,transparent 100%);}
        .tx-inner{position:relative;z-index:1;max-width:1320px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;}
        .tx-terminal{background:var(--ink);border:1px solid var(--border-hi);overflow:hidden;box-shadow:8px 8px 0 var(--paper4);}
        .tx-bar{background:rgba(244,239,230,.04);border-bottom:1px solid rgba(244,239,230,.07);padding:10px 16px;display:flex;align-items:center;gap:8px;}
        .tx-dot{width:9px;height:9px;border-radius:50%;}
        .tx-bar-title{font-family:var(--mono);font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:rgba(244,239,230,.22);margin-left:6px;}
        .tx-body{padding:22px;font-family:var(--mono);font-size:12px;line-height:1.9;}
        .tx-ln{display:block;margin-bottom:1px;}
        .tx-ln.p::before{content:'> ';color:var(--red);}
        .tx-ln.out{color:rgba(244,239,230,.42);}
        .tx-ln.hi{color:#F4EFE6;}
        .tx-ln.dim{color:rgba(244,239,230,.18);}
        .tx-cursor{display:inline-block;width:8px;height:13px;background:var(--red);margin-left:2px;animation:cb 1.1s step-end infinite;vertical-align:middle;}
        @keyframes cb{0%,100%{opacity:1}50%{opacity:0}}

        /* CTA */
        .cta-wrap{padding:120px 72px;text-align:center;position:relative;overflow:hidden;border-top:1px solid var(--border-hi);}
        .cta-grid-bg{position:absolute;inset:0;background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:48px 48px;}
        .cta-vert{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:1px;height:55%;background:linear-gradient(to bottom,var(--red),transparent);opacity:.25;}
        .cta-rings{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:0;}
        .cta-ring{position:absolute;border-radius:50%;border:1px solid var(--red);opacity:.045;transform:translate(-50%,-50%);}
        .cta-bg-text{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:var(--serif);font-size:clamp(80px,16vw,200px);font-weight:400;color:rgba(24,20,15,.03);white-space:nowrap;pointer-events:none;user-select:none;}
        .cta-title{font-family:var(--serif);font-size:clamp(44px,6.5vw,82px);font-weight:400;color:var(--ink);margin-bottom:14px;position:relative;}
        .cta-title em{font-style:italic;color:var(--red);}
        .cta-sub{font-family:var(--sans);font-size:15px;font-weight:300;color:var(--ink70);margin-bottom:42px;position:relative;}
        .cta-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;position:relative;}

        /* FOOTER */
        .footer{padding:32px 72px;border-top:1px solid var(--border-hi);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:24px;background:var(--ink);}
        .footer-logo{font-family:var(--mono);font-size:13px;font-weight:600;letter-spacing:.12em;color:rgba(244,239,230,.22);}
        .footer-center{display:flex;gap:32px;justify-content:center;}
        .footer-link{font-family:var(--mono);font-size:9px;font-weight:400;letter-spacing:.18em;text-transform:uppercase;color:rgba(244,239,230,.18);background:none;border:none;cursor:pointer;transition:color .2s;padding:0;}
        .footer-link:hover{color:var(--red);}
        .footer-copy{font-family:var(--mono);font-size:10px;color:rgba(244,239,230,.14);text-align:right;letter-spacing:.04em;}

        /* REVEAL */
        @keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        .rev{opacity:0;transform:translateY(26px);transition:opacity .75s cubic-bezier(.16,1,.3,1),transform .75s cubic-bezier(.16,1,.3,1);}
        .rev.vis{opacity:1;transform:translateY(0);}
        .rev-d1{transition-delay:.1s;}.rev-d2{transition-delay:.2s;}.rev-d3{transition-delay:.3s;}.rev-d4{transition-delay:.4s;}.rev-d5{transition-delay:.5s;}.rev-d6{transition-delay:.6s;}

        @media(max-width:1100px){.feat-grid{grid-template-columns:repeat(2,1fr);}.st-row{grid-template-columns:repeat(2,1fr);}.tx-inner{grid-template-columns:1fr;}}
        @media(max-width:900px){.nav{padding:0 20px;}.nav-center{display:none;}.sec{padding:64px 24px;}.about-grid{grid-template-columns:1fr !important;}.ht-items{grid-template-columns:1fr 1fr;}.quote-wrap{padding:64px 24px 60px;}.cta-wrap{padding:80px 24px;}.feat-grid{grid-template-columns:1fr;}.stats-sec{padding:60px 24px;}.tx-sec{padding:64px 24px;}.footer{grid-template-columns:1fr;text-align:center;padding:28px 24px;}.footer-center{justify-content:center;}.footer-copy{text-align:center;}.hc{display:none;}}
      `}</style>

      {/* Nav */}
      <nav className={`nav${scrollY > 40 ? ' scrolled' : ''}`}>
        <div className="nav-logo">
          <span className="nl-b">[</span>EPOCH<span className="nl-dot" /><span className="nl-b">]</span>
        </div>
        <div className="nav-center">
          <button className="nav-link" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</button>
          <button className="nav-link" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>About</button>
          <button className="nav-link" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>How It Works</button>
        </div>
        <div className="nav-right">
          <button className="nav-signin" onClick={() => navigate('/login')}>Sign In</button>
          <button className="nav-cta" onClick={() => navigate('/register')}>Get Started</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero" ref={heroRef}>
        <canvas className="hero-canvas" ref={canvasRef} />
        <div className="hero-scanlines" />
        <div className="hero-vignette" />
        <div className="hero-horizon" />
        <div className="h-line h-line-h" style={{ top: '32%' }} />
        <div className="h-line h-line-h" style={{ top: '67%' }} />
        <div className="h-line h-line-v" style={{ left: '18%' }} />
        <div className="h-line h-line-v" style={{ right: '18%' }} />
        <div className="hc hc-tl" /><div className="hc hc-tr" />
        <div className="hc hc-bl" /><div className="hc hc-br" />

        <div className="hero-inner">
          <div className={`h-badge${hl ? ' in' : ''}`}>AI History Platform</div>
          <h1 className={`h-title${hl ? ' in' : ''}`}>
            Bring the past
            <span className="h-title-red">to life.</span>
          </h1>
          <br />
          <div className={`h-sub-label${hl ? ' in' : ''}`}>
            Epoch · Educational Intelligence System · Est. 2024
          </div>
          <p className={`h-sub${hl ? ' in' : ''}`}>
            Epoch is an AI education platform where students don't just read about history — they converse with it, question it, and understand it at a level textbooks never reach.
          </p>
          <div className={`h-actions${hl ? ' in' : ''}`}>
            <button className="btn-red" onClick={() => navigate('/register')}>Start Teaching Free</button>
            <button className="btn-outline" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Explore Features</button>
          </div>
        </div>
        <div className={`scroll-ind${hl ? ' in' : ''}`}>
          <div className="s-line" /><span>Scroll</span>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="ticker">
        <div className="ticker-track">
          {[...Array(2)].flatMap(() => [
            { l: 'System Status', v: 'Operational' },
            { l: 'Eras Loaded', v: '5,000+ years' },
            { l: 'Active Personas', v: 'Online' },
            { l: 'AI Engine', v: 'v2.4 · Active' },
            { l: 'Sessions', v: 'Live' },
            { l: 'Signal', v: 'Nominal' },
            { l: 'Temporal Range', v: '44 BC — Present' },
            { l: 'Classification', v: 'Educational Use' },
          ]).map((r, i) => (
            <div className="t-item" key={i}>
              <span className="t-dot" style={{ animationDelay: `${(i % 8) * .3}s` }} />
              {r.l}:&nbsp;<span className="t-val">{r.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── QUOTE ── */}
      <div className="quote-wrap">
        <div className="q-scan" /><div className="q-grid" />
        <div className="q-corner q-tl" /><div className="q-corner q-tr" />
        <div className="q-corner q-bl" /><div className="q-corner q-br" />
        <p className={`q-text ${quoteVisible ? 'fade-in' : 'fade-out'}`}>{quotes[quoteIndex].text}</p>
        <p className={`q-source ${quoteVisible ? 'fade-in' : 'fade-out'}`}>{quotes[quoteIndex].source}</p>
      </div>

      {/* ── ABOUT / HOW IT WORKS ── */}
      <section className="sec" id="about" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="about-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 88, alignItems: 'start' }}>
          <div className="rev">
            <div id="how" className="s-tag">Why Epoch</div>
            <h2 className="s-title">History is<br /><em>a conversation,</em><br />not a lecture.</h2>
            <p className="s-body" style={{ marginBottom: 12 }}>Textbooks flatten the past into facts and dates. Epoch turns it back into people, decisions, and consequences.</p>
            <p className="s-body">Every unit you build becomes a living environment — AI-powered personas respond from within their historical moment, and every student gets personalised feedback.</p>
            <div style={{ marginTop: 44 }}>
              {steps.map((step, i) => (
                <div key={i} className={`step rev rev-d${i + 1}`} style={{ borderTop: i === 0 ? '1px solid var(--border)' : 'none' }}>
                  <span className="step-n">{step.n}</span>
                  <div><div className="step-title">{step.t}</div><div className="step-desc">{step.d}</div></div>
                </div>
              ))}
            </div>
          </div>

          <div className="rev rev-d2">
            <div className="pd">
              <div className="pd-header">
                <span className="pd-title">Live Persona — {htimeline[activeEra].persona.name.split(' ')[0]}</span>
                <span className="pd-live"><span className="live-dot" /> Active Session</span>
              </div>
              <div className="pd-who">
                <div className="pd-avatar">{htimeline[activeEra].persona.initial}</div>
                <div>
                  <div className="pd-name">{htimeline[activeEra].persona.name}</div>
                  <div className="pd-era">{htimeline[activeEra].persona.era}</div>
                </div>
              </div>
              <div className="pd-messages">
                {visibleMessages.map((msg, i) => (
                  <div key={`${activeEra}-${i}`} className={msg.from === 'student' ? 'bw-s' : 'bw-p'}>
                    <div className={`bubble ${msg.from === 'student' ? 'b-s' : 'b-p'} msg-in`}>{msg.text}</div>
                  </div>
                ))}
                {showTyping && (
                  <div className="bw-p">
                    <div className="typing"><div className="td" /><div className="td" /><div className="td" /></div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div className="s-tag" style={{ marginBottom: 20 }}>Historical scope — click to explore</div>
            <div className="ht">
              <div className="ht-track" />
              <div className="ht-items">
                {htimeline.map((t, i) => (
                  <div key={i} className="ht-item" onClick={() => { userChangedEra.current = true; setActiveEra(i); }}>
                    <div className="ht-dot" style={activeEra === i ? { background: 'var(--red)', borderColor: 'var(--red)', boxShadow: '0 0 12px rgba(200,64,31,.4)' } : {}} />
                    <div className="ht-year" style={{ color: activeEra === i ? 'var(--red)' : 'rgba(24,20,15,.28)' }}>{t.year}</div>
                    <div className="ht-event" style={{ color: activeEra === i ? 'var(--ink)' : 'rgba(24,20,15,.26)' }}>{t.event}</div>
                    <div className="ht-note" style={{ color: activeEra === i ? 'var(--ink70)' : 'rgba(24,20,15,.16)' }}>{t.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="sec" id="features" style={{ paddingTop: 0 }}>
        <div className="rev">
          <div className="s-tag">System Capabilities</div>
          <h2 className="s-title">Built for the<br /><em>classroom of tomorrow.</em></h2>
        </div>
        <div className="feat-grid">
          {features.map((f, i) => (
            <div className={`feat-card rev rev-d${(i % 3) + 1}`} key={i}>
              <div className="feat-code">{f.code}</div>
              <span className="feat-icon">{f.icon}</span>
              <div className="feat-title">{f.title}</div>
              <div className="feat-body">{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="stats-sec" ref={statsRef}>
        <div className="st-scan" /><div className="st-grid" />
        <div className="st-inner">
          <div className="st-tag rev">By the numbers</div>
          <h2 className="st-title rev rev-d1">Epoch in <em>operation.</em></h2>
          <div className="st-row">
            {stats.map((s, i) => <StatCounter key={i} {...s} started={statsStarted} />)}
          </div>
        </div>
      </section>

      {/* ── TRANSMISSION ── */}
      <section className="tx-sec">
        <div className="tx-grid-bg" />
        <div className="tx-inner">
          <div className="rev">
            <div className="s-tag">Transmission Log</div>
            <h2 className="s-title">Every dialogue<br /><em>leaves a trace.</em></h2>
            <p className="s-body" style={{ marginBottom: 16 }}>Epoch doesn't just power conversations — it records, analyzes, and surfaces the moments where learning actually happened.</p>
            <p className="s-body">Your dashboard receives a full breakdown after every session: comprehension signals, engagement patterns, and the exact exchanges that moved the needle.</p>
            <div style={{ marginTop: 36 }}>
              <button className="btn-red" onClick={() => navigate('/register')}>Start Teaching Free</button>
            </div>
          </div>
          <div className="rev rev-d2">
            <div className="tx-terminal">
              <div className="tx-bar">
                <div className="tx-dot" style={{ background: '#ff5f57' }} />
                <div className="tx-dot" style={{ background: '#febc2e' }} />
                <div className="tx-dot" style={{ background: '#28c840' }} />
                <span className="tx-bar-title">EPOCH · SESSION LOG · UNIT 04</span>
              </div>
              <div className="tx-body">
                <span className="tx-ln dim">EPOCH ANALYTICS ENGINE v2.4</span>
                <span className="tx-ln dim">SESSION ID: E-1776-HAM-029</span>
                <span className="tx-ln dim">————————————————————————</span>
                <span className="tx-ln">&nbsp;</span>
                <span className="tx-ln p" style={{ color: 'rgba(244,239,230,.55)' }}>Loading persona: Alexander Hamilton</span>
                <span className="tx-ln out">  era: CONTINENTAL ARMY · 1776</span>
                <span className="tx-ln out">  status: Ready</span>
                <span className="tx-ln">&nbsp;</span>
                <span className="tx-ln p" style={{ color: 'rgba(244,239,230,.55)' }}>Session complete. Generating report...</span>
                <span className="tx-ln">&nbsp;</span>
                <span className="tx-ln hi">  Engagement score:    94 / 100</span>
                <span className="tx-ln hi">  Comprehension flags: 0</span>
                <span className="tx-ln hi">  Critical questions:  3 detected</span>
                <span className="tx-ln hi">  Key insight moment:  Exchange 4</span>
                <span className="tx-ln">&nbsp;</span>
                <span className="tx-ln out">  "merit could outrank birth"</span>
                <span className="tx-ln out">   ↳ student dwelled 42s — flag: deep engagement</span>
                <span className="tx-ln">&nbsp;</span>
                <span className="tx-ln dim">Dispatch sent to teacher dashboard.</span>
                <span className="tx-ln dim">————————————————————————</span>
                <span className="tx-ln">&nbsp;</span>
                <span className="tx-ln p" style={{ color: 'rgba(244,239,230,.55)' }}>Awaiting next session<span className="tx-cursor" /></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-wrap">
        <div className="cta-grid-bg" />
        <div className="cta-rings">
          {[260, 400, 540, 680].map(s => <div key={s} className="cta-ring" style={{ width: s, height: s }} />)}
        </div>
        <div className="cta-vert" />
        <div className="cta-bg-text">EPOCH</div>
        <h2 className="cta-title rev">Ready to teach <em>differently?</em></h2>
        <p className="cta-sub rev rev-d1">Join educators bringing history to life with Epoch. Free to start, no credit card required.</p>
        <div className="cta-actions rev rev-d2">
          <button className="btn-red" style={{ padding: '17px 54px', fontSize: 12 }} onClick={() => navigate('/register')}>Create Your Classroom</button>
          <button className="btn-outline" style={{ padding: '17px 54px', fontSize: 12 }} onClick={() => navigate('/login')}>Sign In</button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-logo">EPOCH</div>
        <div className="footer-center">
          <button className="footer-link" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</button>
          <button className="footer-link" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>About</button>
          <button className="footer-link" onClick={() => navigate('/login')}>Sign In</button>
        </div>
        <div className="footer-copy">&copy; {new Date().getFullYear()} EPOCH. Built for educators.</div>
      </footer>
    </div>
  );
}