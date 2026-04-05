const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { generateStudentDashboardPriorities } = require('../services/claude');
const { getUserSettings, buildStudentAiInstruction } = require('../services/userSettings');

function buildDashboardPrioritiesFallback(studentName, items, classrooms) {
  const pendingItems = (items || [])
    .filter((item) => !item.submitted)
    .sort((a, b) => {
      const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
      return aDue - bDue;
    });

  const submittedItems = (items || [])
    .filter((item) => item.submitted && item.score !== null && item.score !== undefined)
    .sort((a, b) => new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime());

  const nextItem = pendingItems[0] || null;
  const recentScore = submittedItems[0] || null;

  if ((classrooms || []).length === 0) {
    return {
      headline: 'Your dashboard will personalize itself once you join a class.',
      focus_title: 'Get into a classroom',
      focus_reason: 'Use a class code from your teacher so your notes, personas, quizzes, and assignments can show up here.',
      priority_items: [
        {
          title: 'Join your first class',
          detail: 'After you join, your work queue and AI study priorities will update automatically.',
        },
      ],
      watch_out: 'No classes are connected yet, so there is no active coursework to prioritize.',
    };
  }

  if (!nextItem) {
    return {
      headline: studentName
        ? `${studentName}, you are caught up right now.`
        : 'You are caught up right now.',
      focus_title: 'Stay sharp',
      focus_reason: recentScore
        ? `Your latest graded work was ${recentScore.name} in ${recentScore.classroom_name}. Use notes or persona conversations to keep the material fresh.`
        : 'Use notes and persona conversations to keep the unit ideas fresh while you wait for new work.',
      priority_items: [
        {
          title: 'Review one recent unit',
          detail: 'A short notes review now will make the next quiz or assignment easier when it appears.',
        },
      ],
      watch_out: 'Nothing is overdue, but staying familiar with key ideas will help you move faster when new work appears.',
    };
  }

  const additionalPriorities = pendingItems.slice(1, 3).map((item) => ({
    title: `Then ${item.name}`,
    detail: `${item.classroom_name} · ${item.unit_title}${item.due_date ? ` · due ${item.due_date}` : ''}`,
  }));

  return {
    headline: `Start with ${nextItem.name} first.`,
    focus_title: nextItem.name,
    focus_reason: `${nextItem.classroom_name} · ${nextItem.unit_title}${nextItem.due_date ? ` · due ${nextItem.due_date}` : ''}`,
    priority_items: [
      {
        title: `Open this ${nextItem.type}`,
        detail: 'It is the most urgent unfinished item on your dashboard.',
      },
      ...additionalPriorities,
    ],
    watch_out: recentScore && recentScore.score < 70
      ? `Your recent score on ${recentScore.name} suggests you should slow down and review that unit's notes before your next assessment.`
      : 'Do not let your most urgent task sit too long, or the rest of the week will stack up behind it.',
  };
}

