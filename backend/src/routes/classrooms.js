const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// GET /api/classrooms
router.get('/', authenticate, async (req, res, next) => {
  try {
    if (req.user.role === 'teacher') {
      const { data, error } = await supabase
        .from('classrooms').select('*')
        .eq('teacher_id', req.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({ classrooms: data });
    }
    const { data, error } = await supabase
      .from('classroom_students')
      .select('joined_at, classrooms(*)')
      .eq('student_id', req.user.id)
      .order('joined_at', { ascending: false });
    if (error) throw error;
    res.json({ classrooms: data.map(row => ({ ...row.classrooms, joined_at: row.joined_at })) });
  } catch (err) { next(err); }
});

// POST /api/classrooms
router.post('/', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    let join_code, attempts = 0;
    while (attempts < 10) {
      const candidate = generateJoinCode();
      const { data: existing } = await supabase.from('classrooms').select('id').eq('join_code', candidate).single();
      if (!existing) { join_code = candidate; break; }
      attempts++;
    }
    if (!join_code) throw new Error('Failed to generate unique join code');
    const { data, error } = await supabase.from('classrooms')
      .insert({ name, teacher_id: req.user.id, join_code }).select().single();
    if (error) throw error;
    res.status(201).json({ classroom: data });
  } catch (err) { next(err); }
});

// POST /api/classrooms/join  ← MUST be before /:id
router.post('/join', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { join_code } = req.body;
    if (!join_code) return res.status(400).json({ error: 'join_code is required' });
    const { data: classroom, error: findError } = await supabase
      .from('classrooms').select('*').eq('join_code', join_code.toUpperCase()).single();
    if (findError || !classroom) return res.status(404).json({ error: 'Invalid join code' });
    const { data: existing } = await supabase.from('classroom_students').select('classroom_id')
      .eq('classroom_id', classroom.id).eq('student_id', req.user.id).single();
    if (existing) return res.status(409).json({ error: 'Already enrolled in this classroom' });
    const { error: joinError } = await supabase.from('classroom_students')
      .insert({ classroom_id: classroom.id, student_id: req.user.id });
    if (joinError) throw joinError;
    res.status(201).json({ message: 'Joined classroom successfully', classroom });
  } catch (err) { next(err); }
});

// GET /api/classrooms/:id/students  ← MUST be before /:id
router.get('/:id/students', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { data: classroom, error: classError } = await supabase
      .from('classrooms').select('id').eq('id', req.params.id).eq('teacher_id', req.user.id).single();
    if (classError || !classroom) return res.status(403).json({ error: 'Access denied' });
    const { data, error } = await supabase.from('classroom_students')
      .select('joined_at, profiles(id, display_name)')
      .eq('classroom_id', req.params.id).order('joined_at', { ascending: true });
    if (error) throw error;
    res.json({ students: data.map(row => ({ ...row.profiles, joined_at: row.joined_at })) });
  } catch (err) { next(err); }
});

// DELETE /api/classrooms/:id/students/:studentId  ← MUST be before /:id
// Deletes all student data in this classroom before removing enrollment.
router.delete('/:id/students/:studentId', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { id: classroomId, studentId } = req.params;

    const { data: classroom } = await supabase.from('classrooms').select('id')
      .eq('id', classroomId).eq('teacher_id', req.user.id).single();
    if (!classroom) return res.status(403).json({ error: 'Access denied' });

    // Get all units in this classroom
    const { data: units } = await supabase.from('units').select('id')
      .eq('classroom_id', classroomId);

    if (units && units.length > 0) {
      const unitIds = units.map(u => u.id);

      // Quiz submissions
      const { data: quizzes } = await supabase.from('quizzes').select('id').in('unit_id', unitIds);
      if (quizzes && quizzes.length > 0) {
        await supabase.from('quiz_submissions').delete()
          .in('quiz_id', quizzes.map(q => q.id))
          .eq('student_id', studentId);
      }

      // Assignment submissions
      const { data: assignments } = await supabase.from('assignments').select('id').in('unit_id', unitIds);
      if (assignments && assignments.length > 0) {
        await supabase.from('assignment_submissions').delete()
          .in('assignment_id', assignments.map(a => a.id))
          .eq('student_id', studentId);
      }

      // Persona conversations
      const { data: personas } = await supabase.from('personas').select('id').in('unit_id', unitIds);
      if (personas && personas.length > 0) {
        await supabase.from('conversations').delete()
          .in('persona_id', personas.map(p => p.id))
          .eq('student_id', studentId);
      }
    }

    // Remove from classroom
    const { error } = await supabase.from('classroom_students').delete()
      .eq('classroom_id', classroomId).eq('student_id', studentId);
    if (error) throw error;

    res.json({ message: 'Student removed and all data deleted.' });
  } catch (err) { next(err); }
});

// ── Performance helpers ───────────────────────────────────────

