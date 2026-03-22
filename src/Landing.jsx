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
  {
    text: "Those who cannot remember the past are condemned to repeat it.",
    source: "George Santayana — The Life of Reason, 1905"
  },
  {
    text: "History is written by the victors.",
    source: "Winston Churchill"
  },
  {
    text: "The more you know about the past, the better prepared you are for the future.",
    source: "Theodore Roosevelt"
  },
  {
    text: "Study the past if you would define the future.",
    source: "Confucius"
  }
];

export default function Landing() {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const [activeEra, setActiveEra] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [showTyping, setShowTyping] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  // FIX 1: drive quote fade via state instead of IntersectionObserver
  const [quoteVisible, setQuoteVisible] = useState(true);
  const heroRef = useRef(null);
  const animRef = useRef(null);
  const messagesEndRef = useRef(null);
  const userChangedEra = useRef(false); // ← add this


  useEffect(() => {
    const onMouse = e => setMousePos({ x: e.clientX, y: e.clientY });
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('scroll', onScroll);
    return () => { window.removeEventListener('mousemove', onMouse); window.removeEventListener('scroll', onScroll); };
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); }),
      { threshold: 0.08 }
    );
    document.querySelectorAll('.rev').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Animate chat messages in sequence when era changes
  useEffect(() => {
    const timeouts = [];
    setVisibleMessages([]);
    setShowTyping(false);

    const messages = htimeline[activeEra].messages;
    let delay = 300;

    messages.forEach((msg) => {
      if (msg.from === 'persona') {
        timeouts.push(setTimeout(() => setShowTyping(true), delay));
        delay += 900;
        timeouts.push(setTimeout(() => {
          setShowTyping(false);
          setVisibleMessages(prev => [...prev, msg]);
        }, delay));
      } else {
        timeouts.push(setTimeout(() => {
          setVisibleMessages(prev => [...prev, msg]);
        }, delay));
      }
      delay += 600;
    });

    return () => timeouts.forEach(clearTimeout);
  }, [activeEra]);

  // FIX 1: Rotate quotes with fade-out -> swap -> fade-in
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteVisible(false);
      setTimeout(() => {
        setQuoteIndex((i) => (i + 1) % quotes.length);
        setQuoteVisible(true);
      }, 500); // matches CSS transition duration
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  // FIX 2: Only auto-scroll when there are actual messages to show
useEffect(() => {
  if (!userChangedEra.current) return;
  if (visibleMessages.length === 0 && !showTyping) return;
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}, [visibleMessages, showTyping]);

  const px = (mousePos.x / (window.innerWidth || 1) - 0.5) * 20;
  const py = (mousePos.y / (window.innerHeight || 1) - 0.5) * 20;

  return (
    <div style={{ fontFamily: 'serif', background: '#080705', color: '#ede8df', minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600;1,700&family=Outfit:wght@200;300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        :root{
          --gold:#c8a96e;--bg:#080705;--bg2:#0e0b08;
          --cream:#ede8df;--cream60:rgba(237,232,223,0.9);
          --cream30:rgba(237,232,223,0.7);--cream10:rgba(237,232,223,0.25);
          --sepia:#a87d5a;--border:rgba(237,232,223,0.09);
        }
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:var(--bg);}
        ::-webkit-scrollbar-thumb{background:var(--gold);border-radius:2px;}

        .nav{position:fixed;top:0;left:0;right:0;z-index:200;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:22px 56px;border-bottom:1px solid transparent;transition:border-color .4s,background .4s;}
        .nav.scrolled{background:rgba(8,7,5,0.92);border-bottom-color:var(--border);backdrop-filter:blur(20px);}
        .nav-logo{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;letter-spacing:.04em;color:var(--cream);justify-self:start;}
        .nav-center{display:flex;gap:50px;align-items:center;justify-self:center;}
        .nav-link{font-family:'Outfit',sans-serif;font-size:11px;font-weight:400;letter-spacing:.16em;text-transform:uppercase;color:rgba(237,232,223,0.9);background:none;border:none;cursor:pointer;transition:color .25s;padding:0;}
        .nav-link:hover{color:var(--cream);}
        .nav-right{display:flex;gap:30px;align-items:center;justify-self:end;}
        .nav-signin{font-family:'Outfit',sans-serif;font-size:11px;font-weight:400;letter-spacing:.14em;text-transform:uppercase;color:rgba(237,232,223,0.95);background:none;border:none;cursor:pointer;transition:color .2s;padding:0;}
        .nav-signin:hover{color:var(--cream);}
        .nav-cta{font-family:'Outfit',sans-serif;font-size:11px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;padding:11px 28px;background:var(--gold);color:#080705;border:none;border-radius:1px;cursor:pointer;transition:all .2s;}
        .nav-cta:hover{background:#d9ba80;transform:translateY(-1px);}

        .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:124px 24px 84px;position:relative;overflow:hidden;}
        .orb{position:absolute;border-radius:50%;pointer-events:none;}
        .grain{position:absolute;inset:0;z-index:1;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");background-repeat:repeat;background-size:128px;opacity:.4;mix-blend-mode:overlay;}
        .hero-inner{position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;max-width:760px;}
        .hero-title{font-family:'Cormorant Garamond',serif;font-size:clamp(64px,10vw,140px);font-weight:300;line-height:.88;letter-spacing:-.02em;color:var(--cream);margin-bottom:28px;animation:fadeUp 1s cubic-bezier(.16,1,.3,1) .35s both;}
        .hero-title-bold{font-weight:700;}
        .hero-title-italic{font-style:italic;color:var(--gold);display:block;font-weight:300;}
        .hero-sub{font-family:'Outfit',sans-serif;font-size:clamp(14px,1.8vw,17px);font-weight:300;line-height:1.8;color:var(--cream60);max-width:520px;margin:0 auto 42px;animation:fadeUp .8s cubic-bezier(.16,1,.3,1) .55s both;}
        .hero-actions{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;animation:fadeUp .8s cubic-bezier(.16,1,.3,1) .65s both;}

        .btn-gold{font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;padding:17px 44px;background:var(--gold);color:#080705;border:none;border-radius:1px;cursor:pointer;transition:all .25s;white-space:nowrap;}
        .btn-gold:hover{background:#d9ba80;transform:translateY(-2px);box-shadow:0 12px 40px rgba(200,169,110,.35);}
        .btn-outline{font-family:'Outfit',sans-serif;font-size:12px;font-weight:400;letter-spacing:.14em;text-transform:uppercase;padding:17px 44px;background:transparent;color:var(--cream60);border:1px solid var(--border);border-radius:1px;cursor:pointer;transition:all .25s;white-space:nowrap;}
        .btn-outline:hover{border-color:rgba(237,232,223,.35);color:var(--cream);}

        .quote-wrap{border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:84px 72px 80px;text-align:center;position:relative;overflow:hidden;}
        .quote-ornament{font-family:'Cormorant Garamond',serif;font-size:168px;font-weight:700;line-height:.6;color:rgba(200,169,110,.06);position:absolute;top:26px;left:50%;transform:translateX(-50%);pointer-events:none;user-select:none;}
        .quote-text{font-family:'Cormorant Garamond',serif;font-size:clamp(26px,3.5vw,44px);font-style:italic;font-weight:300;color:var(--cream);line-height:1.45;max-width:760px;margin:0 auto 24px;position:relative;z-index:1;transition:opacity 0.5s ease,transform 0.5s ease;}
        .quote-text.fade-out{opacity:0;transform:translateY(8px);}
        .quote-text.fade-in{opacity:1;transform:translateY(0);}
        .quote-source{font-family:'Outfit',sans-serif;font-size:11px;font-weight:400;letter-spacing:.18em;text-transform:uppercase;color:var(--cream30);transition:opacity 0.5s ease;}
        .quote-source.fade-out{opacity:0;}
        .quote-source.fade-in{opacity:1;}

        .sec{padding:96px 72px;max-width:1280px;margin:0 auto;}
        .s-tag{font-family:'Outfit',sans-serif;font-size:10px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin-bottom:16px;display:flex;align-items:center;gap:12px;}
        .s-tag::before{content:'';width:28px;height:1px;background:var(--gold);flex-shrink:0;}
        .s-title{font-family:'Cormorant Garamond',serif;font-size:clamp(40px,5.5vw,68px);font-weight:300;line-height:1.05;letter-spacing:-.015em;color:var(--cream);}
        .s-title strong{font-weight:700;}.s-title em{font-style:italic;color:var(--gold);font-weight:300;}
        .s-body{font-family:'Outfit',sans-serif;font-size:15px;font-weight:300;line-height:1.82;color:var(--cream60);max-width:440px;margin-top:14px;}

        .step{display:flex;align-items:flex-start;gap:20px;padding:16px 0;border-bottom:1px solid var(--border);}
        .step-n{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;color:rgba(200,169,110,.35);line-height:1;min-width:36px;flex-shrink:0;padding-top:2px;}
        .step-title{font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:600;color:var(--cream);margin-bottom:4px;}
        .step-desc{font-family:'Outfit',sans-serif;font-size:13px;font-weight:300;color:var(--cream30);line-height:1.65;}

        .pd{background:var(--bg2);border:1px solid var(--border);border-radius:2px;overflow:hidden;margin-bottom:28px;}
        .pd-header{padding:13px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
        .pd-title{font-family:'Outfit',sans-serif;font-size:10px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--cream30);}
        .pd-live{display:flex;align-items:center;gap:6px;font-family:'Outfit',sans-serif;font-size:10px;color:#7fc47f;letter-spacing:.1em;}
        .live-dot{width:5px;height:5px;border-radius:50%;background:#7fc47f;animation:pulse 2s ease-in-out infinite;}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
        .pd-who{display:flex;align-items:center;gap:12px;padding:20px 20px 0;}
        .pd-avatar{width:40px;height:40px;border-radius:50%;background:rgba(200,169,110,.1);border:1px solid rgba(200,169,110,.25);display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:17px;color:var(--gold);font-style:italic;flex-shrink:0;}
        .pd-name{font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:600;color:var(--cream);}
        .pd-era{font-family:'Outfit',sans-serif;font-size:10px;color:var(--cream30);letter-spacing:.1em;margin-top:2px;}
        .pd-messages{padding:16px 20px 20px;display:flex;flex-direction:column;gap:10px;min-height:160px;overflow-y:auto;max-height:260px;}

        .bw-student{display:flex;justify-content:flex-end;}
        .bw-persona{display:flex;justify-content:flex-start;}
        .bubble{padding:11px 15px;border-radius:2px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:300;line-height:1.7;max-width:82%;}
        .bubble-student{background:rgba(200,169,110,.12);border:1px solid rgba(200,169,110,.2);color:var(--cream60);}
        .bubble-persona{background:rgba(237,232,223,.04);border:1px solid var(--border);border-left:2px solid var(--gold);color:var(--cream60);}

        .msg-enter{animation:msgIn .35s cubic-bezier(.16,1,.3,1) both;}
        @keyframes msgIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

        .typing-indicator{display:flex;align-items:center;gap:5px;padding:12px 15px;background:rgba(237,232,223,.04);border:1px solid var(--border);border-left:2px solid var(--gold);border-radius:2px;width:fit-content;animation:msgIn .25s ease both;}
        .typing-dot{width:5px;height:5px;border-radius:50%;background:var(--gold);opacity:0.4;animation:typingBounce 1.2s ease-in-out infinite;}
        .typing-dot:nth-child(2){animation-delay:.2s;}
        .typing-dot:nth-child(3){animation-delay:.4s;}
        @keyframes typingBounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}

        .ht{position:relative;padding-top:22px;}
        .ht-track{position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(to right,var(--gold),rgba(200,169,110,.1));}
        .ht-items{display:grid;grid-template-columns:repeat(5,1fr);}
        .ht-item{padding:16px 12px 0;position:relative;cursor:pointer;}
        .ht-dot{position:absolute;top:-32px;left:12px;width:7px;height:7px;border-radius:50%;background:var(--bg);border:1px solid rgba(200,169,110,.4);transition:all .25s;}
        .ht-item:hover .ht-dot{background:var(--gold);border-color:var(--gold);box-shadow:0 0 10px rgba(200,169,110,.5);}
        .ht-year{font-family:'Cormorant Garamond',serif;font-size:11px;font-style:italic;margin-bottom:5px;transition:color .2s;}
        .ht-event{font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:600;margin-bottom:5px;line-height:1.2;transition:color .2s;}
        .ht-note{font-family:'Outfit',sans-serif;font-size:11px;font-weight:300;line-height:1.55;font-style:italic;transition:color .2s;}

        .cta-wrap{padding:118px 72px;text-align:center;position:relative;overflow:hidden;border-top:1px solid var(--border);}
        .cta-bg-text{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Cormorant Garamond',serif;font-size:clamp(80px,16vw,200px);font-weight:700;color:rgba(200,169,110,.035);white-space:nowrap;pointer-events:none;letter-spacing:-.02em;user-select:none;}
        .cta-title{font-family:'Cormorant Garamond',serif;font-size:clamp(44px,6.5vw,80px);font-weight:300;color:var(--cream);margin-bottom:12px;position:relative;}
        .cta-title strong{font-weight:700;}.cta-title em{font-style:italic;color:var(--gold);}
        .cta-sub{font-family:'Outfit',sans-serif;font-size:15px;font-weight:300;color:var(--cream60);margin-bottom:40px;position:relative;}
        .cta-actions{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;position:relative;}

        .footer{padding:36px 72px;border-top:1px solid var(--border);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:24px;}
        .footer-logo{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:rgba(237,232,223,.3);}
        .footer-center{display:flex;gap:32px;justify-content:center;}
        .footer-link{font-family:'Outfit',sans-serif;font-size:10px;font-weight:400;letter-spacing:.14em;text-transform:uppercase;color:rgba(237,232,223,.2);background:none;border:none;cursor:pointer;transition:color .2s;padding:0;}
        .footer-link:hover{color:rgba(237,232,223,.5);}
        .footer-copy{font-family:'Outfit',sans-serif;font-size:11px;color:rgba(237,232,223,.18);text-align:right;letter-spacing:.04em;}

        @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        .rev{opacity:0;transform:translateY(32px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1);}
        .rev.vis{opacity:1;transform:translateY(0);}
        .rev-d1{transition-delay:.1s;}.rev-d2{transition-delay:.2s;}.rev-d3{transition-delay:.3s;}.rev-d4{transition-delay:.4s;}

        @media(max-width:900px){
          .nav{padding:18px 24px;}.nav-center{display:none;}
          .sec{padding:68px 24px;}
          .about-grid{grid-template-columns:1fr !important;}
          .ht-items{grid-template-columns:1fr 1fr;}
          .quote-wrap{padding:68px 24px 64px;}
          .quote-ornament{font-size:128px;top:20px;}
          .cta-wrap{padding:84px 24px;}
          .footer{grid-template-columns:1fr;text-align:center;padding:32px 24px;}
          .footer-center{justify-content:center;}.footer-copy{text-align:center;}
        }
      `}</style>

      {/* Nav */}
      <nav className={`nav${scrollY > 40 ? ' scrolled' : ''}`}>
        <div className="nav-logo">EPOCH</div>
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

      {/* Hero */}
      <section className="hero" ref={heroRef}>
        <div className="grain" />
        <div className="orb" style={{ width: 700, height: 700, top: '5%', left: '50%', transform: `translate(calc(-50% + ${px * 0.3}px), ${py * 0.3}px)`, background: 'radial-gradient(circle, rgba(200,169,110,0.07) 0%, transparent 65%)' }} />
        <div className="orb" style={{ width: 500, height: 500, bottom: '10%', left: '10%', transform: `translate(${px * -0.5}px, ${py * -0.2}px)`, background: 'radial-gradient(circle, rgba(168,125,90,0.06) 0%, transparent 60%)' }} />
        <div className="orb" style={{ width: 400, height: 400, top: '20%', right: '8%', transform: `translate(${px * 0.4}px, ${py * 0.4}px)`, background: 'radial-gradient(circle, rgba(200,169,110,0.05) 0%, transparent 60%)' }} />
        <div className="hero-inner">
          <h1 className="hero-title">
            <span className="hero-title-bold">Bring the past</span>
            <span className="hero-title-italic">to life.</span>
          </h1>
          <p className="hero-sub">Epoch is an AI education platform where students don't just read about history — they converse with it, question it, and understand it at a level textbooks never reach.</p>
          <div className="hero-actions">
            <button className="btn-gold" onClick={() => navigate('/register')}>Start Teaching Free</button>
            <button className="btn-outline" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Explore Features</button>
          </div>
        </div>
      </section>

      {/* Quote */}
      <div className="quote-wrap">
        <div className="quote-ornament">"</div>
        <p className={`quote-text ${quoteVisible ? 'fade-in' : 'fade-out'}`}>
          {quotes[quoteIndex].text}
        </p>
        <p className={`quote-source ${quoteVisible ? 'fade-in' : 'fade-out'}`}>
          {quotes[quoteIndex].source}
        </p>
      </div>

      {/* About */}
      <section className="sec" id="about" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="about-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>

          {/* Left */}
          <div className="rev">
            <div id="how" className="s-tag">Why Epoch</div>
            <h2 className="s-title">History is<br /><em>a conversation,</em><br /><strong>not a lecture.</strong></h2>
            <p className="s-body" style={{ marginBottom: 12 }}>Textbooks flatten the past into facts and dates. Epoch turns it back into people, decisions, and consequences.</p>
            <p className="s-body">Every unit you build becomes a living environment — AI-powered personas respond from within their historical moment, and every student gets personalised feedback.</p>
            <div style={{ marginTop: 40 }}>
              {steps.map((step, i) => (
                <div key={i} className={`step rev rev-d${i + 1}`} style={{ borderTop: i === 0 ? '1px solid var(--border)' : 'none' }}>
                  <span className="step-n">{step.n}</span>
                  <div>
                    <div className="step-title">{step.t}</div>
                    <div className="step-desc">{step.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — animated persona + timeline */}
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
                  <div key={`${activeEra}-${i}`} className={msg.from === 'student' ? 'bw-student' : 'bw-persona'}>
                    <div className={`bubble ${msg.from === 'student' ? 'bubble-student' : 'bubble-persona'} msg-enter`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {showTyping && (
                  <div className="bw-persona">
                    <div className="typing-indicator">
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Clickable timeline */}
            <div className="s-tag" style={{ marginBottom: 20 }}>Historical scope — click to explore</div>
            <div className="ht">
              <div className="ht-track" />
              <div className="ht-items">
                {htimeline.map((t, i) => (
                  <div key={i} className="ht-item" onClick={() => { userChangedEra.current = true; setActiveEra(i); }}
>
                    <div
                      className="ht-dot"
                      style={activeEra === i
                        ? { background: 'var(--gold)', borderColor: 'var(--gold)', boxShadow: '0 0 10px rgba(200,169,110,.5)' }
                        : {}}
                    />
                    <div className="ht-year" style={{ color: activeEra === i ? 'var(--gold)' : 'rgba(200,169,110,0.45)' }}>{t.year}</div>
                    <div className="ht-event" style={{ color: activeEra === i ? 'var(--cream)' : 'rgba(237,232,223,0.35)' }}>{t.event}</div>
                    <div className="ht-note" style={{ color: activeEra === i ? 'rgba(237,232,223,0.5)' : 'rgba(237,232,223,0.15)' }}>{t.note}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-wrap">
        <div className="cta-bg-text">EPOCH</div>
        <h2 className="cta-title rev"><strong>Ready to teach</strong><br /><em>differently?</em></h2>
        <p className="cta-sub rev rev-d1">Join educators bringing history to life with Epoch. Free to start, no credit card required.</p>
        <div className="cta-actions rev rev-d2">
          <button className="btn-gold" style={{ padding: '18px 56px', fontSize: 13 }} onClick={() => navigate('/register')}>Create Your Classroom</button>
          <button className="btn-outline" style={{ padding: '18px 56px', fontSize: 13 }} onClick={() => navigate('/login')}>Sign In</button>
        </div>
      </section>

      {/* Footer */}
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
