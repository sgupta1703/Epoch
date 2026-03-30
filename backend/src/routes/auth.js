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
      user: {
        ...profile,
        email: data.user.email || null,
      }
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

// POST /api/auth/forgot-password
// Body: { email, redirectTo }
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email, redirectTo } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || 'http://localhost:5173/reset-password',
    });

    if (error) return res.status(400).json({ error: error.message });

    // Always return success — don't reveal whether the email exists
    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
// Body: { token, new_password }
// token is {{ .Token }} from the Supabase email template embedded directly in the app URL
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      return res.status(400).json({ error: 'token and new_password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Verify the token hash — consumed here for the first time (not pre-fetched by SafeLinks)
    const { data, error: otpErr } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    });

    if (otpErr || !data?.user) {
      console.error('[reset-password] verifyOtp error:', otpErr?.message);
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    }

    // Update the password
    const { error: updateErr } = await supabase.auth.admin.updateUserById(data.user.id, {
      password: new_password,
    });

    if (updateErr) throw updateErr;

    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
