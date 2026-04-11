import { useNavigate } from 'react-router-dom';

const LAST_UPDATED = 'April 1, 2026';

const PROCESSORS = [
  {
    company: 'Google LLC',
    website: 'google.com',
    purpose: 'AI language model services for conversational features and content generation',
    service: 'Google Gemini API',
    dataTypes: 'Conversation messages, quiz responses, assignment text',
    location: 'United States',
    privacyUrl: 'https://policies.google.com/privacy',
    category: 'AI / ML',
  },
  {
    company: 'Supabase Inc.',
    website: 'supabase.com',
    purpose: 'Hosted PostgreSQL database and user authentication',
    service: 'Supabase Cloud',
    dataTypes: 'User accounts, classroom data, quiz results, assignment submissions, session tokens',
    location: 'United States',
    privacyUrl: 'https://supabase.com/privacy',
    category: 'Database',
  },
  {
    company: 'Vercel Inc.',
    website: 'vercel.com',
    purpose: 'Frontend application hosting and global CDN delivery',
    service: 'Vercel Edge Network',
    dataTypes: 'HTTP request metadata, anonymised access logs',
    location: 'Global (CDN)',
    privacyUrl: 'https://vercel.com/legal/privacy-policy',
    category: 'Infrastructure',
  },
  {
    company: 'Render Services Inc.',
    website: 'render.com',
    purpose: 'Backend API server hosting',
    service: 'Render Cloud',
    dataTypes: 'Server application logs, request metadata',
    location: 'United States',
    privacyUrl: 'https://render.com/privacy',
    category: 'Infrastructure',
  },

  {
    company: 'OpenAI LLC',
    website: 'openai.com',
    purpose: 'AI language model fallback services',
    service: 'OpenAI API',
    dataTypes: 'Conversation messages (used only when primary AI service is unavailable)',
    location: 'United States',
    privacyUrl: 'https://openai.com/policies/privacy-policy',
    category: 'AI / ML',
  },

];

const CATEGORY_STYLE = {
  'AI / ML':       { bg: 'rgba(192,80,31,.1)',   color: '#c0501f',  border: 'rgba(192,80,31,.25)' },
  'Database':      { bg: 'rgba(99,102,241,.1)',  color: '#6366f1',  border: 'rgba(99,102,241,.25)' },
  'Infrastructure':{ bg: 'rgba(20,184,166,.1)',  color: '#0d9488',  border: 'rgba(20,184,166,.25)' },
};

