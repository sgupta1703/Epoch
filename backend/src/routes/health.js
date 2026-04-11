const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');

// Lazily initialise Gemini only if key is present
let genAI = null;
try {
  if (process.env.GEMINI_API_KEY) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
} catch (e) {
  console.warn('[health] Could not initialise Gemini:', e.message);
}

// ── Service metadata ─────────────────────────────────────────────────
const SERVICE_DEFS = [
  {
    id: 'api',
    name: 'Epoch Platform',
    description: 'Frontend application and backend API server',
  },
  {
    id: 'database',
    name: 'Database',
    description: 'Supabase PostgreSQL — all classroom and user data',
  },
  {
    id: 'auth',
    name: 'Authentication',
    description: 'User login, registration, OAuth, and session management',
  },
  {
    id: 'ai',
    name: 'AI Engine',
    description: 'Gemini-powered personas, quiz grading, and essay feedback',
  },
  {
    id: 'storage',
    name: 'File Storage',
    description: 'Assignment submissions and media uploads',
  },
];

// ── In-memory cache (populated by background job) ────────────────────
const cache = {};
SERVICE_DEFS.forEach(s => {
  cache[s.id] = { status: 'checking', responseMs: null, lastChecked: null, error: null };
});
// API server is always up if this code is running
cache.api = { status: 'operational', responseMs: 1, lastChecked: new Date().toISOString(), error: null };

// ── Helpers ──────────────────────────────────────────────────────────
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// ── Individual checks ────────────────────────────────────────────────
async function checkDatabase() {
  const t = Date.now();
  const { error } = await withTimeout(
    supabase.from('profiles').select('id').limit(1),
    5000
  );
  return {
    status: error ? 'degraded' : 'operational',
    responseMs: Date.now() - t,
    error: error?.message ?? null,
  };
}

async function checkAuth() {
  const t = Date.now();
  const { error } = await withTimeout(
    supabase.auth.admin.listUsers({ page: 1, perPage: 1 }),
    5000
  );
  return {
    status: error ? 'degraded' : 'operational',
    responseMs: Date.now() - t,
    error: error?.message ?? null,
  };
}

async function checkStorage() {
  const t = Date.now();
  const { error } = await withTimeout(supabase.storage.listBuckets(), 5000);
  return {
    status: error ? 'degraded' : 'operational',
    responseMs: Date.now() - t,
    error: error?.message ?? null,
  };
}

async function checkAI() {
  if (!genAI) {
    return {
      status: 'degraded',
      responseMs: null,
      error: 'GEMINI_API_KEY not configured',
    };
  }
  const t = Date.now();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  const result = await withTimeout(
    model.generateContent('Reply with one word: ok'),
    12000
  );
  const text = result.response.text();
  return {
    status: text ? 'operational' : 'degraded',
    responseMs: Date.now() - t,
    error: null,
  };
}

// ── Background job: run all checks concurrently, persist to DB ───────
async function runChecks() {
  const now = new Date().toISOString();

  // API server is always operational if this function is running
  cache.api = { status: 'operational', responseMs: 1, lastChecked: now, error: null };

  const [dbRes, authRes, aiRes, storRes] = await Promise.allSettled([
    checkDatabase(),
    checkAuth(),
    checkAI(),
    checkStorage(),
  ]);

  const ids = ['database', 'auth', 'ai', 'storage'];
  const settled = [dbRes, authRes, aiRes, storRes];

  const rows = [
    { service_id: 'api', status: 'operational', response_ms: 1, error_msg: null, checked_at: now },
  ];

  ids.forEach((id, i) => {
    const r = settled[i];
    if (r.status === 'fulfilled') {
      cache[id] = { ...r.value, lastChecked: now };
      rows.push({
        service_id: id,
        status: r.value.status,
        response_ms: r.value.responseMs,
        error_msg: r.value.error,
        checked_at: now,
      });
    } else {
      cache[id] = { status: 'outage', responseMs: null, lastChecked: now, error: r.reason?.message };
      rows.push({
        service_id: id,
        status: 'outage',
        response_ms: null,
        error_msg: r.reason?.message ?? 'Unknown error',
        checked_at: now,
      });
    }
  });

  // Persist — silently skip if table doesn't exist yet
  try {
    const { error } = await supabase.from('service_health_logs').insert(rows);
    if (error) console.warn('[health] insert error:', error.message);
  } catch (e) {
    console.warn('[health] Could not persist health logs:', e.message);
  }

  const summary = rows.map(r => `${r.service_id}=${r.status}(${r.response_ms ?? '?'}ms)`).join(' ');
  console.log('[health]', summary);
}

// ── Routes ───────────────────────────────────────────────────────────

// GET /api/health — returns current cached status for all services
router.get('/', (req, res) => {
  const statuses = Object.values(cache).map(c => c.status);
  const overallStatus =
    statuses.includes('outage')    ? 'outage'   :
    statuses.includes('degraded')  ? 'degraded' :
    statuses.includes('checking')  ? 'checking' :
    'operational';

  res.json({
    overallStatus,
    checkedAt: new Date().toISOString(),
    services: SERVICE_DEFS.map(s => ({
      id:          s.id,
      name:        s.name,
      description: s.description,
      status:      cache[s.id]?.status      ?? 'unknown',
      responseMs:  cache[s.id]?.responseMs  ?? null,
      lastChecked: cache[s.id]?.lastChecked ?? null,
    })),
  });
});

// GET /api/health/history?days=90
// Returns per-service daily aggregated history from the DB.
// Falls back to empty history if the table doesn't exist yet.
router.get('/history', async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 90, 90);
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  try {
    const { data, error } = await withTimeout(
      supabase
        .from('service_health_logs')
        .select('service_id, status, checked_at')
        .gte('checked_at', since)
        .order('checked_at', { ascending: true }),
      8000
    );

    if (error) throw error;

    // Aggregate to worst-status-per-day for each service
    const SEVERITY = { operational: 0, degraded: 1, outage: 2 };
    const history = {};
    SERVICE_DEFS.forEach(s => { history[s.id] = {}; });

    for (const row of data ?? []) {
      if (!history[row.service_id]) continue;
      const day = row.checked_at.slice(0, 10); // YYYY-MM-DD
      const prev = history[row.service_id][day];
      if (!prev || (SEVERITY[row.status] ?? 0) > (SEVERITY[prev] ?? 0)) {
        history[row.service_id][day] = row.status;
      }
    }

    res.json({ history, days });
  } catch (e) {
    console.warn('[health] History query failed:', e.message);
    const emptyHistory = {};
    SERVICE_DEFS.forEach(s => { emptyHistory[s.id] = {}; });
    res.json({ history: emptyHistory, days });
  }
});

// ── Background job starter ────────────────────────────────────────────
function startHealthCheckJob() {
  const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  // Run immediately on startup so cache is warm
  runChecks().catch(e => console.error('[health] Initial check failed:', e.message));

  // Then on a fixed interval
  setInterval(() => {
    runChecks().catch(e => console.error('[health] Periodic check failed:', e.message));
  }, INTERVAL_MS);

  console.log(`[health] Background job started (interval: ${INTERVAL_MS / 1000}s)`);
}

module.exports = { router, startHealthCheckJob };
