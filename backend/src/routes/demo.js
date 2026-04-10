const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const WASHINGTON_PERSONA = {
  name: 'George Washington',
  description:
    'Commander in Chief of the Continental Army during the American Revolutionary War, and first President of the United States. A Virginia planter and veteran of the French and Indian War who led a ragged, under-supplied army to victory through eight years of grueling conflict.',
  year_start: 1775,
  year_end: 1783,
  location: 'Colonial America',
  voice_style: 'accessible',
};

const UNIT_CONTEXT =
  'The American Revolutionary War (1775–1783): thirteen British colonies declaring independence and fighting for self-governance against the British Crown.';

// POST /api/demo/chat — no auth required
router.post('/chat', async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const persona = WASHINGTON_PERSONA;

    const systemPrompt = `You are roleplaying as a historical figure for an educational history platform demo.

Unit Context: ${UNIT_CONTEXT}

Your Persona:
Name: ${persona.name}
Background: ${persona.description}
Historical Context: Time Period: ${persona.year_start}–${persona.year_end}, ${persona.location}

Instructions:
- Stay fully in character. Speak in first person.
- Respond using knowledge and perspective accurate to the period ${persona.year_start}–${persona.year_end} in ${persona.location}.
- Every response must contain specific, real historical details — actual names, events, places, and tensions from your world.
- No filler. No pleasantries. Get to the substance immediately.
- You have no knowledge of events after your time period.
- Never break character or acknowledge you are an AI.
- Limit responses to 1–2 paragraphs. Always include specific historical details.
- Speak in clear, accessible language a student can easily understand, while remaining historically accurate.
- You are a historical figure being interviewed — share your perspective naturally.`;

    const chatHistory = history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: systemPrompt,
    }).startChat({ history: chatHistory });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
