const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const { chatWithPersona } = require('../services/claude');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');

async function teacherOwnsUnit(unitId, teacherId) {
  const { data } = await supabase
    .from('units').select('classroom_id').eq('id', unitId).single();
  if (!data) return false;
  const { data: classroom } = await supabase
    .from('classrooms').select('id')
    .eq('id', data.classroom_id).eq('teacher_id', teacherId).single();
  return !!classroom;
}

async function studentCanAccessUnit(unitId, studentId) {
  const { data: unit } = await supabase
    .from('units').select('classroom_id, is_visible').eq('id', unitId).single();
  if (!unit || !unit.is_visible) return false;
  const { data: enrollment } = await supabase
    .from('classroom_students').select('classroom_id')
    .eq('classroom_id', unit.classroom_id).eq('student_id', studentId).single();
  return !!enrollment;
}

// GET /api/units/:unitId/personas
router.get('/:unitId/personas', authenticate, async (req, res, next) => {
  try {
    const { unitId } = req.params;
    if (req.user.role === 'teacher') {
      const owns = await teacherOwnsUnit(unitId, req.user.id);
      if (!owns) return res.status(403).json({ error: 'Access denied' });
    } else {
      const canAccess = await studentCanAccessUnit(unitId, req.user.id);
      if (!canAccess) return res.status(403).json({ error: 'Access denied' });
    }
    const { data, error } = await supabase
      .from('personas').select('*').eq('unit_id', unitId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ personas: data });
  } catch (err) { next(err); }
});

// POST /api/units/:unitId/personas
router.post('/:unitId/personas', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId } = req.params;
    const { name, description, min_turns, due_date, year_start, year_end, location } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!year_start) return res.status(400).json({ error: 'year_start is required' });
    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });
    const { data, error } = await supabase
      .from('personas')
      .insert({
        unit_id: unitId,
        name,
        description: description || null,
        min_turns: min_turns || 5,
        due_date: due_date || null,
        year_start: year_start ? Number(year_start) : null,
        year_end: year_end ? Number(year_end) : null,
        location: location || null,
      })
      .select().single();
    if (error) throw error;
    res.status(201).json({ persona: data });
  } catch (err) { next(err); }
});

// PATCH /api/personas/:id
router.patch('/:id', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { name, description, min_turns, due_date, year_start, year_end, location } = req.body;
    const { data: persona } = await supabase
      .from('personas').select('unit_id').eq('id', req.params.id).single();
    if (!persona) return res.status(404).json({ error: 'Persona not found' });
    const owns = await teacherOwnsUnit(persona.unit_id, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });
    const updates = {};
    if (name        !== undefined) updates.name        = name;
    if (description !== undefined) updates.description = description;
    if (min_turns   !== undefined) updates.min_turns   = min_turns;
    if (due_date    !== undefined) updates.due_date    = due_date;
    if (year_start  !== undefined) updates.year_start  = year_start ? Number(year_start) : null;
    if (year_end    !== undefined) updates.year_end    = year_end   ? Number(year_end)   : null;
    if (location    !== undefined) updates.location    = location   || null;
    const { data, error } = await supabase
      .from('personas').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ persona: data });
  } catch (err) { next(err); }
});

// DELETE /api/personas/:id
router.delete('/:id', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { data: persona } = await supabase
      .from('personas').select('unit_id').eq('id', req.params.id).single();
    if (!persona) return res.status(404).json({ error: 'Persona not found' });
    const owns = await teacherOwnsUnit(persona.unit_id, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });
    const { error } = await supabase.from('personas').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Persona deleted' });
  } catch (err) { next(err); }
});

// POST /api/personas/:id/chat
router.post('/:id/chat', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });
    const { data: persona } = await supabase
      .from('personas')
      .select('*, units(context, is_visible, classroom_id)')
      .eq('id', req.params.id).single();
    if (!persona) return res.status(404).json({ error: 'Persona not found' });
    const canAccess = await studentCanAccessUnit(persona.unit_id, req.user.id);
    if (!canAccess) return res.status(403).json({ error: 'Access denied' });
    let { data: conversation } = await supabase
      .from('conversations').select('*')
      .eq('persona_id', req.params.id).eq('student_id', req.user.id).single();
    const existingMessages = conversation?.messages || [];
    const updatedMessages = [...existingMessages, { role: 'user', content: message }];
    const reply = await chatWithPersona(persona, persona.units.context, updatedMessages);
    const finalMessages = [...updatedMessages, { role: 'assistant', content: reply }];
    const newTurnCount = (conversation?.turn_count || 0) + 1;
    const completed = newTurnCount >= persona.min_turns;
    const { error } = await supabase
      .from('conversations')
      .upsert(
        {
          persona_id: req.params.id,
          student_id: req.user.id,
          messages: finalMessages,
          turn_count: newTurnCount,
          completed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'persona_id,student_id' }
      ).select().single();
    if (error) throw error;
    res.json({ reply, turn_count: newTurnCount, completed, min_turns: persona.min_turns });
  } catch (err) { next(err); }
});

// GET /api/personas/:id/conversation
router.get('/:id/conversation', authenticate, async (req, res, next) => {
  try {
    const { student_id } = req.query;
    let targetStudentId = req.user.id;
    if (req.user.role === 'teacher') {
      if (!student_id) return res.status(400).json({ error: 'student_id query param required for teachers' });
      const { data: persona } = await supabase
        .from('personas').select('unit_id').eq('id', req.params.id).single();
      if (!persona) return res.status(404).json({ error: 'Persona not found' });
      const owns = await teacherOwnsUnit(persona.unit_id, req.user.id);
      if (!owns) return res.status(403).json({ error: 'Access denied' });
      targetStudentId = student_id;
    }
    const { data: conversation, error } = await supabase
      .from('conversations').select('*')
      .eq('persona_id', req.params.id).eq('student_id', targetStudentId).single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ conversation: conversation || null });
  } catch (err) { next(err); }
});

module.exports = router;