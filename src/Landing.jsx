import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Brain, ChartBar, CheckCircle, ChevronRight,
  Clock, Compass, Crown, Drama, Eye, Feather, Globe,
  GraduationCap, Landmark, Layers, MessageCircle,
  Mic, NotebookPen, PencilLine, Scroll, Shield,
  Sparkles, Star, Swords, Trophy, Users, Zap,
  CircleCheckBig, CircleArrowRight, Circle,
  ChartColumnIncreasing, MessageSquareText, Flame, Map,
  Target, BookMarked, Medal, Telescope, Hourglass,
  Flashlight, Anchor, Compass as CompassIcon, FileText,
  BarChart2, TrendingUp, AlertCircle, Lightbulb
} from 'lucide-react';

const RUST = '#c0501f';
const RUST_D = '#8f3a14';
const PARCHMENT = '#f2e8d9';
const INK = '#1a1612';

// ── scattered icon cluster helper ──
function ScatterIcons({ icons, className = '' }) {
  return (
    <div className={`scatter-field ${className}`} aria-hidden="true">
      {icons.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={i}
            className="scatter-icon"
            style={{
              position: 'absolute',
              top: item.top,
              left: item.left,
              right: item.right,
              bottom: item.bottom,
              transform: `rotate(${item.rot || 0}deg)`,
              opacity: item.opacity || 0.06,
              color: item.color || 'currentColor',
              fontSize: 0,
            }}
          >
            <Icon size={item.size || 40} strokeWidth={1.2} />
          </div>
        );
      })}
    </div>
  );
}

const heroIcons = [
  { icon: Scroll, top: '12%', left: '3%', size: 72, rot: -18, opacity: 0.07 },
  { icon: Compass, top: '8%', right: '6%', size: 90, rot: 22, opacity: 0.065 },
  { icon: Crown, top: '60%', left: '2%', size: 55, rot: -8, opacity: 0.06 },
  { icon: Feather, bottom: '15%', left: '6%', size: 64, rot: 30, opacity: 0.07 },
  { icon: Shield, top: '30%', right: '4%', size: 60, rot: -14, opacity: 0.055 },
  { icon: Globe, bottom: '20%', right: '3%', size: 80, rot: 10, opacity: 0.065 },
  { icon: Star, top: '45%', left: '1%', size: 38, rot: 20, opacity: 0.08 },
  { icon: BookOpen, top: '75%', right: '8%', size: 50, rot: -22, opacity: 0.06 },
  { icon: Swords, top: '22%', left: '9%', size: 46, rot: 12, opacity: 0.055 },
  { icon: Landmark, bottom: '8%', left: '20%', size: 52, rot: -6, opacity: 0.06 },
  { icon: Trophy, top: '15%', right: '20%', size: 42, rot: 16, opacity: 0.055 },
  { icon: GraduationCap, bottom: '30%', right: '12%', size: 58, rot: -20, opacity: 0.065 },
];

const teacherIcons = [
  { icon: BarChart2, top: '5%', right: '2%', size: 80, rot: 15, opacity: 0.07 },
  { icon: Target, bottom: '10%', left: '1%', size: 60, rot: -10, opacity: 0.065 },
  { icon: TrendingUp, top: '40%', right: '0%', size: 50, rot: 8, opacity: 0.06 },
  { icon: Brain, top: '15%', left: '0%', size: 55, rot: -20, opacity: 0.065 },
  { icon: Lightbulb, bottom: '25%', right: '3%', size: 44, rot: 12, opacity: 0.07 },
];

const studentIcons = [
  { icon: PencilLine, top: '8%', left: '1%', size: 60, rot: -15, opacity: 0.07 },
  { icon: BookMarked, bottom: '12%', right: '2%', size: 70, rot: 18, opacity: 0.065 },
  { icon: Telescope, top: '50%', right: '1%', size: 52, rot: -8, opacity: 0.06 },
  { icon: Medal, top: '20%', left: '0%', size: 46, rot: 22, opacity: 0.065 },
  { icon: Zap, bottom: '35%', left: '2%', size: 42, rot: -12, opacity: 0.07 },
];

const curatorIcons = [
  { icon: Sparkles, top: '10%', right: '3%', size: 70, rot: 20, opacity: 0.08, color: '#f2e8d9' },
  { icon: MessageCircle, bottom: '15%', left: '2%', size: 65, rot: -14, opacity: 0.07, color: '#f2e8d9' },
  { icon: Layers, top: '45%', right: '1%', size: 55, rot: 8, opacity: 0.065, color: '#f2e8d9' },
  { icon: Brain, top: '20%', left: '1%', size: 50, rot: -22, opacity: 0.07, color: '#f2e8d9' },
  { icon: Zap, bottom: '30%', right: '5%', size: 44, rot: 16, opacity: 0.08, color: '#f2e8d9' },
];

