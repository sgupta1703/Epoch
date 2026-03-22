const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const authenticate = require('../middleware/authenticate');

// POST /api/auth/register
// Body: { email, password, display_name, role: 'teacher'|'student' }
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, display_name, role } = req.body;

    if (!email || !password || !display_name || !role) {
      return res.status(400).json({ error: 'email, password, display_name, and role are required' });
    }

    if (!['teacher', 'student'].includes(role)) {
      return res.status(400).json({ error: 'role must be "teacher" or "student"' });
    }

    // Sign up — the trigger on auth.users will create the profile row
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name, role }
    });

if (error) {
  console.log('Supabase register error:', JSON.stringify(error, null, 2));
  return res.status(400).json({ error: error.message });
}
    res.status(201).json({ message: 'Account created successfully', user_id: data.user.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
// Body: { email, password }
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return res.status(401).json({ error: error.message });

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: profile
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
// Body: { refresh_token }
router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'refresh_token is required' });
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    if (error) return res.status(401).json({ error: error.message });

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;