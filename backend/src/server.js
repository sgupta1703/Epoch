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

const app = express();

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5174';
console.log(`[startup] CORS origin: ${allowedOrigin}`);
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());

// ── Request logger ────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`,
    Object.keys(req.body).length ? req.body : '');
  next();
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/classrooms', unitRoutes);       // GET/POST /api/classrooms/:id/units
app.use('/api/classrooms', timelineRoutes);   // GET/POST/PUT /api/classrooms/:id/timeline
app.use('/api/units',      unitRoutes);       // GET/PATCH/DELETE /api/units/:id
app.use('/api/units',      notesRoutes);
app.use('/api/units',      personaRoutes);    // GET/POST /api/units/:unitId/personas
app.use('/api/personas',   personaRoutes);    // PATCH/DELETE/POST /api/personas/:id/...
app.use('/api/units',      quizRoutes);
app.use('/api/units',      fileRoutes);
app.use('/api/units',      assignmentRoutes); // all /api/units/:unitId/assignment routes
app.use('/api/assistant',  assistantRoutes);

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
  console.log(`[startup] ANTHROPIC_API_KEY set:   ${!!process.env.ANTHROPIC_API_KEY}`);
});