export default function Subprocessors() {
  const navigate = useNavigate();

  const categories = [...new Set(PROCESSORS.map(p => p.category))];

  return (
    <div className="ep-sub-root">
      <SubStyles />

      {/* NAV */}
      <nav className="ep-sub-nav">
        <button className="ep-sub-back-btn" onClick={() => navigate('/')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5"/></svg>
          Epoch
        </button>
        <div className="ep-sub-brand">Epoch<span>.</span></div>
        <button className="ep-sub-nav-cta" onClick={() => navigate('/register')}>Get Started</button>
      </nav>

      {/* HERO */}
      <div className="ep-sub-hero">
        <div className="ep-sub-hero-inner">
          <div className="ep-sub-hero-eyebrow">Trust &amp; Privacy</div>
          <h1 className="ep-sub-hero-h1">
            Sub<em>processors.</em>
          </h1>
          <p className="ep-sub-hero-sub">
            Epoch uses the following third-party service providers to deliver parts of our platform. These companies may process personal data on our behalf as part of providing our service.
          </p>
          <div className="ep-sub-hero-updated">
            Last updated: <strong>{LAST_UPDATED}</strong>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="ep-sub-wrap">

        {/* INTRO */}


        {/* CATEGORY PILLS */}
        <div className="ep-sub-cats">
          {categories.map(cat => {
            const s = CATEGORY_STYLE[cat];
            return (
              <span
                key={cat}
                className="ep-sub-cat-pill"
                style={{ background: s.bg, color: s.color, borderColor: s.border }}
              >
                {cat}
              </span>
            );
          })}
        </div>

        {/* TABLE WRAPPER */}
        <div className="ep-sub-table-wrap">
          <table className="ep-sub-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Service</th>
                <th>Purpose</th>
                <th>Data Processed</th>
                <th>Location</th>
                <th>Category</th>
                <th>Privacy Policy</th>
              </tr>
            </thead>
            <tbody>
              {PROCESSORS.map((p, i) => {
                const catStyle = CATEGORY_STYLE[p.category];
                return (
                  <tr key={i}>
                    <td className="ep-sub-td-company">
                      <div className="ep-sub-company-name">{p.company}</div>
                      <div className="ep-sub-company-web">{p.website}</div>
                    </td>
                    <td className="ep-sub-td-service">{p.service}</td>
                    <td className="ep-sub-td-purpose">{p.purpose}</td>
                    <td className="ep-sub-td-data">{p.dataTypes}</td>
                    <td className="ep-sub-td-location">
                      <div className="ep-sub-location">{p.location}</div>
                    </td>
                    <td>
                      <span
                        className="ep-sub-cat-badge"
                        style={{ background: catStyle.bg, color: catStyle.color, borderColor: catStyle.border }}
                      >
                        {p.category}
                      </span>
                    </td>
                    <td>
                      <a
                        href={p.privacyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ep-sub-policy-link"
                      >
                        View →
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS */}
        <div className="ep-sub-cards">
          {PROCESSORS.map((p, i) => {
            const catStyle = CATEGORY_STYLE[p.category];
            return (
              <div key={i} className="ep-sub-card">
                <div className="ep-sub-card-head">
                  <div>
                    <div className="ep-sub-company-name">{p.company}</div>
                    <div className="ep-sub-company-web">{p.website}</div>
                  </div>
                  <span
                    className="ep-sub-cat-badge"
                    style={{ background: catStyle.bg, color: catStyle.color, borderColor: catStyle.border }}
                  >
                    {p.category}
                  </span>
                </div>
                <div className="ep-sub-card-row">
                  <span className="ep-sub-card-label">Service</span>
                  <span className="ep-sub-card-val">{p.service}</span>
                </div>
                <div className="ep-sub-card-row">
                  <span className="ep-sub-card-label">Purpose</span>
                  <span className="ep-sub-card-val">{p.purpose}</span>
                </div>
                <div className="ep-sub-card-row">
                  <span className="ep-sub-card-label">Data</span>
                  <span className="ep-sub-card-val">{p.dataTypes}</span>
                </div>
                <div className="ep-sub-card-row">
                  <span className="ep-sub-card-label">Location</span>
                  <span className="ep-sub-card-val">{p.location}</span>
                </div>
                <div className="ep-sub-card-row">
                  <span className="ep-sub-card-label">Privacy</span>
                  <a href={p.privacyUrl} target="_blank" rel="noopener noreferrer" className="ep-sub-policy-link">
                    View Policy →
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* NOTICE */}


      </div>

      {/* FOOTER */}
      <footer className="ep-sub-footer">
        <div className="ep-sub-footer-brand">Epoch.</div>
        <div className="ep-sub-footer-links">
          <button className="ep-sub-footer-link" onClick={() => navigate('/')}>Home</button>
          <button className="ep-sub-footer-link" onClick={() => navigate('/blog')}>Blog</button>
          <button className="ep-sub-footer-link" onClick={() => navigate('/status')}>Status</button>
        </div>
        <div className="ep-sub-footer-copy">© {new Date().getFullYear()} Epoch. Built for educators.</div>
      </footer>
    </div>
  );
}

function SubStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,700;1,400;1,600&family=Outfit:wght@300;400;500;600&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      :root{
        --rust:#c0501f;--rust-d:#8f3a14;
        --parch:#f2e8d9;--parch2:#e8dbc8;--parch3:#ddd0bb;
        --ink:#1a1612;--ink7:rgba(26,22,18,.88);--ink5:rgba(26,22,18,.68);--ink3:rgba(26,22,18,.45);--ink1:rgba(26,22,18,.06);
        --night:#110f0c;--night2:#1c1915;
        --serif:'Cormorant Garamond',Georgia,serif;
        --sans:'Outfit',system-ui,sans-serif;
      }

      .ep-sub-root{font-family:var(--sans);background:var(--parch);color:var(--ink);min-height:100vh;display:flex;flex-direction:column}
      .ep-sub-wrap{flex:1}

      /* NAV */
      .ep-sub-nav{position:fixed;top:0;left:0;right:0;z-index:300;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 32px;background:var(--night);border-bottom:1px solid rgba(192,80,31,.25)}
      .ep-sub-brand{font-family:var(--serif);font-size:22px;font-weight:700;color:var(--parch);position:absolute;left:50%;transform:translateX(-50%)}
      .ep-sub-brand span{color:var(--rust)}
      .ep-sub-back-btn{display:flex;align-items:center;gap:8px;font-family:var(--sans);font-size:12px;color:rgba(242,232,217,.55);background:none;border:none;cursor:pointer;transition:color .2s;padding:0;letter-spacing:.06em}
      .ep-sub-back-btn:hover{color:var(--parch)}
      .ep-sub-nav-cta{font-family:var(--sans);font-size:13px;font-weight:500;padding:8px 20px;background:var(--rust);color:#fff;border:none;cursor:pointer;border-radius:3px;transition:background .2s}
      .ep-sub-nav-cta:hover{background:var(--rust-d)}

      /* HERO */
      .ep-sub-hero{padding:130px 32px 60px;background:var(--night);border-bottom:1px solid rgba(192,80,31,.2);position:relative;overflow:hidden}
      .ep-sub-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 60% 70% at 30% 50%,rgba(192,80,31,.08) 0%,transparent 60%);pointer-events:none}
      .ep-sub-hero-inner{position:relative;z-index:2;max-width:1100px;margin:0 auto}
      .ep-sub-hero-eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:10px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--rust);margin-bottom:20px;padding:6px 14px;border:1px solid rgba(192,80,31,.3);border-radius:2px}
      .ep-sub-hero-h1{font-family:var(--serif);font-size:clamp(48px,7vw,88px);font-weight:700;line-height:.92;color:var(--parch);margin-bottom:22px}
      .ep-sub-hero-h1 em{font-style:italic;color:var(--rust)}
      .ep-sub-hero-sub{font-size:15px;font-weight:300;line-height:1.8;color:rgba(242,232,217,.7);max-width:600px;margin-bottom:20px}
      .ep-sub-hero-updated{font-size:12px;font-weight:400;color:rgba(242,232,217,.3)}
      .ep-sub-hero-updated strong{color:rgba(242,232,217,.5);font-weight:500}

      /* MAIN */
      .ep-sub-wrap{max-width:1100px;margin:0 auto;padding:56px 40px 80px}

      /* INTRO */
      .ep-sub-intro{margin-bottom:36px;max-width:660px}
      .ep-sub-intro p{font-size:14px;font-weight:300;line-height:1.8;color:var(--ink5)}
      .ep-sub-link{color:var(--rust);text-decoration:none;font-weight:500}
      .ep-sub-link:hover{text-decoration:underline}

      /* CATEGORY PILLS */
      .ep-sub-cats{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px}
      .ep-sub-cat-pill{display:inline-block;font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;padding:5px 12px;border-radius:99px;border:1px solid}

      /* TABLE */
      .ep-sub-table-wrap{overflow-x:auto;border-radius:10px;border:1px solid var(--parch3);background:#fff;margin-bottom:32px}
      .ep-sub-table{width:100%;border-collapse:collapse;font-size:13px}
      .ep-sub-table thead{background:var(--parch);border-bottom:1px solid var(--parch3)}
      .ep-sub-table th{padding:13px 16px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3);white-space:nowrap}
      .ep-sub-table td{padding:16px;border-bottom:1px solid var(--parch3);vertical-align:top;color:var(--ink7);line-height:1.55}
      .ep-sub-table tr:last-child td{border-bottom:none}
      .ep-sub-table tbody tr:hover{background:var(--parch)}
      .ep-sub-company-name{font-weight:500;color:var(--ink);margin-bottom:2px}
      .ep-sub-company-web{font-size:11px;color:var(--ink3)}
      .ep-sub-td-purpose{max-width:260px}
      .ep-sub-td-data{max-width:220px;font-size:12px;color:var(--ink5)}
      .ep-sub-td-service{white-space:nowrap}
      .ep-sub-location{white-space:nowrap;font-size:12px}
      .ep-sub-cat-badge{display:inline-block;font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;padding:4px 10px;border-radius:99px;border:1px solid;white-space:nowrap}
      .ep-sub-policy-link{color:var(--rust);text-decoration:none;font-weight:500;font-size:12px;white-space:nowrap}
      .ep-sub-policy-link:hover{text-decoration:underline}

      /* MOBILE CARDS */
      .ep-sub-cards{display:none;flex-direction:column;gap:16px;margin-bottom:32px}
      .ep-sub-card{background:#fff;border:1px solid var(--parch3);border-radius:10px;padding:20px;display:flex;flex-direction:column;gap:12px}
      .ep-sub-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
      .ep-sub-card-row{display:flex;flex-direction:column;gap:2px}
      .ep-sub-card-label{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3)}
      .ep-sub-card-val{font-size:13px;font-weight:300;line-height:1.6;color:var(--ink5)}

      /* NOTICE */
      .ep-sub-notice{display:flex;align-items:flex-start;gap:12px;padding:18px 20px;background:rgba(192,80,31,.05);border:1px solid rgba(192,80,31,.18);border-radius:8px;color:var(--ink5)}
      .ep-sub-notice svg{flex-shrink:0;color:var(--rust);margin-top:1px}
      .ep-sub-notice p{font-size:13px;font-weight:300;line-height:1.7}

      /* FOOTER */
      .ep-sub-footer{background:var(--night);border-top:1px solid rgba(242,232,217,.07);padding:28px 32px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
      .ep-sub-footer-brand{font-family:var(--serif);font-size:18px;font-weight:700;color:rgba(242,232,217,.2)}
      .ep-sub-footer-links{display:flex;gap:24px}
      .ep-sub-footer-link{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(242,232,217,.2);background:none;border:none;cursor:pointer;font-family:var(--sans);transition:color .2s;padding:0}
      .ep-sub-footer-link:hover{color:var(--rust)}
      .ep-sub-footer-copy{font-size:11px;color:rgba(242,232,217,.14)}

      @media(max-width:860px){
        .ep-sub-table-wrap{display:none}
        .ep-sub-cards{display:flex}
        .ep-sub-wrap{padding:40px 20px 60px}
        .ep-sub-nav{padding:0 20px}
        .ep-sub-brand{display:none}
        .ep-sub-hero{padding:100px 20px 48px}
      }
    `}</style>
  );
}