async function getStudentDashboardData(studentId) {
  // 1. Enrolled classrooms
  const { data: enrollments, error: eErr } = await supabase
    .from('classroom_students')
    .select('joined_at, classrooms(id, name)')
    .eq('student_id', studentId)
    .order('joined_at', { ascending: false });

  if (eErr) throw eErr;
  if (!enrollments || enrollments.length === 0) {
    return { items: [], classrooms: [] };
  }

  const classrooms = enrollments.map((row) => ({
    ...row.classrooms,
    joined_at: row.joined_at,
  }));
  const classroomIds = classrooms.map((classroom) => classroom.id);

  // 2. Visible units
  const { data: units, error: uErr } = await supabase
    .from('units')
    .select('id, title, classroom_id')
    .in('classroom_id', classroomIds)
    .eq('is_visible', true);

  if (uErr) throw uErr;
  if (!units || units.length === 0) {
    return { items: [], classrooms };
  }

  const unitIds = units.map((unit) => unit.id);

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

  const assignmentIds = (assignments || []).map((assignment) => assignment.id);
  const quizIds = (quizzes || []).map((quiz) => quiz.id);

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
  for (const unit of units) unitMap[unit.id] = unit;

  const classroomMap = {};
  for (const classroom of classrooms) classroomMap[classroom.id] = classroom;

  const assignmentSubmissionMap = {};
  for (const submission of aSubmissions || []) {
    assignmentSubmissionMap[submission.assignment_id] = submission;
  }

  const quizSubmissionMap = {};
  for (const submission of qSubmissions || []) {
    quizSubmissionMap[submission.quiz_id] = submission;
  }

  // 6. Assemble combined items list
  const items = [];

  for (const assignment of assignments || []) {
    const unit = unitMap[assignment.unit_id] || {};
    const classroom = classroomMap[unit.classroom_id] || {};
    const submission = assignmentSubmissionMap[assignment.id] || null;
    items.push({
      id: assignment.id,
      type: 'assignment',
      name: assignment.name,
      due_date: assignment.due_date,
      created_at: assignment.created_at,
      unit_id: assignment.unit_id,
      unit_title: unit.title || '',
      classroom_id: classroom.id || '',
      classroom_name: classroom.name || '',
      submitted: !!submission,
      score: submission?.score ?? null,
      submitted_at: submission?.submitted_at ?? null,
    });
  }

  for (const quiz of quizzes || []) {
    const unit = unitMap[quiz.unit_id] || {};
    const classroom = classroomMap[unit.classroom_id] || {};
    const submission = quizSubmissionMap[quiz.id] || null;
    items.push({
      id: quiz.id,
      type: 'quiz',
      name: quiz.name,
      due_date: quiz.due_date,
      created_at: quiz.created_at,
      unit_id: quiz.unit_id,
      unit_title: unit.title || '',
      classroom_id: classroom.id || '',
      classroom_name: classroom.name || '',
      submitted: !!submission,
      score: submission?.score ?? null,
      submitted_at: submission?.submitted_at ?? null,
    });
  }

  return { items, classrooms };
}

router.get('/dashboard/priorities', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { items, classrooms } = await getStudentDashboardData(studentId);
    const settings = await getUserSettings(studentId, req.user.role);

    try {
      const priorities = await generateStudentDashboardPriorities(
        req.user.display_name || '',
        items,
        classrooms,
        buildStudentAiInstruction(settings),
      );
      return res.json({ priorities });
    } catch {
      const priorities = buildDashboardPrioritiesFallback(req.user.display_name || '', items, classrooms);
      return res.json({ priorities, fallback: true });
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/student/classrooms/:classroomId/scores
// Returns the student's own graded submissions for a specific classroom, sorted by date
router.get('/classrooms/:classroomId/scores', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { classroomId } = req.params;

    // Verify enrolled
    const { data: enrollment } = await supabase
      .from('classroom_students')
      .select('classroom_id')
      .eq('classroom_id', classroomId)
      .eq('student_id', studentId)
      .single();
    if (!enrollment) return res.status(403).json({ error: 'Access denied' });

    // Get all visible units in this classroom
    const { data: units } = await supabase
      .from('units')
      .select('id')
      .eq('classroom_id', classroomId)
      .eq('is_visible', true);

    const unitIds = (units || []).map(u => u.id);
    if (unitIds.length === 0) return res.json({ scores: [] });

    // Get quizzes and assignments for those units
    const [{ data: quizzes }, { data: assignments }] = await Promise.all([
      supabase.from('quizzes').select('id').in('unit_id', unitIds),
      supabase.from('assignments').select('id').in('unit_id', unitIds),
    ]);

    const quizIds = (quizzes || []).map(q => q.id);
    const assignmentIds = (assignments || []).map(a => a.id);

    // Get graded submissions
    const [{ data: qSubs }, { data: aSubs }] = await Promise.all([
      quizIds.length
        ? supabase.from('quiz_submissions').select('score, submitted_at').eq('student_id', studentId).in('quiz_id', quizIds).not('score', 'is', null)
        : Promise.resolve({ data: [] }),
      assignmentIds.length
        ? supabase.from('assignment_submissions').select('score, submitted_at').eq('student_id', studentId).in('assignment_id', assignmentIds).not('score', 'is', null)
        : Promise.resolve({ data: [] }),
    ]);

    const scores = [...(qSubs || []), ...(aSubs || [])]
      .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));

    res.json({ scores });
  } catch (err) {
    next(err);
  }
});

// GET /api/student/dashboard
// Returns all assignments + quizzes across enrolled classrooms with submission status
router.get('/dashboard', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { items, classrooms } = await getStudentDashboardData(studentId);
    res.json({ items, classrooms });
  } catch (err) { next(err); }
});

module.exports = router;