async function buildStudentPerformance(units, studentId) {
  const unitSummaries = await Promise.all(
    units.map(async (unit) => {
      const { data: quiz } = await supabase
        .from('quizzes').select('id').eq('unit_id', unit.id).single();

      const { data: assignment } = await supabase
        .from('assignments').select('id').eq('unit_id', unit.id).single();

      const [quizSub, assignmentSub] = await Promise.all([
        quiz
          ? supabase.from('quiz_submissions').select('score, submitted_at, answers, sa_feedback, essay_feedback, mc_results')
              .eq('quiz_id', quiz.id).eq('student_id', studentId).single()
              .then(r => r.data || null)
          : Promise.resolve(null),
        assignment
          ? supabase.from('assignment_submissions').select('score, submitted_at, answers, sa_feedback, essay_feedback, mc_results')
              .eq('assignment_id', assignment.id).eq('student_id', studentId).single()
              .then(r => r.data || null)
          : Promise.resolve(null),
      ]);

      return {
        unit_id:    unit.id,
        unit_title: unit.title,
        quiz: quizSub ? {
          score:          quizSub.score,
          submitted_at:   quizSub.submitted_at,
          has_essay:      Array.isArray(quizSub.essay_feedback) && quizSub.essay_feedback.length > 0,
          essay_feedback: quizSub.essay_feedback || null,
          sa_feedback:    quizSub.sa_feedback    || null,
          mc_results:     quizSub.mc_results     || null,
          answers:        quizSub.answers        || [],
        } : null,
        assignment: assignmentSub ? {
          score:          assignmentSub.score,
          submitted_at:   assignmentSub.submitted_at,
          has_essay:      Array.isArray(assignmentSub.essay_feedback) && assignmentSub.essay_feedback.length > 0,
          essay_feedback: assignmentSub.essay_feedback || null,
          sa_feedback:    assignmentSub.sa_feedback    || null,
          mc_results:     assignmentSub.mc_results     || null,
          answers:        assignmentSub.answers        || [],
        } : null,
      };
    })
  );

  const scores = unitSummaries.flatMap(u => [u.quiz?.score, u.assignment?.score]).filter(s => s !== null && s !== undefined);
  const overall = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return { overall, units: unitSummaries };
}

// GET /api/classrooms/:id/students/:studentId/performance
router.get('/:id/students/:studentId/performance', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { id: classroomId, studentId } = req.params;

    const { data: classroom } = await supabase.from('classrooms').select('id')
      .eq('id', classroomId).eq('teacher_id', req.user.id).single();
    if (!classroom) return res.status(403).json({ error: 'Access denied' });

    const { data: enrollment } = await supabase.from('classroom_students').select('student_id')
      .eq('classroom_id', classroomId).eq('student_id', studentId).single();
    if (!enrollment) return res.status(404).json({ error: 'Student not found in this classroom' });

    const { data: profile } = await supabase.from('profiles').select('id, display_name')
      .eq('id', studentId).single();

    const { data: units, error: uErr } = await supabase.from('units').select('id, title, order_index')
      .eq('classroom_id', classroomId).order('order_index', { ascending: true });
    if (uErr) throw uErr;

    const performance = await buildStudentPerformance(units, studentId);
    res.json({ student: profile, performance });
  } catch (err) { next(err); }
});

// GET /api/classrooms/:id/performance
router.get('/:id/performance', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { id: classroomId } = req.params;

    const { data: classroom } = await supabase.from('classrooms').select('id')
      .eq('id', classroomId).eq('teacher_id', req.user.id).single();
    if (!classroom) return res.status(403).json({ error: 'Access denied' });

    const { data: enrollments, error: eErr } = await supabase.from('classroom_students')
      .select('joined_at, profiles(id, display_name)')
      .eq('classroom_id', classroomId).order('joined_at', { ascending: true });
    if (eErr) throw eErr;

    const students = enrollments.map(row => ({ ...row.profiles, joined_at: row.joined_at }));

    const { data: units, error: uErr } = await supabase.from('units').select('id, title, order_index')
      .eq('classroom_id', classroomId).order('order_index', { ascending: true });
    if (uErr) throw uErr;

    const results = await Promise.all(
      students.map(async (student) => {
        const performance = await buildStudentPerformance(units, student.id);
        return { student, performance };
      })
    );

    res.json({ units: units.map(u => ({ id: u.id, title: u.title })), results });
  } catch (err) { next(err); }
});

// GET /api/classrooms/:id  ← LAST
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { data: classroom, error } = await supabase
      .from('classrooms').select('*').eq('id', req.params.id).single();
    if (error || !classroom) return res.status(404).json({ error: 'Classroom not found' });
    if (req.user.role === 'teacher' && classroom.teacher_id !== req.user.id)
      return res.status(403).json({ error: 'Access denied' });
    if (req.user.role === 'student') {
      const { data: enrollment } = await supabase.from('classroom_students').select('classroom_id')
        .eq('classroom_id', req.params.id).eq('student_id', req.user.id).single();
      if (!enrollment) return res.status(403).json({ error: 'Access denied' });
    }
    const { count } = await supabase.from('classroom_students')
      .select('*', { count: 'exact', head: true }).eq('classroom_id', req.params.id);
    res.json({ classroom: { ...classroom, student_count: count } });
  } catch (err) { next(err); }
});

// PATCH /api/classrooms/:id
router.patch('/:id', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { name } = req.body;
    const { data, error } = await supabase.from('classrooms').update({ name })
      .eq('id', req.params.id).eq('teacher_id', req.user.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Classroom not found' });
    res.json({ classroom: data });
  } catch (err) { next(err); }
});

// DELETE /api/classrooms/:id
router.delete('/:id', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { error } = await supabase.from('classrooms').delete()
      .eq('id', req.params.id).eq('teacher_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Classroom deleted' });
  } catch (err) { next(err); }
});

module.exports = router;