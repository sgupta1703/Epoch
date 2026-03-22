const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { chatWithEpochAssistant } = require('../services/claude');

const router = express.Router();

// POST /api/assistant/chat
// Teacher only - general helper for Epoch workflow and history questions
router.post('/chat', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages is required' });
    }

    const cleanedMessages = messages
      .filter((message) => typeof message?.content === 'string' && message.content.trim())
      .slice(-12)
      .map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content.trim(),
      }));

    if (cleanedMessages.length === 0) {
      return res.status(400).json({ error: 'messages must include at least one non-empty message' });
    }

    const reply = await chatWithEpochAssistant(cleanedMessages);
    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