export default function EpochLanding() {
  const navigate = useNavigate();
  const [visMsg, setVisMsg] = useState([]);
  const [typing, setTyping] = useState(false);
  const [demoInput, setDemoInput] = useState('');
  const [demoReady, setDemoReady] = useState(false);
  const [demoReplying, setDemoReplying] = useState(false);
  const [studentComposing, setStudentComposing] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const chatRef = useRef(null);
  const chatStarted = useRef(false);
  const timers = useRef([]);
  const bodyRef = useRef(null);

  const convoMessages = [
    { from: 'student', text: 'How did you keep the Continental Army together when supplies were so low?' },
    { from: 'persona', text: 'By reminding the men that hardship was not the exception, but the price of liberty. Discipline, patience, and example mattered as much as muskets.' },
    { from: 'student', text: 'Did you think the colonies could actually win?' },
    { from: 'persona', text: 'I believed endurance would decide more than any single battle. If we could remain in the field, the cause of independence would remain alive.' },
  ];

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); }),
      { threshold: 0.07 }
    );
    document.querySelectorAll('.rev').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!chatRef.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !chatStarted.current) {
        chatStarted.current = true;
        setChatVisible(true);
        let delay = 300;
        const ts = [];
        convoMessages.forEach(msg => {
          if (msg.from === 'persona') {
            ts.push(setTimeout(() => setTyping(true), delay));
            delay += 900;
            ts.push(setTimeout(() => { setTyping(false); setVisMsg(p => [...p, msg]); }, delay));
          } else {
            ts.push(setTimeout(() => { setStudentComposing(true); setDemoInput(''); }, delay));
            const start = delay + 100;
            msg.text.split('').forEach((_, i) =>
              ts.push(setTimeout(() => setDemoInput(msg.text.slice(0, i + 1)), start + i * 20))
            );
            delay = start + msg.text.length * 20;
            ts.push(setTimeout(() => { setVisMsg(p => [...p, msg]); setDemoInput(''); setStudentComposing(false); }, delay + 340));
          }
          delay += 500;
        });
        ts.push(setTimeout(() => setDemoReady(true), delay + 200));
        timers.current = ts;
      }
    }, { threshold: 0.3 });
    obs.observe(chatRef.current);
    return () => { obs.disconnect(); timers.current.forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [visMsg, typing]);


  function handleSend(e) {
    e?.preventDefault?.();
    const txt = demoInput.trim();
    if (!txt || !demoReady || typing || studentComposing || demoReplying) return;
    const next = [...visMsg, { from: 'student', text: txt }];
    setVisMsg(next);
    setDemoInput('');
    setDemoReplying(true);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setVisMsg(c => [...c, { from: 'persona', text: 'The path of liberty was never easy — but every sacrifice made the cause more worthy of the cost.' }]);
      setDemoReplying(false);
    }, 1800);
  }

  const teacherMockup = {
    stats: [{ l: 'Students', v: '24', tone: '' }, { l: 'Quiz avg', v: '76%', tone: 'good' }, { l: 'Assign avg', v: '68%', tone: 'warn' }],
    summary: "Strong recall of major figures, but many students struggle to evaluate source reliability and cite evidence effectively.",
    strengths: ["Cause-and-effect around Caesar's rise is consistently strong.", "Most students connect major players to correct events."],
    weaknesses: ["Source analysis responses summarize rather than evaluate.", "Chronological reasoning drops on longer assignments."],
    recs: ["Reteach sourcing with a primary-source warm-up.", "Run a short timeline check before the unit essay."],
  };

  const sessionTasks = [
    { Icon: CircleCheckBig, cls: 'done', title: 'Primary Source Reading', sub: 'Completed · 8 min' },
    { Icon: CircleCheckBig, cls: 'done', title: 'Conversation with Caesar', sub: '4 exchanges · Saved' },
    { Icon: CircleArrowRight, cls: 'active', title: 'Knowledge Check', sub: '5 questions · In progress' },
    { Icon: Circle, cls: 'pend', title: 'Personal Reflection', sub: 'Not started' },
  ];

  return (
    <div className="ep-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,700;1,400;1,600;1,700&family=Outfit:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --rust:#c0501f;--rust-d:#8f3a14;--rust-l:rgba(192,80,31,.1);--rust-xl:rgba(192,80,31,.06);
          --parch:#f2e8d9;--parch2:#e8dbc8;--parch3:#ddd0bb;
          --ink:#1a1612;--ink7:rgba(26,22,18,.88);--ink5:rgba(26,22,18,.68);--ink3:rgba(26,22,18,.45);--ink1:rgba(26,22,18,.08);
          --night:#110f0c;--night2:#1c1915;--night3:#252018;
          --serif:'Cormorant Garamond',Georgia,serif;
          --sans:'Outfit',system-ui,sans-serif;
        }
        .ep-root{font-family:var(--sans);background:var(--parch);color:var(--ink);min-height:100vh;overflow-x:hidden}

        /* NAV */
        .ep-nav{position:fixed;top:0;left:0;right:0;z-index:300;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 32px;background:var(--night);border-bottom:1px solid rgba(192,80,31,.35)}
        .ep-brand{font-family:var(--serif);font-size:26px;font-weight:700;color:var(--parch);letter-spacing:.01em}
        .ep-brand span{color:var(--rust)}
        .ep-nav-links{display:flex;gap:28px}
        .ep-nav-link{font-size:12px;font-weight:400;letter-spacing:.1em;text-transform:uppercase;color:rgba(242,232,217,.65);background:none;border:none;cursor:pointer;transition:color .2s}
        .ep-nav-link:hover{color:var(--parch)}
        .ep-nav-right{display:flex;gap:12px;align-items:center}
        .ep-nav-si{font-size:12px;color:rgba(242,232,217,.65);background:none;border:none;cursor:pointer;transition:color .2s;font-family:var(--sans)}
        .ep-nav-si:hover{color:var(--parch)}
        .ep-nav-cta{font-size:13px;font-weight:500;padding:9px 22px;background:var(--rust);color:#fff;border:none;cursor:pointer;border-radius:3px;font-family:var(--sans);transition:background .2s}
        .ep-nav-cta:hover{background:var(--rust-d)}

        /* SCATTER */
        .scatter-field{position:absolute;inset:0;pointer-events:none;overflow:hidden}
        .scatter-icon{line-height:0}

        /* HERO */
        .ep-hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:100px 24px 80px;background:var(--night);position:relative;overflow:hidden}
        .ep-hero-texture{position:absolute;inset:0;background-image:radial-gradient(circle at 20% 80%,rgba(192,80,31,.12) 0%,transparent 50%),radial-gradient(circle at 80% 20%,rgba(192,80,31,.1) 0%,transparent 45%),radial-gradient(circle at 50% 50%,rgba(100,76,45,.08) 0%,transparent 60%);pointer-events:none}
        .ep-hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(242,232,217,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(242,232,217,.025) 1px,transparent 1px);background-size:60px 60px;pointer-events:none}
        .ep-hero-content{position:relative;z-index:2;max-width:900px}
        .ep-hero-eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:11px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--rust);margin-bottom:32px;padding:8px 18px;border:1px solid rgba(192,80,31,.3);border-radius:2px}
        .ep-hero-eyebrow-dot{width:5px;height:5px;border-radius:50%;background:var(--rust)}
        .ep-hero-h1{font-family:var(--serif);font-size:clamp(64px,11vw,150px);font-weight:700;line-height:.88;color:var(--parch);margin-bottom:24px;letter-spacing:-.01em}
        .ep-hero-h1 em{font-style:italic;color:var(--rust);display:block}
        .ep-hero-rule{width:60px;height:2px;background:var(--rust);margin:0 auto 28px;opacity:.6}
        .ep-hero-sub{font-size:clamp(15px,1.8vw,18px);font-weight:400;line-height:1.8;color:rgba(242,232,217,.82);max-width:520px;margin:0 auto 44px}
        .ep-hero-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
        .ep-hero-scroll{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;color:rgba(242,232,217,.25);font-size:10px;letter-spacing:.2em;text-transform:uppercase;z-index:2}
        .ep-hero-scroll-bar{width:1px;height:36px;background:linear-gradient(to bottom,var(--rust),transparent);animation:scrollbar 2s ease-in-out infinite}
        @keyframes scrollbar{0%{transform:scaleY(0);transform-origin:top}50%{transform:scaleY(1);transform-origin:top}50.01%{transform:scaleY(1);transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}

        /* BTNs */
        .btn-rust{font-family:var(--sans);font-size:14px;font-weight:500;padding:16px 44px;background:var(--rust);color:#fff;border:none;cursor:pointer;border-radius:3px;transition:background .2s,transform .2s;white-space:nowrap}
        .btn-rust:hover{background:var(--rust-d);transform:translateY(-2px)}
        .btn-outline-light{font-family:var(--sans);font-size:14px;font-weight:400;padding:16px 44px;background:transparent;color:rgba(242,232,217,.55);border:1px solid rgba(242,232,217,.18);cursor:pointer;border-radius:3px;transition:border-color .2s,color .2s;white-space:nowrap}
        .btn-outline-light:hover{border-color:rgba(242,232,217,.4);color:var(--parch)}
        .btn-parch{font-family:var(--sans);font-size:14px;font-weight:500;padding:16px 44px;background:var(--parch);color:var(--ink);border:none;cursor:pointer;border-radius:3px;transition:background .2s,transform .2s}
        .btn-parch:hover{background:var(--parch2);transform:translateY(-2px)}
        .btn-outline-dark{font-family:var(--sans);font-size:14px;font-weight:400;padding:16px 44px;background:transparent;color:var(--ink5);border:1px solid rgba(26,22,18,.18);cursor:pointer;border-radius:3px;transition:border-color .2s,color .2s}
        .btn-outline-dark:hover{border-color:var(--rust);color:var(--rust)}

        /* SECTIONS COMMON */
        .sec-wrap{max-width:1180px;margin:0 auto;padding:0 40px}
        .sec-label{font-size:10px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:var(--rust);margin-bottom:12px;display:flex;align-items:center;gap:10px}
        .sec-label::before{content:'';display:block;width:20px;height:1px;background:var(--rust)}
        .sec-h{font-family:var(--serif);font-size:clamp(36px,5vw,62px);font-weight:700;line-height:1.06;color:var(--ink)}
        .sec-h em{font-style:italic;color:var(--rust)}
        .sec-p{font-size:15px;font-weight:400;line-height:1.8;color:var(--ink7);margin-top:14px}

        /* REVEAL */
        .rev{opacity:0;transform:translateY(28px);transition:opacity .75s cubic-bezier(.16,1,.3,1),transform .75s cubic-bezier(.16,1,.3,1)}
        .rev.vis{opacity:1;transform:translateY(0)}
        .rev-d1{transition-delay:.1s}.rev-d2{transition-delay:.2s}.rev-d3{transition-delay:.3s}.rev-d4{transition-delay:.45s}

        /* ── DEMO SECTION ── */
        .ep-demo{padding:120px 0;background:var(--parch);position:relative}
        .ep-demo-inner{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
        .ep-chat{background:#fff;border-radius:16px;overflow:hidden;border:1px solid var(--parch3);box-shadow:0 20px 60px rgba(26,22,18,.1);display:flex;flex-direction:column;transition:border-color .5s,box-shadow .5s}
        .ep-chat.live{border-color:rgba(192,80,31,.45);box-shadow:0 20px 60px rgba(26,22,18,.1),0 0 0 3px rgba(192,80,31,.08)}
        .ep-chat-top{padding:14px 18px;background:var(--night);display:flex;align-items:center;justify-content:space-between}
        .ep-chat-badge{display:flex;align-items:center;gap:7px;font-size:10px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:rgba(242,232,217,.5)}
        .ep-chat-live{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:600;color:#4ade80;letter-spacing:.1em}
        .ep-chat-dot{width:6px;height:6px;border-radius:50%;background:#4ade80;animation:pdot 2s ease-in-out infinite}
        @keyframes pdot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.2;transform:scale(.5)}}
        .ep-chat-ident{display:flex;align-items:center;gap:14px;padding:18px 18px 0}
        .ep-chat-av{width:48px;height:48px;border-radius:8px;background:var(--rust-xl);border:1px solid rgba(192,80,31,.25);display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:22px;font-style:italic;color:var(--rust);flex-shrink:0}
        .ep-chat-name{font-family:var(--serif);font-size:18px;font-weight:700;color:var(--ink)}
        .ep-chat-era{font-size:11px;color:var(--ink5);margin-top:3px}
        .ep-chat-body{padding:14px 18px 16px;height:260px;overflow-y:scroll;display:flex;flex-direction:column;gap:8px}
        .ep-chat-body::-webkit-scrollbar{width:3px}.ep-chat-body::-webkit-scrollbar-thumb{background:var(--rust);border-radius:2px}
        .bub{padding:10px 14px;font-size:13px;font-weight:400;line-height:1.65;max-width:84%;animation:fadeIn .22s ease both}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .bub-s{background:var(--rust-xl);border:1px solid rgba(192,80,31,.18);color:var(--ink7);border-radius:10px 10px 2px 10px;align-self:flex-end}
        .bub-p{background:var(--parch);border:1px solid var(--parch3);border-left:2px solid var(--rust);color:var(--ink7);border-radius:10px 10px 10px 2px}
        .typing{display:flex;align-items:center;gap:4px;padding:10px 14px;background:var(--parch);border:1px solid var(--parch3);border-left:2px solid var(--rust);border-radius:10px 10px 10px 2px;width:fit-content}
        .tdot{width:5px;height:5px;border-radius:50%;background:var(--rust);opacity:.4;animation:tdot 1.2s ease-in-out infinite}
        .tdot:nth-child(2){animation-delay:.2s}.tdot:nth-child(3){animation-delay:.4s}
        @keyframes tdot{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}
        .compose-wrap{display:flex;align-items:flex-end;gap:8px;align-self:flex-end;max-width:86%}
        .compose-send{width:30px;height:30px;border-radius:8px;background:var(--ink);color:var(--parch);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .2s}
        .compose-send.sending{background:var(--rust)}
        .caret{display:inline-block;width:1px;height:1.1em;background:currentColor;margin-left:2px;vertical-align:text-bottom;animation:blink 1s steps(1,end) infinite}
        @keyframes blink{0%,45%{opacity:1}45.01%,100%{opacity:0}}
        .ep-chat-foot{padding:0 18px 18px;flex-shrink:0}
        .ep-compose{display:flex;align-items:flex-end;gap:10px;padding:12px;background:#f5f5f5;border:1.8px solid var(--rust-d);border-radius:10px;transition:box-shadow .3s,opacity .2s}
        .ep-compose.animating{opacity:.75;pointer-events:none}
        .ep-compose.ready:focus-within{box-shadow:0 0 0 2px rgba(192,80,31,.25)}
        .ep-try-me{position:absolute;top:58%;right:-148px;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center;gap:10px;font-family:var(--serif);font-size:38px;font-style:italic;font-weight:700;color:var(--rust);opacity:0;transition:opacity .6s .3s;pointer-events:none;white-space:nowrap}
        .ep-try-me.vis{opacity:1;animation:tryme-breathe 3s ease-in-out infinite}
        @keyframes tryme-breathe{0%,100%{opacity:.55;transform:translateY(-50%) scale(1)}50%{opacity:1;transform:translateY(-50%) scale(1.06)}}
        .ep-try-me svg{color:var(--rust);opacity:.75;transform:rotate(135deg)}
        .ep-compose-field{flex:1;min-width:0}
        .ep-compose-label{font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--ink5);margin-bottom:5px}
        .ep-compose-input{width:100%;resize:none;border:none;outline:none;background:transparent;font-family:var(--sans);font-size:13px;font-weight:400;color:var(--ink);line-height:1.5;padding-top:1.5px}
        .ep-compose-input::placeholder{color:rgba(26,22,18,.35)}
        .ep-compose-btn{font-family:var(--sans);font-size:12px;font-weight:500;padding:10px 16px;background:var(--ink);color:var(--parch);border:none;border-radius:8px;cursor:pointer;transition:background .2s,opacity .2s;white-space:nowrap}
        .ep-compose-btn:hover:not(:disabled){background:var(--rust)}
        .ep-compose-btn:disabled{opacity:.35;cursor:default}
        .ep-compose-btn.busy{background:var(--rust)}

        /* ── FEATURES BAND ── */
        .ep-feats{background:var(--night);padding:80px 0}
        .ep-feats-inner{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(242,232,217,.06)}
        .ep-feat{padding:44px 36px;background:var(--night);display:flex;flex-direction:column;gap:16px;transition:background .25s}
        .ep-feat:hover{background:var(--night2)}
        .ep-feat-icon{width:48px;height:48px;border-radius:8px;background:var(--rust-xl);border:1px solid rgba(192,80,31,.3);display:flex;align-items:center;justify-content:center;color:var(--rust)}
        .ep-feat-title{font-family:var(--serif);font-size:22px;font-weight:700;color:var(--parch);line-height:1.2}
        .ep-feat-desc{font-size:13px;font-weight:400;line-height:1.75;color:rgba(242,232,217,.78)}

        /* ── TEACHER SECTION ── */
        .ep-teacher{padding:120px 0;background:var(--parch2);position:relative;overflow:hidden}
        .ep-teacher-inner{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start}
        .ep-teacher-bullets{margin-top:36px;display:flex;flex-direction:column;gap:22px}
        .ep-teacher-bullet{display:flex;gap:14px;padding:18px;border-radius:8px;background:rgba(255,255,255,.5);border:1px solid var(--parch3);transition:border-color .2s,transform .2s}
        .ep-teacher-bullet:hover{border-color:rgba(192,80,31,.3);transform:translateX(4px)}
        .ep-b-ico{width:36px;height:36px;border-radius:6px;background:var(--rust-xl);border:1px solid rgba(192,80,31,.2);display:flex;align-items:center;justify-content:center;color:var(--rust);flex-shrink:0}
        .ep-b-name{font-size:14px;font-weight:500;color:var(--ink);margin-bottom:4px}
        .ep-b-desc{font-size:13px;font-weight:400;line-height:1.65;color:var(--ink7)}

        /* Analysis card */
        .ep-analysis{background:#fff;border-radius:14px;border:1px solid var(--parch3);box-shadow:0 16px 48px rgba(26,22,18,.09);overflow:hidden}
        .ep-analysis-head{padding:14px 18px;background:var(--parch);border-bottom:1px solid var(--parch3);display:flex;align-items:center;justify-content:space-between}
        .ep-analysis-badge{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;padding:4px 10px;border-radius:99px;background:var(--rust-xl);color:var(--rust);border:1px solid rgba(192,80,31,.2)}
        .ep-analysis-body{padding:20px}
        .ep-an-eyebrow{font-size:10px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--rust);margin-bottom:6px}
        .ep-an-title{font-family:var(--serif);font-size:22px;font-weight:700;color:var(--ink);margin-bottom:6px;line-height:1.2}
        .ep-an-sub{font-size:13px;font-weight:400;color:var(--ink7);line-height:1.65;margin-bottom:16px}
        .ep-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}
        .ep-stat{padding:12px;border-radius:8px;background:var(--parch);border:1px solid var(--parch3)}
        .ep-stat-label{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--ink5);margin-bottom:6px}
        .ep-stat-val{font-family:var(--serif);font-size:26px;font-weight:700;color:var(--ink);line-height:1}
        .ep-stat-val.good{color:#166534}.ep-stat-val.warn{color:#9a3412}
        .ep-summary{padding:14px;border-radius:8px;background:var(--parch);border:1px solid var(--parch3);margin-bottom:14px}
        .ep-summary-label{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--ink5);margin-bottom:6px}
        .ep-summary-text{font-size:12px;font-weight:400;line-height:1.7;color:var(--ink7)}
        .ep-an-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
        .ep-an-card{border-radius:8px;background:#fff;border:1px solid var(--parch3);padding:14px;overflow:hidden}
        .ep-an-card.s{border-top:3px solid #22c55e}.ep-an-card.w{border-top:3px solid #f97316}.ep-an-card.r{border-top:3px solid var(--rust)}
        .ep-an-card-label{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px}
        .ep-an-card.s .ep-an-card-label{color:#166534}.ep-an-card.w .ep-an-card-label{color:#9a3412}.ep-an-card.r .ep-an-card-label{color:var(--rust)}
        .ep-an-list{list-style:none;display:flex;flex-direction:column;gap:7px}
        .ep-an-list li{font-size:12px;font-weight:400;line-height:1.6;color:var(--ink7);padding-left:12px;position:relative}
        .ep-an-list li::before{content:'';position:absolute;left:0;top:.55em;width:4px;height:4px;border-radius:50%}
        .ep-an-card.s .ep-an-list li::before{background:#22c55e}.ep-an-card.w .ep-an-list li::before{background:#f97316}.ep-an-card.r .ep-an-list li::before{background:var(--rust)}

        /* ── CURRICULUM SECTION ── */
        .ep-curric{padding:120px 0;background:var(--parch);position:relative;overflow:hidden}
        .ep-curric-inner{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
        .ep-cc{background:#fff;border-radius:14px;border:1px solid var(--parch3);box-shadow:0 16px 48px rgba(26,22,18,.09);overflow:hidden}
        .ep-cc-accent{height:6px;background:linear-gradient(90deg,#6b21a8,#a855f7)}
        .ep-cc-body{padding:22px}
        .ep-cc-title{font-family:var(--serif);font-size:24px;font-weight:700;color:var(--ink);margin-bottom:8px}
        .ep-cc-code-row{display:flex;align-items:center;gap:10px;margin-bottom:18px}
        .ep-cc-code-lbl{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--ink5)}
        .ep-cc-code{font-family:'Courier New',monospace;font-size:13px;letter-spacing:.14em;font-weight:700;color:var(--ink);background:var(--parch);border:1px solid var(--parch3);padding:4px 10px;border-radius:4px}
        .ep-cc-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--parch3);border-top:1px solid var(--parch3);border-bottom:1px solid var(--parch3)}
        .ep-cc-stat{padding:14px;background:var(--parch);display:flex;flex-direction:column;align-items:center;gap:3px}
        .ep-cc-stat-val{font-family:var(--serif);font-size:24px;font-weight:700;color:var(--ink);line-height:1}
        .ep-cc-stat-lbl{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--ink5)}
        .ep-cc-foot{display:flex;align-items:center;justify-content:space-between;padding:14px 22px 18px}
        .ep-cc-meta{font-size:11px;color:var(--ink5)}
        .ep-cc-btns{display:flex;gap:8px}
        .ep-cc-btn-ghost{font-family:var(--sans);font-size:12px;padding:6px 14px;background:transparent;color:var(--ink5);border:1px solid var(--parch3);border-radius:4px;cursor:default}
        .ep-cc-btn-dark{font-family:var(--sans);font-size:13px;font-weight:500;padding:6px 16px;background:var(--ink);color:var(--parch);border:none;border-radius:4px;cursor:default}

        /* ── STUDENT SECTION ── */
        .ep-student{padding:120px 0;background:var(--parch2);position:relative;overflow:hidden}
        .ep-student-inner{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
        .ep-session{background:#fff;border-radius:14px;border:1px solid var(--parch3);box-shadow:0 16px 48px rgba(26,22,18,.09);overflow:hidden}
        .ep-session-head{padding:16px 18px;background:var(--parch);border-bottom:1px solid var(--parch3)}
        .ep-session-title{font-family:var(--serif);font-size:16px;font-weight:700;color:var(--ink);margin-bottom:10px}
        .ep-session-prog{display:flex;align-items:center;gap:10px}
        .ep-session-bar{flex:1;height:5px;background:var(--parch3);border-radius:3px;overflow:hidden}
        .ep-session-fill{height:100%;border-radius:3px;background:var(--rust)}
        .ep-session-pct{font-size:11px;font-weight:600;color:var(--rust);flex-shrink:0}
        .ep-task{padding:14px 18px;border-bottom:1px solid var(--parch3);display:flex;align-items:flex-start;gap:12px}
        .ep-task:last-child{border-bottom:none}
        .ep-task-ico{width:26px;height:26px;border-radius:5px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
        .ep-task-ico.done{background:#dcfce7;color:#166534}.ep-task-ico.active{background:var(--rust-xl);color:var(--rust)}.ep-task-ico.pend{background:var(--parch2);color:var(--ink3)}
        .ep-task-title{font-size:13px;font-weight:500;color:var(--ink);margin-bottom:2px}
        .ep-task-sub{font-size:11px;font-weight:400;color:var(--ink5)}

        /* ── CURATOR SECTION ── */
        .ep-curator{padding:120px 0;background:var(--night);position:relative;overflow:hidden}
        .ep-curator-inner{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
        .ep-curator .sec-label{color:var(--rust)}
        .ep-curator .sec-h{color:var(--parch)}
        .ep-curator .sec-h em{color:var(--rust)}
        .ep-curator .sec-p{color:rgba(242,232,217,.78)}
        .ep-caps{display:flex;flex-wrap:wrap;gap:8px;margin-top:28px}
        .ep-cap{font-size:12px;font-weight:400;padding:7px 14px;border-radius:3px;background:rgba(242,232,217,.05);border:1px solid rgba(242,232,217,.1);color:rgba(242,232,217,.55);transition:background .2s,color .2s}
        .ep-cap:hover{background:rgba(242,232,217,.09);color:rgba(242,232,217,.8)}
        .ep-cur-chat{background:#1c1915;border:1px solid rgba(242,232,217,.09);border-radius:14px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.5)}
        .ep-cur-head{padding:13px 18px;background:var(--rust);display:flex;align-items:center;gap:10px}
        .ep-cur-av{width:28px;height:28px;border-radius:5px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:14px;font-style:italic;color:#fff;flex-shrink:0}
        .ep-cur-name{font-family:var(--sans);font-size:13px;font-weight:500;color:#fff}
        .ep-cur-status{margin-left:auto;display:flex;align-items:center;gap:5px;font-size:10px;color:rgba(255,255,255,.7)}
        .ep-cur-sd{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.8);animation:pdot 2s ease-in-out infinite}
        .ep-cur-msgs{padding:16px;display:flex;flex-direction:column;gap:10px}
        .ep-cur-a{display:flex;justify-content:flex-start}
        .ep-cur-u{display:flex;justify-content:flex-end}
        .ep-cur-bub-a{background:rgba(242,232,217,.05);border:1px solid rgba(242,232,217,.08);border-left:2px solid var(--rust);border-radius:10px 10px 10px 2px;padding:10px 13px;font-size:12px;font-weight:400;color:rgba(242,232,217,.92);line-height:1.65;max-width:90%}
        .ep-cur-bub-u{background:var(--rust);border-radius:10px 10px 2px 10px;padding:10px 13px;font-size:12px;font-weight:400;color:#fff;line-height:1.65;max-width:90%}
        .ep-cur-confirm{margin:2px 0;background:rgba(192,80,31,.12);border:1px solid rgba(192,80,31,.25);border-radius:8px;padding:12px 14px}
        .ep-cur-confirm-lbl{font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--rust);margin-bottom:6px}
        .ep-cur-confirm-text{font-size:12px;font-weight:400;color:rgba(242,232,217,.65);margin-bottom:10px;line-height:1.6}
        .ep-cur-btns{display:flex;gap:7px}
        .ep-cur-yes{font-family:var(--sans);font-size:11px;font-weight:500;padding:5px 14px;background:var(--rust);color:#fff;border:none;border-radius:3px;cursor:default}
        .ep-cur-no{font-family:var(--sans);font-size:11px;padding:5px 14px;background:transparent;color:rgba(242,232,217,.35);border:1px solid rgba(242,232,217,.1);border-radius:3px;cursor:default}
        .ep-cur-input{padding:12px 16px;border-top:1px solid rgba(242,232,217,.06);background:rgba(242,232,217,.02);display:flex;align-items:center;gap:8px}
        .ep-cur-input-ph{flex:1;font-size:12px;color:rgba(242,232,217,.2)}
        .ep-cur-send{font-family:var(--sans);font-size:10px;font-weight:500;padding:6px 14px;background:var(--rust);color:#fff;border:none;border-radius:3px;cursor:default;opacity:.55}

        /* ── STEPS ── */
        .ep-how{padding:120px 0;background:var(--parch);position:relative;overflow:hidden}
        .ep-how-inner{display:grid;grid-template-columns:1fr 2fr;gap:80px;align-items:start}
        .ep-steps{display:flex;flex-direction:column}
        .ep-step{display:flex;gap:20px;padding:24px 0;border-bottom:1px solid var(--parch3);transition:background .2s}
        .ep-step:first-child{border-top:1px solid var(--parch3)}
        .ep-step-n{font-family:var(--serif);font-size:14px;font-style:italic;color:var(--rust);min-width:32px;flex-shrink:0;padding-top:2px}
        .ep-step-title{font-size:15px;font-weight:500;color:var(--ink);margin-bottom:4px}
        .ep-step-desc{font-size:13px;font-weight:400;line-height:1.65;color:var(--ink5)}

        /* ── TESTIMONIAL BAND ── */
        .ep-quotes{padding:80px 0;background:var(--night2);position:relative;overflow:hidden}
        .ep-quotes-inner{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:rgba(242,232,217,.04)}
        .ep-quote{padding:44px 36px;background:var(--night2);display:flex;flex-direction:column;gap:18px}
        .ep-quote-mark{font-family:var(--serif);font-size:48px;font-style:italic;color:var(--rust);line-height:1;opacity:.6}
        .ep-quote-text{font-family:var(--serif);font-size:17px;font-style:italic;font-weight:400;line-height:1.65;color:rgba(242,232,217,.92)}
        .ep-quote-author{font-size:12px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--rust)}
        .ep-quote-role{font-size:12px;font-weight:400;color:rgba(242,232,217,.35);margin-top:2px}

        /* ── CTA ── */
        .ep-cta{padding:140px 24px;background:var(--night);text-align:center;position:relative;overflow:hidden}
        .ep-cta-glow{position:absolute;inset:0;background:radial-gradient(ellipse 60% 50% at 50% 50%,rgba(192,80,31,.12) 0%,transparent 70%);pointer-events:none}
        .ep-cta-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(242,232,217,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(242,232,217,.02) 1px,transparent 1px);background-size:50px 50px;pointer-events:none}
        .ep-cta-eyebrow{display:inline-flex;align-items:center;gap:12px;font-size:11px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--rust);margin-bottom:28px}
        .ep-cta-rule{width:28px;height:1px;background:var(--rust);opacity:.5}
        .ep-cta-title{font-family:var(--serif);font-size:clamp(48px,8vw,100px);font-weight:700;color:var(--parch);line-height:.9;margin-bottom:20px;position:relative}
        .ep-cta-title em{font-style:italic;color:var(--rust)}
        .ep-cta-sub{font-size:16px;font-weight:400;color:rgba(242,232,217,.78);margin-bottom:48px;position:relative}
        .ep-cta-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;position:relative}

        /* ── FOOTER ── */
        .ep-footer{background:var(--night);border-top:1px solid rgba(242,232,217,.07);padding:28px 32px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
        .ep-footer-brand{font-family:var(--serif);font-size:18px;font-weight:700;color:rgba(242,232,217,.2)}
        .ep-footer-links{display:flex;gap:24px}
        .ep-footer-link{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(242,232,217,.2);background:none;border:none;cursor:pointer;font-family:var(--sans);transition:color .2s;padding:0}
        .ep-footer-link:hover{color:var(--rust)}
        .ep-footer-copy{font-size:11px;color:rgba(242,232,217,.14)}

        /* RESPONSIVE */
        @media(max-width:1000px){
          .ep-nav-links{display:none}
          .ep-demo-inner,.ep-teacher-inner,.ep-curric-inner,.ep-student-inner,.ep-curator-inner,.ep-how-inner{grid-template-columns:1fr;gap:48px}
          .ep-feats-inner{grid-template-columns:1fr}
          .ep-quotes-inner{grid-template-columns:1fr}
          .ep-an-grid{grid-template-columns:1fr}
        }
        @media(max-width:600px){
          .ep-hero-btns,.ep-cta-btns{flex-direction:column;align-items:center}
          .sec-wrap{padding:0 20px}
          .ep-stats{grid-template-columns:1fr}
        }
      `}</style>

      {/* NAV */}
      <nav className="ep-nav">
        <div className="ep-brand">Epoch<span>.</span></div>
        <div className="ep-nav-links">
          <button className="ep-nav-link" onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}>Demo</button>
          <button className="ep-nav-link" onClick={() => document.getElementById('teachers')?.scrollIntoView({ behavior: 'smooth' })}>For Teachers</button>
          <button className="ep-nav-link" onClick={() => document.getElementById('students')?.scrollIntoView({ behavior: 'smooth' })}>For Students</button>
          <button className="ep-nav-link" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>How It Works</button>
        </div>
        <div className="ep-nav-right">
          <button className="ep-nav-si" onClick={() => navigate('/login')}>Sign In</button>
          <button className="ep-nav-cta" onClick={() => navigate('/register')}>Get Started</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="ep-hero">
        <div className="ep-hero-texture" />
        <div className="ep-hero-grid" />
        <ScatterIcons icons={heroIcons} />
        <div className="ep-hero-content">
          <div className="rev">

          </div>
          <h1 className="ep-hero-h1 rev rev-d1">
            Bring the past
            <em>to life.</em>
          </h1>
          <p className="ep-hero-sub rev rev-d2">
            Epoch is an AI education platform where students don't just read about history — they converse with it, question it, and understand it at a level textbooks never reach.
          </p>
          <div className="ep-hero-btns rev rev-d3">
            <button className="btn-rust" onClick={() => navigate('/register')}>Start Teaching &nbsp;→</button>
            <button className="btn-outline-light" onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}>See It in Action</button>
          </div>
        </div>

      </section>

      {/* ── FEATURE PILLS BAND ── */}
      <section className="ep-feats">
        <div className="sec-wrap">
          <div className="ep-feats-inner">
            <div className="ep-feat rev">
              <div className="ep-feat-icon"><Drama size={22} strokeWidth={1.6} /></div>
              <div className="ep-feat-title">Historical Personas</div>
              <div className="ep-feat-desc">Students converse directly with AI-powered historical figures grounded in primary sources and authentic perspective.</div>
            </div>
            <div className="ep-feat rev rev-d1">
              <div className="ep-feat-icon"><BarChart2 size={22} strokeWidth={1.6} /></div>
              <div className="ep-feat-title">Deep Analytics</div>
              <div className="ep-feat-desc">Per-student skill breakdowns and class-wide trend detection so you always know where to focus instruction.</div>
            </div>
            <div className="ep-feat rev rev-d2">
              <div className="ep-feat-icon"><Sparkles size={22} strokeWidth={1.6} /></div>
              <div className="ep-feat-title">Mr. Curator AI</div>
              <div className="ep-feat-desc">A built-in AI teaching assistant that builds units, manages personas, and runs your classroom through conversation.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE DEMO ── */}
      <section className="ep-demo" id="demo">
        <ScatterIcons icons={[
          { icon: Scroll, top: '8%', right: '1%', size: 65, rot: 18, opacity: 0.06 },
          { icon: Feather, bottom: '10%', left: '0%', size: 55, rot: -22, opacity: 0.065 },
          { icon: Globe, top: '50%', right: '0%', size: 50, rot: 10, opacity: 0.055 },
        ]} />
        <div className="sec-wrap">
          <div className="ep-demo-inner">
            <div className="rev">
              <div className="sec-label">Live Demo</div>
              <h2 className="sec-h">A conversation with<br /><em>history itself.</em></h2>
              <p className="sec-p">This is what your students experience. Real questions, genuine historical perspective — powered by AI grounded in primary sources. No hallucinations, no anachronisms.</p>
              <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { icon: MessageCircle, text: 'Ask about strategy, morale, supply chains, or ideology' },
                  { icon: BookOpen, text: 'Grounded in historical facts and primary sources' },
                  { icon: Sparkles, text: 'Every exchange tracked for teacher analytics' },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className={`rev rev-d${i + 1}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(192,80,31,.08)', border: '1px solid rgba(192,80,31,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: RUST, flexShrink: 0 }}>
                        <Icon size={14} strokeWidth={1.8} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 300, color: 'rgba(26,22,18,.7)' }}>{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <div className="ep-try-me vis">
                <span>Try me</span>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            <div ref={chatRef} className={`ep-chat rev${chatVisible ? ' vis' : ''} rev-d1${demoReady ? ' live' : ''}`}>
              <div className="ep-chat-top">
                <span className="ep-chat-badge"><BookOpen size={12} strokeWidth={1.8} /> &nbsp;Revolutionary War · 1776</span>
                <span className="ep-chat-live"><span className="ep-chat-dot" />Live</span>
              </div>
              <div className="ep-chat-ident">
                <div className="ep-chat-av">G</div>
                <div>
                  <div className="ep-chat-name">George Washington</div>
                  <div className="ep-chat-era">United States · Commander in Chief · 1776</div>
                </div>
              </div>
              <div className="ep-chat-body" ref={bodyRef}>
                {visMsg.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'student' ? 'flex-end' : 'flex-start' }}>
                    <div className={msg.from === 'student' ? 'bub bub-s' : 'bub bub-p'}>{msg.text}</div>
                  </div>
                ))}
                {typing && (
                  <div className="typing">
                    <div className="tdot" /><div className="tdot" /><div className="tdot" />
                  </div>
                )}
              </div>
              <div className="ep-chat-foot">
<form className={`ep-compose${studentComposing ? ' animating' : demoReady ? ' ready' : ''}`} onSubmit={handleSend}>
                  <div className="ep-compose-field">
                    <div className="ep-compose-label">Ask George Washington</div>
                    <textarea
                      className="ep-compose-input"
                      rows={2}
                      value={demoInput}
                      onChange={e => setDemoInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Ask about morale, strategy, independence…"
                      readOnly={studentComposing}
                      disabled={!demoReady && !studentComposing || typing || demoReplying}
                    />
                  </div>
                  <button
                    type="submit"
                    className={`ep-compose-btn${demoReplying ? ' busy' : ''}`}
                    disabled={!demoReady || !demoInput.trim() || typing || studentComposing || demoReplying}
                  >
                    {demoReplying ? 'Replying…' : 'Send'}
                  </button>
                </form>
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TEACHERS ── */}
      <section className="ep-teacher" id="teachers" style={{ position: 'relative', overflow: 'hidden' }}>
        <ScatterIcons icons={teacherIcons} />
        <div className="sec-wrap">
          <div className="ep-teacher-inner">
            <div className="rev">
              <div className="sec-label">For Teachers</div>
              <h2 className="sec-h">Know every student,<br /><em>inside and out.</em></h2>
              <p className="sec-p">Epoch generates a personalized breakdown of what each student excels at and where they need more practice. Aggregate insights across your whole class so you can target instruction where it counts.</p>
              <div className="ep-teacher-bullets">
                {[
                  { Icon: ChartColumnIncreasing, name: 'Strengths & Weaknesses Analysis', desc: 'Granular skill scores per student — critical thinking, source analysis, chronological reasoning, and more.' },
                  { Icon: Users, name: 'Class-wide Aggregation', desc: 'See patterns across your entire room at a glance. Spot the skills every student is missing before the next lesson.' },
                  { Icon: MessageSquareText, name: 'Engagement Tracking', desc: 'Know who\'s having real conversations and who needs a nudge — without chasing them down.' },
                ].map((b, i) => (
                  <div key={i} className={`ep-teacher-bullet rev rev-d${i + 1}`}>
                    <div className="ep-b-ico"><b.Icon size={16} strokeWidth={1.8} /></div>
                    <div>
                      <div className="ep-b-name">{b.name}</div>
                      <div className="ep-b-desc">{b.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ep-analysis rev rev-d2">
              <div className="ep-analysis-head">
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(26,22,18,.45)' }}>Class Performance · Roman Republic Unit</span>
                <span className="ep-analysis-badge">Teacher View</span>
              </div>
              <div className="ep-analysis-body">
                <div className="ep-an-eyebrow">AI-Powered Insights</div>
                <div className="ep-an-title">Class Strengths & Weaknesses</div>
                <div className="ep-an-sub">Analyzes every student's quiz and assignment scores to surface class-wide patterns.</div>
                <div className="ep-stats">
                  {teacherMockup.stats.map(s => (
                    <div key={s.l} className="ep-stat">
                      <div className="ep-stat-label">{s.l}</div>
                      <div className={`ep-stat-val${s.tone ? ' ' + s.tone : ''}`}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div className="ep-summary">
                  <div className="ep-summary-label">Summary</div>
                  <div className="ep-summary-text">{teacherMockup.summary}</div>
                </div>
                <div className="ep-an-grid">
                  <div className="ep-an-card s">
                    <div className="ep-an-card-label">Strengths</div>
                    <ul className="ep-an-list">{teacherMockup.strengths.map(t => <li key={t}>{t}</li>)}</ul>
                  </div>
                  <div className="ep-an-card w">
                    <div className="ep-an-card-label">Areas to Improve</div>
                    <ul className="ep-an-list">{teacherMockup.weaknesses.map(t => <li key={t}>{t}</li>)}</ul>
                  </div>
                </div>
                <div className="ep-an-card r">
                  <div className="ep-an-card-label">Recommendations</div>
                  <ul className="ep-an-list">{teacherMockup.recs.map(t => <li key={t}>{t}</li>)}</ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CURRICULUM ── */}
      <section className="ep-curric">
        <ScatterIcons icons={[
          { icon: Landmark, top: '5%', left: '0%', size: 70, rot: -12, opacity: 0.07 },
          { icon: NotebookPen, bottom: '8%', right: '0%', size: 60, rot: 20, opacity: 0.065 },
          { icon: Crown, top: '50%', right: '1%', size: 48, rot: -8, opacity: 0.06 },
        ]} />
        <div className="sec-wrap">
          <div className="ep-curric-inner">
            <div className="ep-cc rev rev-d1">
              <div className="ep-cc-accent" />
              <div className="ep-cc-body">
                <div className="ep-cc-title">US History</div>
                <div className="ep-cc-code-row">
                  <span className="ep-cc-code-lbl">Join code</span>
                  <span className="ep-cc-code">TWJJ4Y</span>
                </div>
              </div>
              <div className="ep-cc-stats">
                {[['28', 'Students'], ['8', 'Units'], ['7', 'Published']].map(([v, l]) => (
                  <div key={l} className="ep-cc-stat">
                    <strong className="ep-cc-stat-val">{v}</strong>
                    <span className="ep-cc-stat-lbl">{l}</span>
                  </div>
                ))}
              </div>
              <div className="ep-cc-foot">
                <span className="ep-cc-meta">Created Mar 26, 2026</span>
                <div className="ep-cc-btns">
                  <div className="ep-cc-btn-ghost">Delete</div>
                  <div className="ep-cc-btn-dark">Open →</div>
                </div>
              </div>
            </div>

            <div className="rev rev-d1">
              <div className="sec-label">For Your Content</div>
              <h2 className="sec-h">Your subject,<br /><em>your way.</em></h2>
              <p className="sec-p">Build units around any era, any topic, any learning objective. Assign historical personas, add primary source readings, and configure quizzes — all from a single clean interface.</p>
              <div className="ep-teacher-bullets" style={{ marginTop: 32 }}>
                {[
                  { Icon: Landmark, name: 'Unit Builder', desc: 'Set your topic, define objectives, and go live in minutes. Full control over visibility and scheduling.' },
                  { Icon: Drama, name: 'Persona Assignment', desc: 'Choose from historical figures spanning ancient civilisations to the modern era. Assign multiple per unit.' },
                  { Icon: NotebookPen, name: 'Readings & Quizzes', desc: 'Keep everything in one place — no third-party tools, no link-sharing, no confusion.' },
                ].map((b, i) => (
                  <div key={i} className={`ep-teacher-bullet rev rev-d${i + 2}`}>
                    <div className="ep-b-ico"><b.Icon size={16} strokeWidth={1.8} /></div>
                    <div>
                      <div className="ep-b-name">{b.name}</div>
                      <div className="ep-b-desc">{b.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STUDENTS ── */}
      <section className="ep-student" id="students" style={{ position: 'relative', overflow: 'hidden' }}>
        <ScatterIcons icons={studentIcons} />
        <div className="sec-wrap">
          <div className="ep-student-inner">
            <div className="rev">
              <div className="sec-label">For Students</div>
              <h2 className="sec-h">Not a reader.<br /><em>A participant.</em></h2>
              <p className="sec-p">Students don't just read about Julius Caesar — they ask him why he crossed the Rubicon. Every conversation is tracked, every question matters, and every student gets a personalised experience.</p>
              <div className="ep-teacher-bullets" style={{ marginTop: 32 }}>
                {[
                  { Icon: Swords, name: 'AI Conversations', desc: 'Authentic dialogue grounded in historical reality and primary sources — no hallucinations, no anachronisms.' },
                  { Icon: PencilLine, name: 'Personal Notes', desc: 'Students capture their own thinking as they explore. Notes stay tied to each unit and session.' },
                  { Icon: CircleCheckBig, name: 'Progress Tracking', desc: 'A clear view of what\'s done and what\'s next. Students always know where they stand.' },
                ].map((b, i) => (
                  <div key={i} className={`ep-teacher-bullet rev rev-d${i + 1}`}>
                    <div className="ep-b-ico"><b.Icon size={16} strokeWidth={1.8} /></div>
                    <div>
                      <div className="ep-b-name">{b.name}</div>
                      <div className="ep-b-desc">{b.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ep-session rev rev-d2">
              <div className="ep-session-head">
                <div className="ep-session-title">The Fall of the Roman Republic</div>
                <div className="ep-session-prog">
                  <div className="ep-session-bar"><div className="ep-session-fill" style={{ width: '72%' }} /></div>
                  <span className="ep-session-pct">72%</span>
                </div>
              </div>
              {sessionTasks.map((task, i) => {
                const TaskIcon = task.Icon;
                return (
                  <div key={i} className="ep-task">
                    <div className={`ep-task-ico ${task.cls}`}><TaskIcon size={12} strokeWidth={2} /></div>
                    <div>
                      <div className="ep-task-title">{task.title}</div>
                      <div className="ep-task-sub">{task.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── CURATOR ── */}
      <section className="ep-curator">
        <ScatterIcons icons={curatorIcons} />
        <div className="sec-wrap">
          <div className="ep-curator-inner">
            <div className="rev">
              <div className="sec-label">Built-in AI Assistant</div>
              <h2 className="sec-h">Meet<br /><em>Mr. Curator.</em></h2>
              <p className="sec-p">Your personal teaching AI agent, built into Epoch. Ask him to build a unit, add personas, manage your classroom, or answer any history question — all through the app.</p>
              <div className="ep-caps rev rev-d1">
                {['Create units', 'Add personas', 'Manage classrooms', 'History Q&A', 'Lesson planning', 'Set visibility', 'Bulk operations', 'Curriculum advice'].map((cap, i) => (
                  <span key={i} className="ep-cap">{cap}</span>
                ))}
              </div>
            </div>

            <div className="ep-cur-chat rev rev-d2">
              <div className="ep-cur-head">
                <div className="ep-cur-av">C</div>
                <span className="ep-cur-name">Mr. Curator</span>
                <span className="ep-cur-status"><span className="ep-cur-sd" />Online</span>
              </div>
              <div className="ep-cur-msgs">
                <div className="ep-cur-a"><div className="ep-cur-bub-a">I'm Mr. Curator — your Epoch assistant. I can build units, manage personas, and handle your classroom through conversation. What do you need?</div></div>
                <div className="ep-cur-u"><div className="ep-cur-bub-u">Create a unit on the French Revolution for my Year 10 class.</div></div>
                <div className="ep-cur-a"><div className="ep-cur-bub-a">I'll create "The French Revolution: Liberty and Terror" with Robespierre, Marie Antoinette, and Napoleon as personas. Confirm?</div></div>
                <div className="ep-cur-confirm">
                  <div className="ep-cur-confirm-lbl">Pending Action</div>
                  <div className="ep-cur-confirm-text">Create unit "The French Revolution: Liberty and Terror" with 3 personas in Year 10 History.</div>
                  <div className="ep-cur-btns">
                    <div className="ep-cur-yes">Confirm</div>
                    <div className="ep-cur-no">Cancel</div>
                  </div>
                </div>
              </div>
              <div className="ep-cur-input">
                <span className="ep-cur-input-ph">Ask Mr. Curator anything…</span>
                <div className="ep-cur-send">Send</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── QUOTE BAND ── */}

      {/* ── HOW IT WORKS ── */}
      <section className="ep-how" id="how">
        <ScatterIcons icons={[
          { icon: Hourglass, top: '5%', right: '1%', size: 70, rot: 14, opacity: 0.07 },
          { icon: Map, bottom: '10%', left: '0%', size: 60, rot: -10, opacity: 0.065 },
        ]} />
        <div className="sec-wrap">
          <div className="ep-how-inner">
            <div className="rev">
              <div className="sec-label">Process</div>
              <h2 className="sec-h">How<br /><em>it works.</em></h2>
              <p className="sec-p">Four steps from signup to a live classroom where your students are debating Caesar.</p>
            </div>
            <div className="ep-steps">
              {[
                { n: '01', t: 'Build a unit', d: 'Choose your topic, era, and learning objectives.' },
                { n: '02', t: 'Assign a persona', d: 'Select a historical figure tied to that moment.' },
                { n: '03', t: 'Students explore', d: 'Conversations, notes, and quizzes — all in one place.' },
                { n: '04', t: 'Review insights', d: 'Per-student AI analytics land in your dashboard.' },
              ].map((s, i) => (
                <div key={i} className={`ep-step rev rev-d${i + 1}`}>
                  <span className="ep-step-n">{s.n}</span>
                  <div>
                    <div className="ep-step-title">{s.t}</div>
                    <div className="ep-step-desc">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="ep-cta">
        <div className="ep-cta-glow" />
        <div className="ep-cta-grid" />
        <ScatterIcons icons={[
          { icon: Crown, top: '10%', left: '3%', size: 80, rot: -15, opacity: 0.06, color: '#f2e8d9' },
          { icon: Star, top: '15%', right: '5%', size: 60, rot: 20, opacity: 0.065, color: '#f2e8d9' },
          { icon: Shield, bottom: '15%', left: '5%', size: 65, rot: -8, opacity: 0.055, color: '#f2e8d9' },
          { icon: Trophy, bottom: '20%', right: '3%', size: 72, rot: 12, opacity: 0.06, color: '#f2e8d9' },
          { icon: Compass, top: '45%', left: '1%', size: 55, rot: 25, opacity: 0.055, color: '#f2e8d9' },
          { icon: Scroll, top: '40%', right: '2%', size: 58, rot: -18, opacity: 0.06, color: '#f2e8d9' },
        ]} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="ep-cta-eyebrow rev">
            <span className="ep-cta-rule" />
            Join Epoch Today
            <span className="ep-cta-rule" />
          </div>
          <h2 className="ep-cta-title rev rev-d1">
            Ready to teach{' '}
            <em>differently?</em>
          </h2>
          <p className="ep-cta-sub rev rev-d2">Set up your first classroom in under five minutes.</p>
          <div className="ep-cta-btns rev rev-d3">
            <button className="btn-rust" onClick={() => navigate('/register')}>Create Your Classroom</button>
            <button className="btn-outline-light" onClick={() => navigate('/login')}>Sign In</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ep-footer">
        <div className="ep-footer-brand">Epoch.</div>
        <div className="ep-footer-links">
          <button className="ep-footer-link" onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}>Demo</button>
          <button className="ep-footer-link" onClick={() => document.getElementById('teachers')?.scrollIntoView({ behavior: 'smooth' })}>For Teachers</button>
          <button className="ep-footer-link" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>How It Works</button>
        </div>
        <div className="ep-footer-copy">© {new Date().getFullYear()} Epoch. Built for educators.</div>
      </footer>
    </div>
  );
}