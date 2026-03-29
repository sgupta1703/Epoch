require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes        = require('./routes/auth');
const classroomRoutes   = require('./routes/classrooms');
const unitRoutes        = require('./routes/units');
const notesRoutes       = require('./routes/notes');
const personaRoutes     = require('./routes/personas');
const quizRoutes        = require('./routes/quiz');
const fileRoutes        = require('./routes/files');
const assignmentRoutes  = require('./routes/assignments');
const timelineRoutes    = require('./routes/timeline');
const assistantRoutes   = require('./routes/assistant');
const settingsRoutes    = require('./routes/settings');
const studentRoutes     = require('./routes/student');
const profileRoutes     = require('./routes/profile');

const app = express();

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = process.env.CLIENT_URLS
  ? process.env.CLIENT_URLS.split(',').map(o => o.trim())
  : [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://epoch-rosy.vercel.app'
    ];

console.log('[startup] Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // allow non-browser requests (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true
}));

// Handle preflight explicitly
app.options('*', cors());

app.use(express.json());

// ── Request logger ────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.path}`,
    Object.keys(req.body || {}).length ? req.body : ''
  );
  next();
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/classrooms', unitRoutes);
app.use('/api/classrooms', timelineRoutes);
app.use('/api/units',      unitRoutes);
app.use('/api/units',      notesRoutes);
app.use('/api/units',      personaRoutes);
app.use('/api/personas',   personaRoutes);
app.use('/api/units',      quizRoutes);
app.use('/api/units',      fileRoutes);
app.use('/api/units',      assignmentRoutes);
app.use('/api/assistant',  assistantRoutes);
app.use('/api/settings',   settingsRoutes);
app.use('/api/student',    studentRoutes);
app.use('/api/profile',    profileRoutes);

app.get('/api/health', (req, res) => {
  console.log('[health] ok');
  res.json({ status: 'ok' });
});

// ── 404 catch-all ─────────────────────────────────────────────
app.use((req, res) => {
  console.warn(`[404] No route matched: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[error] ${req.method} ${req.originalUrl}`, {
    message: err.message,
    status:  err.status,
    stack:   err.stack,
  });
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[startup] Server running on port ${PORT}`);
  console.log(`[startup] SUPABASE_URL set:        ${!!process.env.SUPABASE_URL}`);
  console.log(`[startup] SERVICE_ROLE_KEY set:    ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
  console.log(`[startup] OPENAI_API_KEY set:      ${!!process.env.OPENAI_API_KEY}`);
});
