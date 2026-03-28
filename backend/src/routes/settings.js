const express = require('express');
const authenticate = require('../middleware/authenticate');
const { getUserSettings, saveUserSettings, resetUserSettings } = require('../services/userSettings');

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const settings = await getUserSettings(req.user.id, req.user.role);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

router.put('/', authenticate, async (req, res, next) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return res.status(400).json({ error: 'settings object is required' });
    }

    const saved = await saveUserSettings(req.user.id, req.user.role, settings);
    res.json({ settings: saved });
  } catch (err) {
    next(err);
  }
});

router.post('/reset', authenticate, async (req, res, next) => {
  try {
    const settings = await resetUserSettings(req.user.id, req.user.role);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
