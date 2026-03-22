const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const { generateTimeline } = require('../services/claude');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');

// ── Access helpers ────────────────────────────────────────────

async function teacherOwnsClassroom(classroomId, teacherId) {
  const { data } = await supabase
    .from('classrooms').select('id')
    .eq('id', classroomId).eq('teacher_id', teacherId).single();
  return !!data;
}

async function studentInClassroom(classroomId, studentId) {
  const { data } = await supabase
    .from('classroom_students').select('classroom_id')
    .eq('classroom_id', classroomId).eq('student_id', studentId).single();
  return !!data;
}

// ── GET /api/classrooms/:classroomId/timeline ─────────────────
// Returns timeline + all events. Both teacher and enrolled student.
router.get('/:classroomId/timeline', authenticate, async (req, res, next) => {
  try {
    const { classroomId } = req.params;

    if (req.user.role === 'teacher') {
      const owns = await teacherOwnsClassroom(classroomId, req.user.id);
      if (!owns) return res.status(403).json({ error: 'Access denied' });
    } else {
      const enrolled = await studentInClassroom(classroomId, req.user.id);
      if (!enrolled) return res.status(403).json({ error: 'Access denied' });
    }

    const { data: timeline, error: tErr } = await supabase
      .from('timelines').select('*').eq('classroom_id', classroomId).single();

    if (tErr && tErr.code !== 'PGRST116') throw tErr;
    if (!timeline) return res.json({ timeline: null });

    const { data: events, error: eErr } = await supabase
      .from('timeline_events').select('*')
      .eq('timeline_id', timeline.id)
      .order('date_sort', { ascending: true });

    if (eErr) throw eErr;

    res.json({ timeline: { ...timeline, events: events || [] } });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/classrooms/:classroomId/timeline/generate ───────
// AI-generate timeline events from all unit contexts. Teacher only.
router.post('/:classroomId/timeline/generate', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { classroomId } = req.params;

    const owns = await teacherOwnsClassroom(classroomId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    // Fetch classroom + all units with context
    const { data: classroom } = await supabase
      .from('classrooms').select('name').eq('id', classroomId).single();

    const { data: units } = await supabase
      .from('units').select('id, title, context')
      .eq('classroom_id', classroomId)
      .not('context', 'is', null);

    if (!units || units.length === 0) {
      return res.status(400).json({ error: 'Add context to at least one unit before generating a timeline.' });
    }

    const generated = await generateTimeline(classroom.name, units);

    // Upsert timeline row
    const { data: timeline, error: tErr } = await supabase
      .from('timelines')
      .upsert({ classroom_id: classroomId }, { onConflict: 'classroom_id' })
      .select().single();

    if (tErr) throw tErr;

    // Delete old events, insert new ones
    await supabase.from('timeline_events').delete().eq('timeline_id', timeline.id);

    const toInsert = generated.map((e, i) => {
      // Match unit_id by unit title
      const matchedUnit = units.find(u => u.title === e.unit_title);
      return {
        timeline_id: timeline.id,
        title:       e.title,
        date_label:  e.date_label,
        date_sort:   e.date_sort,
        description: e.description,
        category:    e.category || 'Politics',
        unit_id:     matchedUnit?.id || null,
        order_index: i,
      };
    });

    const { data: events, error: eErr } = await supabase
      .from('timeline_events').insert(toInsert).select();

    if (eErr) throw eErr;

    res.json({ timeline: { ...timeline, events: events || [] } });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/classrooms/:classroomId/timeline ─────────────────
// Save edited events (full replace). Teacher only.
router.put('/:classroomId/timeline', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { classroomId } = req.params;
    const { title, events = [] } = req.body;

    const owns = await teacherOwnsClassroom(classroomId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    // Upsert timeline
    const { data: timeline, error: tErr } = await supabase
      .from('timelines')
      .upsert(
        { classroom_id: classroomId, title: title || 'Historical Timeline', updated_at: new Date().toISOString() },
        { onConflict: 'classroom_id' }
      )
      .select().single();

    if (tErr) throw tErr;

    // Replace all events
    await supabase.from('timeline_events').delete().eq('timeline_id', timeline.id);

    if (events.length > 0) {
      const toInsert = events.map((e, i) => ({
        timeline_id: timeline.id,
        title:       e.title,
        date_label:  e.date_label,
        date_sort:   typeof e.date_sort === 'number' ? e.date_sort : parseInt(e.date_sort, 10) || 0,
        description: e.description || '',
        category:    e.category || 'Politics',
        unit_id:     e.unit_id || null,
        order_index: e.order_index ?? i,
      }));

      const { data: saved, error: eErr } = await supabase
        .from('timeline_events').insert(toInsert).select();

      if (eErr) throw eErr;

      return res.json({ timeline: { ...timeline, events: saved } });
    }

    res.json({ timeline: { ...timeline, events: [] } });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/classrooms/:classroomId/timeline/events/:eventId
// Update a single event. Teacher only.
router.patch('/:classroomId/timeline/events/:eventId', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { classroomId, eventId } = req.params;

    const owns = await teacherOwnsClassroom(classroomId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { title, date_label, date_sort, description, category } = req.body;
    const updates = {};
    if (title       !== undefined) updates.title       = title;
    if (date_label  !== undefined) updates.date_label  = date_label;
    if (date_sort   !== undefined) updates.date_sort   = date_sort;
    if (description !== undefined) updates.description = description;
    if (category    !== undefined) updates.category    = category;

    const { data: event, error } = await supabase
      .from('timeline_events')
      .update(updates).eq('id', eventId).select().single();

    if (error) throw error;
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/classrooms/:classroomId/timeline/events/:eventId
// Delete a single event. Teacher only.
router.delete('/:classroomId/timeline/events/:eventId', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { classroomId, eventId } = req.params;

    const owns = await teacherOwnsClassroom(classroomId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { error } = await supabase
      .from('timeline_events').delete().eq('id', eventId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;