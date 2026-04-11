import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const REFRESH_INTERVAL = 60_000; // 60 seconds

// ── Helpers ──────────────────────────────────────────────────────────

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Build a 90-entry array from today going back, filling from the history map
function buildUptimeArray(serviceHistory, days = 90) {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    result.push(serviceHistory?.[key] ?? 'no-data');
  }
  return result;
}

// Uptime % over last 30 days (only counts days with data)
function calcUptime(serviceHistory) {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    const s = serviceHistory?.[key];
    if (s) days.push(s);
  }
  if (days.length === 0) return null;
  const ok = days.filter(s => s === 'operational').length;
  const pct = (ok / days.length) * 100;
  return pct === 100 ? '100%' : `${pct.toFixed(2)}%`;
}

const STATUS_META = {
  operational: { label: 'Operational', color: '#22c55e', bg: 'rgba(34,197,94,.1)',  border: 'rgba(34,197,94,.25)' },
  degraded:    { label: 'Degraded',    color: '#f59e0b', bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.25)' },
  outage:      { label: 'Outage',      color: '#ef4444', bg: 'rgba(239,68,68,.1)',  border: 'rgba(239,68,68,.25)'  },
  checking:    { label: 'Checking…',   color: '#94a3b8', bg: 'rgba(148,163,184,.1)',border: 'rgba(148,163,184,.25)'},
  unknown:     { label: 'Unknown',     color: '#94a3b8', bg: 'rgba(148,163,184,.1)',border: 'rgba(148,163,184,.25)'},
};

const BLOCK_COLOR = {
  operational: '#22c55e',
  degraded:    '#f59e0b',
  outage:      '#ef4444',
  'no-data':   '#e2d8ca',
};

