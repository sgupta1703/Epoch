const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');

// GET /api/student/dashboard
// Returns all assignments + quizzes across enrolled classrooms with submission status
router.get('/dashboard', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const studentId = req.user.id;

    // 1. Enrolled classrooms
    const { data: enrollments, error: eErr } = await supabase
      .from('classroom_students')
      .select('joined_at, classrooms(id, name)')
      .eq('student_id', studentId)
      .order('joined_at', { ascending: false });

    if (eErr) throw eErr;
    if (!enrollments || enrollments.length === 0) {
      return res.json({ items: [], classrooms: [] });
    }

    const classrooms = enrollments.map(row => ({
      ...row.classrooms,
      joined_at: row.joined_at,
    }));
    const classroomIds = classrooms.map(c => c.id);

    // 2. Visible units
    const { data: units, error: uErr } = await supabase
      .from('units')
      .select('id, title, classroom_id')
      .in('classroom_id', classroomIds)
      .eq('is_visible', true);

    if (uErr) throw uErr;
    if (!units || units.length === 0) {
      return res.json({ items: [], classrooms });
    }

    const unitIds = units.map(u => u.id);

    // 3. Assignments + quizzes in parallel
    const [
      { data: assignments, error: aErr },
      { data: quizzes, error: qErr },
    ] = await Promise.all([
      supabase
        .from('assignments')
        .select('id, name, due_date, unit_id, created_at')
        .in('unit_id', unitIds),
      supabase
        .from('quizzes')
        .select('id, name, due_date, unit_id, created_at')
        .in('unit_id', unitIds),
    ]);

    if (aErr) throw aErr;
    if (qErr) throw qErr;

    const assignmentIds = (assignments || []).map(a => a.id);
    const quizIds       = (quizzes     || []).map(q => q.id);

    // 4. Submission status in parallel
    const [
      { data: aSubmissions, error: asErr },
      { data: qSubmissions, error: qsErr },
    ] = await Promise.all([
      assignmentIds.length
        ? supabase
            .from('assignment_submissions')
            .select('assignment_id, score, submitted_at')
            .eq('student_id', studentId)
            .in('assignment_id', assignmentIds)
        : Promise.resolve({ data: [], error: null }),
      quizIds.length
        ? supabase
            .from('quiz_submissions')
            .select('quiz_id, score, submitted_at')
            .eq('student_id', studentId)
            .in('quiz_id', quizIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (asErr) throw asErr;
    if (qsErr) throw qsErr;

    // 5. Lookup maps
    const unitMap = {};
    for (const u of units) unitMap[u.id] = u;

    const classroomMap = {};
    for (const c of classrooms) classroomMap[c.id] = c;

    const aSubMap = {};
    for (const s of aSubmissions || []) aSubMap[s.assignment_id] = s;

    const qSubMap = {};
    for (const s of qSubmissions || []) qSubMap[s.quiz_id] = s;

    // 6. Assemble combined items list
    const items = [];

    for (const a of assignments || []) {
      const unit      = unitMap[a.unit_id]            || {};
      const classroom = classroomMap[unit.classroom_id] || {};
      const sub       = aSubMap[a.id]                 || null;
      items.push({
        id:             a.id,
        type:           'assignment',
        name:           a.name,
        due_date:       a.due_date,
        created_at:     a.created_at,
        unit_id:        a.unit_id,
        unit_title:     unit.title     || '',
        classroom_id:   classroom.id   || '',
        classroom_name: classroom.name || '',
        submitted:      !!sub,
        score:          sub?.score          ?? null,
        submitted_at:   sub?.submitted_at   ?? null,
      });
    }

    for (const q of quizzes || []) {
      const unit      = unitMap[q.unit_id]            || {};
      const classroom = classroomMap[unit.classroom_id] || {};
      const sub       = qSubMap[q.id]                 || null;
      items.push({
        id:             q.id,
        type:           'quiz',
        name:           q.name,
        due_date:       q.due_date,
        created_at:     q.created_at,
        unit_id:        q.unit_id,
        unit_title:     unit.title     || '',
        classroom_id:   classroom.id   || '',
        classroom_name: classroom.name || '',
        submitted:      !!sub,
        score:          sub?.score          ?? null,
        submitted_at:   sub?.submitted_at   ?? null,
      });
    }

    res.json({ items, classrooms });
  } catch (err) { next(err); }
});

module.exports = router;
