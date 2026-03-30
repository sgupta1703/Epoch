const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');

// GET /api/profile/stats
// Returns academic stats for the current student
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Enrolled classrooms
    const { data: enrollments, error: eErr } = await supabase
      .from('classroom_students')
      .select('classroom_id, joined_at')
      .eq('student_id', userId);

    if (eErr) throw eErr;

    const classroomIds = (enrollments || []).map(e => e.classroom_id);
    const memberSince = enrollments?.length
      ? enrollments.reduce((min, e) => (e.joined_at < min ? e.joined_at : min), enrollments[0].joined_at)
      : null;

    if (!classroomIds.length) {
      return res.json({
        classes_enrolled: 0,
        assignments_submitted: 0,
        quizzes_submitted: 0,
        avg_score: null,
        member_since: req.user.created_at || null,
      });
    }

    // Get units in enrolled classrooms
    const { data: units, error: uErr } = await supabase
      .from('units')
      .select('id')
      .in('classroom_id', classroomIds);

    if (uErr) throw uErr;
    const unitIds = (units || []).map(u => u.id);

    if (!unitIds.length) {
      return res.json({
        classes_enrolled: classroomIds.length,
        assignments_submitted: 0,
        quizzes_submitted: 0,
        avg_score: null,
        member_since: memberSince || req.user.created_at || null,
      });
    }

    // Get all assignments and quizzes in those units
    const [
      { data: assignments, error: aErr },
      { data: quizzes, error: qErr },
    ] = await Promise.all([
      supabase.from('assignments').select('id').in('unit_id', unitIds),
      supabase.from('quizzes').select('id').in('unit_id', unitIds),
    ]);

    if (aErr) throw aErr;
    if (qErr) throw qErr;

    const assignmentIds = (assignments || []).map(a => a.id);
    const quizIds = (quizzes || []).map(q => q.id);

    // Submissions
    const [
      { data: aSubs, error: asErr },
      { data: qSubs, error: qsErr },
    ] = await Promise.all([
      assignmentIds.length
        ? supabase
            .from('assignment_submissions')
            .select('score')
            .eq('student_id', userId)
            .in('assignment_id', assignmentIds)
        : Promise.resolve({ data: [], error: null }),
      quizIds.length
        ? supabase
            .from('quiz_submissions')
            .select('score')
            .eq('student_id', userId)
            .in('quiz_id', quizIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (asErr) throw asErr;
    if (qsErr) throw qsErr;

    const allScores = [
      ...(aSubs || []).map(s => s.score),
      ...(qSubs || []).map(s => s.score),
    ].filter(s => s !== null && s !== undefined);

    const avgScore = allScores.length
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : null;

    res.json({
      classes_enrolled: classroomIds.length,
      assignments_submitted: (aSubs || []).length,
      quizzes_submitted: (qSubs || []).length,
      avg_score: avgScore,
      member_since: memberSince || req.user.created_at || null,
    });
  } catch (err) { next(err); }
});

async function buildTeacherClassSummary(classroom) {
  const [{ count: studentCount, error: studentErr }, { data: units, error: unitErr }] = await Promise.all([
    supabase
      .from('classroom_students')
      .select('*', { count: 'exact', head: true })
      .eq('classroom_id', classroom.id),
    supabase
      .from('units')
      .select('id, is_visible')
      .eq('classroom_id', classroom.id),
  ]);

  if (studentErr) throw studentErr;
  if (unitErr) throw unitErr;

  const unitIds = (units || []).map(unit => unit.id);
  let assignmentIds = [];
  let quizIds = [];

  if (unitIds.length) {
    const [{ data: assignments, error: assignmentErr }, { data: quizzes, error: quizErr }] = await Promise.all([
      supabase.from('assignments').select('id').in('unit_id', unitIds),
      supabase.from('quizzes').select('id').in('unit_id', unitIds),
    ]);

    if (assignmentErr) throw assignmentErr;
    if (quizErr) throw quizErr;

    assignmentIds = (assignments || []).map(assignment => assignment.id);
    quizIds = (quizzes || []).map(quiz => quiz.id);
  }

  const [{ data: assignmentSubs, error: assignmentSubErr }, { data: quizSubs, error: quizSubErr }] = await Promise.all([
    assignmentIds.length
      ? supabase.from('assignment_submissions').select('score').in('assignment_id', assignmentIds)
      : Promise.resolve({ data: [], error: null }),
    quizIds.length
      ? supabase.from('quiz_submissions').select('score').in('quiz_id', quizIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (assignmentSubErr) throw assignmentSubErr;
  if (quizSubErr) throw quizSubErr;

  const allScores = [
    ...(assignmentSubs || []).map(submission => submission.score),
    ...(quizSubs || []).map(submission => submission.score),
  ].filter(score => score !== null && score !== undefined);

  return {
    ...classroom,
    student_count: studentCount || 0,
    unit_count: units?.length || 0,
    published_unit_count: (units || []).filter(unit => unit.is_visible).length,
    avg_score: allScores.length
      ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
      : null,
  };
}

// GET /api/profile/teacher/stats
router.get('/teacher/stats', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const teacherId = req.user.id;

    const { data: classrooms, error: classroomErr } = await supabase
      .from('classrooms')
      .select('id')
      .eq('teacher_id', teacherId);

    if (classroomErr) throw classroomErr;

    const classroomIds = (classrooms || []).map(classroom => classroom.id);

    if (!classroomIds.length) {
      return res.json({
        total_classes: 0,
        total_students: 0,
        total_units: 0,
        total_published_units: 0,
        total_assignments: 0,
        total_quizzes: 0,
        graded_submissions: 0,
      });
    }

    const [{ count: totalStudents, error: studentErr }, { data: units, error: unitErr }] = await Promise.all([
      supabase
        .from('classroom_students')
        .select('*', { count: 'exact', head: true })
        .in('classroom_id', classroomIds),
      supabase
        .from('units')
        .select('id, is_visible')
        .in('classroom_id', classroomIds),
    ]);

    if (studentErr) throw studentErr;
    if (unitErr) throw unitErr;

    const unitIds = (units || []).map(unit => unit.id);
    let assignments = [];
    let quizzes = [];
    let totalAssignmentSubs = 0;
    let totalQuizSubs = 0;

    if (unitIds.length) {
      const [{ data: assignmentRows, error: assignmentErr }, { data: quizRows, error: quizErr }] = await Promise.all([
        supabase.from('assignments').select('id').in('unit_id', unitIds),
        supabase.from('quizzes').select('id').in('unit_id', unitIds),
      ]);

      if (assignmentErr) throw assignmentErr;
      if (quizErr) throw quizErr;

      assignments = assignmentRows || [];
      quizzes = quizRows || [];

      const assignmentIds = assignments.map(assignment => assignment.id);
      const quizIds = quizzes.map(quiz => quiz.id);

      const [{ count: assignmentCount, error: assignmentSubErr }, { count: quizCount, error: quizSubErr }] = await Promise.all([
        assignmentIds.length
          ? supabase.from('assignment_submissions').select('*', { count: 'exact', head: true }).in('assignment_id', assignmentIds)
          : Promise.resolve({ count: 0, error: null }),
        quizIds.length
          ? supabase.from('quiz_submissions').select('*', { count: 'exact', head: true }).in('quiz_id', quizIds)
          : Promise.resolve({ count: 0, error: null }),
      ]);

      if (assignmentSubErr) throw assignmentSubErr;
      if (quizSubErr) throw quizSubErr;

      totalAssignmentSubs = assignmentCount || 0;
      totalQuizSubs = quizCount || 0;
    }

    res.json({
      total_classes: classroomIds.length,
      total_students: totalStudents || 0,
      total_units: units?.length || 0,
      total_published_units: (units || []).filter(unit => unit.is_visible).length,
      total_assignments: assignments.length,
      total_quizzes: quizzes.length,
      graded_submissions: totalAssignmentSubs + totalQuizSubs,
    });
  } catch (err) { next(err); }
});

// GET /api/profile/teacher/classes
router.get('/teacher/classes', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { data: classrooms, error } = await supabase
      .from('classrooms')
      .select('id, name, join_code, created_at')
      .eq('teacher_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const classes = await Promise.all((classrooms || []).map(buildTeacherClassSummary));
    res.json({ classes });
  } catch (err) { next(err); }
});