export default function Status() {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [health, setHealth]   = useState(null);   // { overallStatus, services, checkedAt }
  const [history, setHistory] = useState(null);   // { [serviceId]: { 'YYYY-MM-DD': status } }
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Fetch both endpoints in parallel
  const fetchStatus = useCallback(async () => {
    try {
      const [healthRes, historyRes] = await Promise.all([
        fetch(`${API}/api/health`),
        fetch(`${API}/api/health/history?days=90`),
      ]);

      if (!healthRes.ok) throw new Error(`Health endpoint returned ${healthRes.status}`);

      const healthData  = await healthRes.json();
      const historyData = historyRes.ok ? await historyRes.json() : { history: {} };

      setHealth(healthData);
      setHistory(historyData.history ?? {});
      setError(null);
      setLastFetched(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const overall = health?.overallStatus ?? 'checking';
  const allOk   = overall === 'operational';

  return (
    <div className="ep-status-root">
      <StatusStyles />

      {/* NAV */}
      <nav className="ep-status-nav">
        <button className="ep-status-back-btn" onClick={() => navigate('/')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5"/></svg>
          Epoch
        </button>
        <div className="ep-status-brand">Epoch<span>.</span></div>
        <button className="ep-status-nav-cta" onClick={() => navigate('/register')}>Get Started</button>
      </nav>

      {/* HERO */}
      <div className={`ep-status-hero ${allOk ? 'ep-status-hero--ok' : overall === 'degraded' ? 'ep-status-hero--warn' : overall === 'outage' ? 'ep-status-hero--err' : 'ep-status-hero--loading'}`}>
        <div className="ep-status-hero-inner">
          {loading ? (
            <div className="ep-status-hero-badge loading">
              <span className="ep-status-spinner" />
              <span>Checking systems…</span>
            </div>
          ) : error && !health ? (
            <div className="ep-status-hero-badge warn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>Status unavailable</span>
            </div>
          ) : allOk ? (
            <div className="ep-status-hero-badge ok">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>Everything is Running Smoothly</span>
            </div>
          ) : overall === 'outage' ? (
            <div className="ep-status-hero-badge err">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <span>Service Disruption Detected</span>
            </div>
          ) : (
            <div className="ep-status-hero-badge warn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>Degraded Performance</span>
            </div>
          )}

          <div className="ep-status-hero-time">
            <span className="ep-status-hero-as-of">As of {formatDate(now)}</span>
            <span className="ep-status-hero-clock">{formatTime(now)}</span>
          </div>

          {lastFetched && (
            <div className="ep-status-hero-refresh">
              Last checked {formatTime(lastFetched)}
              <button className="ep-status-refresh-btn" onClick={fetchStatus} title="Refresh now">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                Refresh
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MAIN */}
      <div className="ep-status-wrap">

        {/* SERVICES */}
        <section className="ep-status-section">
          <div className="ep-status-section-head">
            <h2 className="ep-status-section-title">System Status</h2>
            <p className="ep-status-section-sub">Current Status by Service</p>
          </div>

          <div className="ep-status-services">
            {loading && !health ? (
              // Skeleton loading state
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="ep-status-service ep-status-service--skeleton">
                  <div className="ep-skel ep-skel-name" />
                  <div className="ep-skel ep-skel-bar" />
                </div>
              ))
            ) : (health?.services ?? []).map(svc => {
              const meta  = STATUS_META[svc.status] ?? STATUS_META.unknown;
              const hist  = history?.[svc.id] ?? {};
              const blocks = buildUptimeArray(hist);
              const uptime = calcUptime(hist);

              return (
                <div key={svc.id} className="ep-status-service">
                  <div className="ep-status-svc-header">
                    <div className="ep-status-svc-left">
                      <div className="ep-status-svc-name">{svc.name}</div>
                      <div className="ep-status-svc-desc">{svc.description}</div>
                    </div>
                    <div className="ep-status-svc-right">
                      {svc.responseMs != null && (
                        <span className="ep-status-svc-latency">{svc.responseMs}ms</span>
                      )}
                      <span
                        className="ep-status-svc-badge"
                        style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
                      >
                        <span className="ep-status-svc-dot" style={{ background: meta.color }} />
                        {meta.label}
                      </span>
                    </div>
                  </div>

                  <div className="ep-status-bar-row">
                    <span className="ep-status-bar-ago">90 days ago</span>
                    <div className="ep-status-bar" title="90-day uptime history">
                      {blocks.map((day, i) => (
                        <div
                          key={i}
                          className="ep-status-block"
                          style={{ background: BLOCK_COLOR[day] ?? BLOCK_COLOR['no-data'] }}
                          title={day === 'no-data' ? 'No data' : day.charAt(0).toUpperCase() + day.slice(1)}
                        />
                      ))}
                    </div>
                    <span className="ep-status-bar-now">Today</span>
                    <div className="ep-status-uptime">
                      <span className="ep-status-uptime-pct">
                        {uptime ?? '—'}
                      </span>
                      <span className="ep-status-uptime-label">last 30 days</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {error && health && (
            <div className="ep-status-stale-notice">
              ⚠ Could not refresh — showing last known state
            </div>
          )}
        </section>

        {/* LEGEND */}
        <div className="ep-status-legend">
          {[
            { color: '#22c55e', label: 'Operational' },
            { color: '#f59e0b', label: 'Degraded performance' },
            { color: '#ef4444', label: 'Outage' },
            { color: '#e2d8ca', label: 'No data' },
          ].map(({ color, label }) => (
            <div key={label} className="ep-status-legend-item">
              <span className="ep-status-legend-block" style={{ background: color }} />
              <span>{label}</span>
            </div>
          ))}
        </div>



      </div>

      {/* FOOTER */}
      <footer className="ep-status-footer">
        <div className="ep-status-footer-brand">Epoch.</div>
        <div className="ep-status-footer-links">
          <button className="ep-status-footer-link" onClick={() => navigate('/')}>Home</button>
          <button className="ep-status-footer-link" onClick={() => navigate('/blog')}>Blog</button>
          <button className="ep-status-footer-link" onClick={() => navigate('/subprocessors')}>Subprocessors</button>
        </div>
        <div className="ep-status-footer-copy">© {new Date().getFullYear()} Epoch. Built for educators.</div>
      </footer>
    </div>
  );
}

function StatusStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,700;1,400;1,600&family=Outfit:wght@300;400;500;600&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      :root{
        --rust:#c0501f;--rust-d:#8f3a14;
        --parch:#f2e8d9;--parch2:#e8dbc8;--parch3:#ddd0bb;
        --ink:#1a1612;--ink7:rgba(26,22,18,.88);--ink5:rgba(26,22,18,.68);--ink3:rgba(26,22,18,.45);
        --night:#110f0c;--night2:#1c1915;
        --serif:'Cormorant Garamond',Georgia,serif;
        --sans:'Outfit',system-ui,sans-serif;
      }

      .ep-status-root{font-family:var(--sans);background:var(--parch);color:var(--ink);min-height:100vh;display:flex;flex-direction:column}
      .ep-status-wrap{flex:1}

      /* NAV */
      .ep-status-nav{position:fixed;top:0;left:0;right:0;z-index:300;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 32px;background:var(--night);border-bottom:1px solid rgba(192,80,31,.25)}
      .ep-status-brand{font-family:var(--serif);font-size:22px;font-weight:700;color:var(--parch);position:absolute;left:50%;transform:translateX(-50%)}
      .ep-status-brand span{color:var(--rust)}
      .ep-status-back-btn{display:flex;align-items:center;gap:8px;font-family:var(--sans);font-size:12px;color:rgba(242,232,217,.55);background:none;border:none;cursor:pointer;transition:color .2s;padding:0;letter-spacing:.06em}
      .ep-status-back-btn:hover{color:var(--parch)}
      .ep-status-nav-cta{font-family:var(--sans);font-size:13px;font-weight:500;padding:8px 20px;background:var(--rust);color:#fff;border:none;cursor:pointer;border-radius:3px;transition:background .2s}
      .ep-status-nav-cta:hover{background:var(--rust-d)}

      /* HERO */
      .ep-status-hero{padding:120px 32px 52px;text-align:center;border-bottom:1px solid var(--parch3)}
      .ep-status-hero--ok{background:linear-gradient(180deg,#f0fdf4 0%,var(--parch) 100%)}
      .ep-status-hero--warn{background:linear-gradient(180deg,#fffbeb 0%,var(--parch) 100%)}
      .ep-status-hero--err{background:linear-gradient(180deg,#fff1f2 0%,var(--parch) 100%)}
      .ep-status-hero--loading{background:var(--parch)}
      .ep-status-hero-inner{max-width:700px;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:14px}
      .ep-status-hero-badge{display:inline-flex;align-items:center;gap:12px;padding:16px 28px;border-radius:8px;font-family:var(--sans);font-size:17px;font-weight:500;border:1px solid}
      .ep-status-hero-badge.ok{background:rgba(34,197,94,.08);color:#15803d;border-color:rgba(34,197,94,.25)}
      .ep-status-hero-badge.warn{background:rgba(245,158,11,.08);color:#b45309;border-color:rgba(245,158,11,.25)}
      .ep-status-hero-badge.err{background:rgba(239,68,68,.08);color:#dc2626;border-color:rgba(239,68,68,.25)}
      .ep-status-hero-badge.loading{background:rgba(148,163,184,.08);color:#64748b;border-color:rgba(148,163,184,.25)}
      .ep-status-hero-time{display:flex;flex-direction:column;align-items:center;gap:2px}
      .ep-status-hero-as-of{font-size:13px;color:var(--ink3)}
      .ep-status-hero-clock{font-size:14px;font-weight:500;color:var(--ink5)}
      .ep-status-hero-refresh{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--ink3)}
      .ep-status-refresh-btn{display:inline-flex;align-items:center;gap:4px;font-family:var(--sans);font-size:11px;color:var(--rust);background:none;border:none;cursor:pointer;padding:0;transition:opacity .2s}
      .ep-status-refresh-btn:hover{opacity:.7}

      /* Spinner */
      .ep-status-spinner{width:18px;height:18px;border:2px solid rgba(100,116,139,.25);border-top-color:#64748b;border-radius:50%;animation:spin .8s linear infinite;flex-shrink:0}
      @keyframes spin{to{transform:rotate(360deg)}}

      /* WRAP */
      .ep-status-wrap{max-width:860px;margin:0 auto;padding:64px 40px 80px}

      /* SECTION */
      .ep-status-section{margin-bottom:52px}
      .ep-status-section-head{margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--parch3)}
      .ep-status-section-title{font-family:var(--serif);font-size:28px;font-weight:700;color:var(--ink);margin-bottom:3px}
      .ep-status-section-sub{font-size:13px;color:var(--ink3)}

      /* SERVICES */
      .ep-status-services{border:1px solid var(--parch3);border-radius:10px;overflow:hidden;background:#fff}
      .ep-status-service{padding:20px 24px;border-bottom:1px solid var(--parch3)}
      .ep-status-service:last-child{border-bottom:none}
      .ep-status-svc-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:12px}
      .ep-status-svc-left{flex:1;min-width:0}
      .ep-status-svc-name{font-size:14px;font-weight:500;color:var(--ink);margin-bottom:2px}
      .ep-status-svc-desc{font-size:12px;color:var(--ink3)}
      .ep-status-svc-right{display:flex;align-items:center;gap:10px;flex-shrink:0}
      .ep-status-svc-latency{font-size:11px;font-weight:500;color:var(--ink3);font-family:monospace}
      .ep-status-svc-badge{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:600;letter-spacing:.04em;padding:5px 12px;border-radius:99px;border:1px solid;white-space:nowrap}
      .ep-status-svc-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}

      /* UPTIME BAR */
      .ep-status-bar-row{display:flex;align-items:center;gap:8px}
      .ep-status-bar-ago,.ep-status-bar-now{font-size:10px;color:var(--ink3);white-space:nowrap;flex-shrink:0}
      .ep-status-bar{display:flex;gap:2px;flex:1;min-width:0}
      .ep-status-block{height:28px;flex:1;border-radius:2px;min-width:1px;cursor:default;transition:opacity .15s}
      .ep-status-block:hover{opacity:.7}
      .ep-status-uptime{display:flex;flex-direction:column;align-items:flex-end;flex-shrink:0;min-width:80px}
      .ep-status-uptime-pct{font-family:var(--serif);font-size:20px;font-weight:700;color:var(--ink);line-height:1}
      .ep-status-uptime-label{font-size:10px;font-weight:500;letter-spacing:.06em;color:var(--ink3)}

      /* Skeleton */
      .ep-status-service--skeleton{display:flex;flex-direction:column;gap:12px}
      .ep-skel{border-radius:4px;background:linear-gradient(90deg,var(--parch2) 25%,var(--parch3) 50%,var(--parch2) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite}
      @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      .ep-skel-name{height:14px;width:140px}
      .ep-skel-bar{height:28px;width:100%}

      /* Stale notice */
      .ep-status-stale-notice{margin-top:12px;font-size:12px;color:#b45309;padding:8px 12px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:6px}

      /* LEGEND */
      .ep-status-legend{display:flex;gap:20px;flex-wrap:wrap;margin-bottom:52px}
      .ep-status-legend-item{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--ink5)}
      .ep-status-legend-block{width:12px;height:12px;border-radius:2px;flex-shrink:0}

      /* INCIDENTS */
      .ep-status-incidents{display:flex;flex-direction:column;gap:14px}
      .ep-status-incident{border:1px solid var(--parch3);border-radius:10px;background:#fff;overflow:hidden}
      .ep-status-incident--resolved{border-left:3px solid #22c55e}
      .ep-status-incident-head{display:flex;align-items:center;gap:12px;padding:16px 20px 10px;flex-wrap:wrap}
      .ep-status-incident-badge{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 10px;border-radius:99px;border:1px solid;flex-shrink:0}
      .ep-status-incident-badge--resolved{background:rgba(34,197,94,.1);color:#15803d;border-color:rgba(34,197,94,.25)}
      .ep-status-incident-title{font-size:14px;font-weight:500;color:var(--ink);flex:1}
      .ep-status-incident-date{font-size:12px;color:var(--ink3);white-space:nowrap}
      .ep-status-incident-body{padding:0 20px 14px;font-size:13px;line-height:1.7;color:var(--ink5)}
      .ep-status-incident-timeline{border-top:1px solid var(--parch3);padding:14px 20px;display:flex;flex-direction:column;gap:9px}
      .ep-status-incident-event{display:flex;gap:14px;align-items:baseline}
      .ep-status-ie-time{font-size:11px;font-weight:600;letter-spacing:.04em;color:var(--ink3);white-space:nowrap;font-family:monospace;flex-shrink:0;min-width:68px}
      .ep-status-ie-text{font-size:12px;line-height:1.6;color:var(--ink5)}
      .ep-status-incident-event.resolved .ep-status-ie-text{color:#15803d;font-weight:500}

      /* FOOTER */
      .ep-status-footer{background:var(--night);border-top:1px solid rgba(242,232,217,.07);padding:28px 32px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
      .ep-status-footer-brand{font-family:var(--serif);font-size:18px;font-weight:700;color:rgba(242,232,217,.2)}
      .ep-status-footer-links{display:flex;gap:24px}
      .ep-status-footer-link{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(242,232,217,.2);background:none;border:none;cursor:pointer;font-family:var(--sans);transition:color .2s;padding:0}
      .ep-status-footer-link:hover{color:var(--rust)}
      .ep-status-footer-copy{font-size:11px;color:rgba(242,232,217,.14)}

      @media(max-width:600px){
        .ep-status-wrap{padding:40px 20px 60px}
        .ep-status-nav{padding:0 20px}
        .ep-status-brand{display:none}
        .ep-status-hero{padding:96px 20px 40px}
        .ep-status-hero-badge{font-size:14px;padding:12px 18px}
        .ep-status-svc-header{flex-direction:column;align-items:flex-start}
        .ep-status-svc-right{width:100%;justify-content:flex-start}
        .ep-status-bar-ago,.ep-status-bar-now{display:none}
        .ep-status-incident-head{flex-direction:column;gap:6px}
      }
    `}</style>
  );
}
