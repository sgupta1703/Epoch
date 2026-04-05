const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');

// Helper: verify teacher owns the classroom
async function teacherOwnsClassroom(classroomId, teacherId) {
  const { data } = await supabase
    .from('classrooms')
    .select('id')
    .eq('id', classroomId)
    .eq('teacher_id', teacherId)
    .single();
  return !!data;
}

// Helper: verify student is enrolled in classroom
async function studentEnrolled(classroomId, studentId) {
  const { data } = await supabase
    .from('classroom_students')
    .select('classroom_id')
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId)
    .single();
  return !!data;
}

// GET /api/classrooms/:classroomId/units
// Teacher: all units. Student: visible units only.
router.get('/:classroomId/units', authenticate, async (req, res, next) => {
  try {
    const { classroomId } = req.params;

    if (req.user.role === 'teacher') {
      const owns = await teacherOwnsClassroom(classroomId, req.user.id);
      if (!owns) return res.status(403).json({ error: 'Access denied' });

      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return res.json({ units: data });
    }

    // Student
    const enrolled = await studentEnrolled(classroomId, req.user.id);
    if (!enrolled) return res.status(403).json({ error: 'Access denied' });

    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('classroom_id', classroomId)
      .eq('is_visible', true)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Annotate each unit with whether it has any content (notes or personas)
    const unitIds = data.map(u => u.id);
    let hasContentSet = new Set();
    if (unitIds.length > 0) {
      const [notesRes, personasRes] = await Promise.all([
        supabase.from('notes').select('unit_id').in('unit_id', unitIds).not('content', 'is', null),
        supabase.from('personas').select('unit_id').in('unit_id', unitIds),
      ]);
      (notesRes.data || []).forEach(r => hasContentSet.add(r.unit_id));
      (personasRes.data || []).forEach(r => hasContentSet.add(r.unit_id));
    }

    const units = data.map(unit => ({ ...unit, has_content: hasContentSet.has(unit.id) }));
    res.json({ units });
  } catch (err) {
    next(err);
  }
});

// POST /api/classrooms/:classroomId/units
// Teacher only
router.post('/:classroomId/units', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { classroomId } = req.params;
    const { title, context, due_date } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });

    const owns = await teacherOwnsClassroom(classroomId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { data, error } = await supabase
      .from('units')
      .insert({ classroom_id: classroomId, title, context: context || null, due_date: due_date || null })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ unit: data });
  } catch (err) {
    next(err);
  }
});


// PATCH /api/units/reorder
router.patch('/reorder', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { order } = req.body; // [{ id, order_index }]
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' });

    await Promise.all(
      order.map(({ id, order_index }) =>
        supabase.from('units').update({ order_index }).eq('id', id)
      )
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});


// GET /api/units/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { data: unit, error } = await supabase
      .from('units')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !unit) return res.status(404).json({ error: 'Unit not found' });

    if (req.user.role === 'teacher') {
      const owns = await teacherOwnsClassroom(unit.classroom_id, req.user.id);
      if (!owns) return res.status(403).json({ error: 'Access denied' });
    } else {
      const enrolled = await studentEnrolled(unit.classroom_id, req.user.id);
      if (!enrolled || !unit.is_visible) return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ unit });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/units/:id
// Teacher only — update title, context, is_visible, due_date
router.patch('/:id', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { title, context, is_visible, due_date } = req.body;

    const { data: unit } = await supabase
      .from('units')
      .select('classroom_id')
      .eq('id', req.params.id)
      .single();

    if (!unit) return res.status(404).json({ error: 'Unit not found' });

    const owns = await teacherOwnsClassroom(unit.classroom_id, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const updates = {};
    if (title       !== undefined) updates.title      = title;
    if (context     !== undefined) updates.context    = context;
    if (is_visible  !== undefined) updates.is_visible = is_visible;
    if (due_date    !== undefined) updates.due_date   = due_date;

    const { data, error } = await supabase
      .from('units')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ unit: data });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/units/:id
// Teacher only
router.delete('/:id', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { data: unit } = await supabase
      .from('units')
      .select('classroom_id')
      .eq('id', req.params.id)
      .single();

    if (!unit) return res.status(404).json({ error: 'Unit not found' });

    const owns = await teacherOwnsClassroom(unit.classroom_id, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { error } = await supabase
      .from('units')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Unit deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;