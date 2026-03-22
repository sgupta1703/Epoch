const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const { generateNotes } = require('../services/claude');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');

// Helper: fetch unit and verify access
async function getUnitWithAccess(unitId, user) {
  const { data: unit, error } = await supabase
    .from('units')
    .select('*')
    .eq('id', unitId)
    .single();

  if (error || !unit) return { unit: null, error: 'Unit not found' };

  if (user.role === 'teacher') {
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('id')
      .eq('id', unit.classroom_id)
      .eq('teacher_id', user.id)
      .single();
    if (!classroom) return { unit: null, error: 'Access denied' };
  } else {
    const { data: enrollment } = await supabase
      .from('classroom_students')
      .select('classroom_id')
      .eq('classroom_id', unit.classroom_id)
      .eq('student_id', user.id)
      .single();
    if (!enrollment || !unit.is_visible) return { unit: null, error: 'Access denied' };
  }

  return { unit, error: null };
}

// GET /api/units/:unitId/notes
router.get('/:unitId/notes', authenticate, async (req, res, next) => {
  try {
    const { unit, error: accessError } = await getUnitWithAccess(req.params.unitId, req.user);
    if (accessError) return res.status(accessError === 'Unit not found' ? 404 : 403).json({ error: accessError });

    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('unit_id', req.params.unitId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
    res.json({ notes: notes || null });
  } catch (err) {
    next(err);
  }
});

// POST /api/units/:unitId/notes/generate
// Teacher only — AI generate notes from unit context
router.post('/:unitId/notes/generate', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unit, error: accessError } = await getUnitWithAccess(req.params.unitId, req.user);
    if (accessError) return res.status(accessError === 'Unit not found' ? 404 : 403).json({ error: accessError });

    if (!unit.context) {
      return res.status(400).json({ error: 'Unit must have a context before generating notes' });
    }

    const content = await generateNotes(unit.title, unit.context);
    const now = new Date().toISOString();

    // Upsert — create or replace existing notes
    const { data: notes, error } = await supabase
      .from('notes')
      .upsert(
        { unit_id: req.params.unitId, content, generated_at: now },
        { onConflict: 'unit_id' }
      )
      .select()
      .single();

    if (error) throw error;
    res.json({ notes });
  } catch (err) {
    next(err);
  }
});

// PUT /api/units/:unitId/notes
// Teacher only — save or overwrite notes manually
router.put('/:unitId/notes', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { content, due_date } = req.body;

    if (!content) return res.status(400).json({ error: 'content is required' });

    const { unit, error: accessError } = await getUnitWithAccess(req.params.unitId, req.user);
    if (accessError) return res.status(accessError === 'Unit not found' ? 404 : 403).json({ error: accessError });

    const { data: notes, error } = await supabase
      .from('notes')
      .upsert(
        { unit_id: req.params.unitId, content, due_date: due_date || null },
        { onConflict: 'unit_id' }
      )
      .select()
      .single();

    if (error) throw error;
    res.json({ notes });
  } catch (err) {
    next(err);
  }
});

module.exports = router;