const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const { lookupTermContext } = require('../services/claude');
const authenticate = require('../middleware/authenticate');

async function studentCanAccessUnit(unitId, studentId) {
  const { data: unit } = await supabase
    .from('units').select('classroom_id, is_visible').eq('id', unitId).single();
  if (!unit || !unit.is_visible) return false;
  const { data: enrollment } = await supabase
    .from('classroom_students').select('classroom_id')
    .eq('classroom_id', unit.classroom_id).eq('student_id', studentId).single();
  return !!enrollment;
}

// POST /api/glossary/lookup — AI-generate context for a highlighted term (no save)
router.post('/lookup', authenticate, async (req, res, next) => {
  try {
    const { term, unit_title, unit_context, persona_name, persona_era, message_snippet } = req.body;
    if (!term || !term.trim()) return res.status(400).json({ error: 'term is required' });

    const context_info = await lookupTermContext({
      term: term.trim(),
      unit_title,
      unit_context,
      persona_name,
      persona_era,
      message_snippet,
    });

    res.json({ context_info });
  } catch (err) { next(err); }
});

// GET /api/glossary/unit/:unitId — Get all saved terms for a unit
router.get('/unit/:unitId', authenticate, async (req, res, next) => {
  try {
    const { unitId } = req.params;
    const canAccess = await studentCanAccessUnit(unitId, req.user.id);
    if (!canAccess) return res.status(403).json({ error: 'Access denied' });

    const { data, error } = await supabase
      .from('highlighted_terms')
      .select('*, personas(name, emoji)')
      .eq('student_id', req.user.id)
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ terms: data });
  } catch (err) { next(err); }
});

// POST /api/glossary/unit/:unitId — Save a highlighted term
router.post('/unit/:unitId', authenticate, async (req, res, next) => {
  try {
    const { unitId } = req.params;
    const { persona_id, term, context_info, message_index, message_snippet, user_notes } = req.body;
    if (!term || !term.trim()) return res.status(400).json({ error: 'term is required' });

    const canAccess = await studentCanAccessUnit(unitId, req.user.id);
    if (!canAccess) return res.status(403).json({ error: 'Access denied' });

    const { data, error } = await supabase
      .from('highlighted_terms')
      .insert({
        student_id:      req.user.id,
        unit_id:         unitId,
        persona_id:      persona_id || null,
        term:            term.trim(),
        context_info:    context_info || '',
        message_index:   message_index ?? null,
        message_snippet: message_snippet || null,
        user_notes:      user_notes || '',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ term: data });
  } catch (err) { next(err); }
});

// PATCH /api/glossary/term/:termId — Update term text or user notes
router.patch('/term/:termId', authenticate, async (req, res, next) => {
  try {
    const { termId } = req.params;
    const { term, user_notes } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (term !== undefined) updates.term = term.trim();
    if (user_notes !== undefined) updates.user_notes = user_notes;

    const { data, error } = await supabase
      .from('highlighted_terms')
      .update(updates)
      .eq('id', termId)
      .eq('student_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Term not found' });
    res.json({ term: data });
  } catch (err) { next(err); }
});

// DELETE /api/glossary/term/:termId — Delete a term
router.delete('/term/:termId', authenticate, async (req, res, next) => {
  try {
    const { termId } = req.params;

    const { error } = await supabase
      .from('highlighted_terms')
      .delete()
      .eq('id', termId)
      .eq('student_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