// GET /api/profile/classes
// Returns enrolled classes with basic info
router.get('/classes', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('classroom_students')
      .select('joined_at, classrooms(id, name, join_code)')
      .eq('student_id', userId)
      .order('joined_at', { ascending: false });

    if (error) throw error;

    const classes = (data || []).map(row => ({
      id: row.classrooms.id,
      name: row.classrooms.name,
      join_code: row.classrooms.join_code,
      joined_at: row.joined_at,
    }));

    res.json({ classes });
  } catch (err) { next(err); }
});

// PATCH /api/profile/teacher/classes/:classroomId
router.patch('/teacher/classes/:classroomId', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { classroomId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const { data, error } = await supabase
      .from('classrooms')
      .update({ name: name.trim() })
      .eq('id', classroomId)
      .eq('teacher_id', req.user.id)
      .select('id, name, join_code, created_at')
      .single();

    if (error || !data) return res.status(404).json({ error: 'Classroom not found' });

    const classroom = await buildTeacherClassSummary(data);
    res.json({ classroom });
  } catch (err) { next(err); }
});

// PUT /api/profile
// Update display_name and/or email
router.put('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { display_name, email } = req.body;

    if (!display_name && !email) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    // Update profile table
    const profileUpdate = {};
    if (display_name) profileUpdate.display_name = display_name.trim();
    if (email) profileUpdate.email = email.trim().toLowerCase();

    const { error: profileErr } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId);

    if (profileErr) throw profileErr;

    // Also update Supabase auth user if email changed
    if (email) {
      const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
        email: email.trim().toLowerCase(),
      });
      if (authErr) throw authErr;
    }

    // Update user_metadata display_name
    if (display_name) {
      const { error: metaErr } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { display_name: display_name.trim() },
      });
      if (metaErr) throw metaErr;
    }

    // Return updated profile
    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchErr) throw fetchErr;

    res.json({ user: profile });
  } catch (err) { next(err); }
});

// PUT /api/profile/password
// Change password (requires current password verification)
router.put('/password', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Verify current password by attempting sign-in
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: current_password,
    });

    if (signInErr) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update password
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      password: new_password,
    });

    if (updateErr) throw updateErr;

    res.json({ message: 'Password updated successfully' });
  } catch (err) { next(err); }
});

// DELETE /api/profile/teacher/classes/:classroomId
router.delete('/teacher/classes/:classroomId', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { classroomId } = req.params;

    const { error } = await supabase
      .from('classrooms')
      .delete()
      .eq('id', classroomId)
      .eq('teacher_id', req.user.id);

    if (error) throw error;

    res.json({ message: 'Classroom deleted' });
  } catch (err) { next(err); }
});

// DELETE /api/profile/classes/:classroomId
// Leave a classroom
router.delete('/classes/:classroomId', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { classroomId } = req.params;

    const { error } = await supabase
      .from('classroom_students')
      .delete()
      .eq('student_id', userId)
      .eq('classroom_id', classroomId);

    if (error) throw error;

    res.json({ message: 'Left classroom successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
