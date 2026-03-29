const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const { generateAssignmentContent, gradeShortAnswer, gradeEssay } = require('../services/claude');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { getUserSettings, buildTeacherAiInstruction, buildStudentAiInstruction } = require('../services/userSettings');

async function teacherOwnsUnit(unitId, teacherId) {
  const { data: unit } = await supabase
    .from('units').select('classroom_id').eq('id', unitId).single();
  if (!unit) return false;
  const { data: classroom } = await supabase
    .from('classrooms').select('id')
    .eq('id', unit.classroom_id).eq('teacher_id', teacherId).single();
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

function normalizeMcAnswer(answer) {
  return String(answer || '').trim().replace(/^[A-Z]\)\s*/i, '').replace(/^[A-Z][.: -]+\s*/i, '').replace(/\s+/g, ' ').toLowerCase();
}

function isMatchingMcAnswer(studentAnswer, correctAnswer) {
  return normalizeMcAnswer(studentAnswer) !== '' && normalizeMcAnswer(studentAnswer) === normalizeMcAnswer(correctAnswer);
}

// ─── LIST ──────────────────────────────────────────────────────────────────────

// GET /api/units/:unitId/assignments
router.get('/:unitId/assignments', authenticate, async (req, res, next) => {
  try {
    const { unitId } = req.params;

    if (req.user.role === 'teacher') {
      const owns = await teacherOwnsUnit(unitId, req.user.id);
      if (!owns) return res.status(403).json({ error: 'Access denied' });
    } else {
      const canAccess = await studentCanAccessUnit(unitId, req.user.id);
      if (!canAccess) return res.status(403).json({ error: 'Access denied' });
    }

    const { data: assignments, error } = await supabase
      .from('assignments')
      .select('id, name, due_date, essay_guide_enabled, created_at')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // attach question + source counts
    const withCounts = await Promise.all((assignments || []).map(async a => {
      const [{ count: qCount }, { count: sCount }] = await Promise.all([
        supabase.from('assignment_questions').select('id', { count: 'exact', head: true }).eq('assignment_id', a.id),
        supabase.from('assignment_sources').select('id', { count: 'exact', head: true }).eq('assignment_id', a.id),
      ]);
      return { ...a, question_count: qCount || 0, source_count: sCount || 0 };
    }));

    res.json({ assignments: withCounts });
  } catch (err) { next(err); }
});

// ─── CREATE ────────────────────────────────────────────────────────────────────

// POST /api/units/:unitId/assignments
router.post('/:unitId/assignments', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId } = req.params;
    const { name, due_date } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Assignment name is required' });

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert({ unit_id: unitId, name: name.trim(), due_date: due_date || null })
      .select().single();

    if (error) throw error;
    res.status(201).json({ assignment });
  } catch (err) { next(err); }
});

// ─── GET SINGLE ────────────────────────────────────────────────────────────────

// GET /api/units/:unitId/assignments/:assignmentId
router.get('/:unitId/assignments/:assignmentId', authenticate, async (req, res, next) => {
  try {
    const { unitId, assignmentId } = req.params;

    if (req.user.role === 'teacher') {
      const owns = await teacherOwnsUnit(unitId, req.user.id);
      if (!owns) return res.status(403).json({ error: 'Access denied' });
    } else {
      const canAccess = await studentCanAccessUnit(unitId, req.user.id);
      if (!canAccess) return res.status(403).json({ error: 'Access denied' });
    }

    const { data: assignment, error: aErr } = await supabase
      .from('assignments').select('*').eq('id', assignmentId).eq('unit_id', unitId).single();

    if (aErr && aErr.code !== 'PGRST116') throw aErr;
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const [{ data: sources, error: sErr }, { data: questions, error: qErr }] = await Promise.all([
      supabase.from('assignment_sources').select('*').eq('assignment_id', assignmentId).order('order_index', { ascending: true }),
      supabase.from('assignment_questions').select('*').eq('assignment_id', assignmentId).order('order_index', { ascending: true }),
    ]);

    if (sErr) throw sErr;
    if (qErr) throw qErr;

    const safeQuestions = req.user.role === 'student'
      ? questions.map(({ correct_answer, ...q }) => q)
      : questions;

    res.json({ assignment: { ...assignment, sources, questions: safeQuestions } });
  } catch (err) { next(err); }
});

// ─── GENERATE ──────────────────────────────────────────────────────────────────

// POST /api/units/:unitId/assignments/:assignmentId/generate
router.post('/:unitId/assignments/:assignmentId/generate', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId, assignmentId } = req.params;
    const { source_count = 2, question_count = 4 } = req.body;

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { data: unit } = await supabase
      .from('units').select('title, context').eq('id', unitId).single();

    if (!unit?.context) {
      return res.status(400).json({ error: 'Unit must have context set before generating an assignment.' });
    }

    const settings = await getUserSettings(req.user.id, req.user.role);
    const generated = await generateAssignmentContent(
      unit.title,
      unit.context,
      source_count,
      question_count,
      buildTeacherAiInstruction(settings),
    );

    await Promise.all([
      supabase.from('assignment_sources').delete().eq('assignment_id', assignmentId),
      supabase.from('assignment_questions').delete().eq('assignment_id', assignmentId),
    ]);

    const [{ data: sources, error: sErr }, { data: questions, error: qErr }] = await Promise.all([
      supabase.from('assignment_sources').insert(
        generated.sources.map((s, i) => ({
          assignment_id: assignmentId,
          title:        s.title,
          content:      s.content,
          source_type:  s.source_type,
          format:       s.format || 'ai_generated',
          order_index:  i,
        }))
      ).select(),
      supabase.from('assignment_questions').insert(
        generated.questions.map((q, i) => ({
          assignment_id:  assignmentId,
          question_text:  q.question_text,
          type:           q.type,
          options:        q.options || null,
          correct_answer: q.correct_answer,
          order_index:    i,
        }))
      ).select(),
    ]);

    if (sErr) throw sErr;
    if (qErr) throw qErr;

    const { data: assignment } = await supabase.from('assignments').select('*').eq('id', assignmentId).single();
    res.json({ assignment: { ...assignment, sources, questions } });
  } catch (err) { next(err); }
});

// ─── SAVE / UPDATE ─────────────────────────────────────────────────────────────

// PUT /api/units/:unitId/assignments/:assignmentId
router.put('/:unitId/assignments/:assignmentId', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId, assignmentId } = req.params;
    const { sources = [], questions = [], due_date, essay_guide_enabled, name } = req.body;

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const updateFields = {
      due_date:            due_date || null,
      essay_guide_enabled: essay_guide_enabled ?? true,
    };
    if (name?.trim()) updateFields.name = name.trim();

    const { data: assignment, error: aErr } = await supabase
      .from('assignments')
      .update(updateFields)
      .eq('id', assignmentId).eq('unit_id', unitId)
      .select().single();

    if (aErr) throw aErr;

    await Promise.all([
      supabase.from('assignment_sources').delete().eq('assignment_id', assignmentId),
      supabase.from('assignment_questions').delete().eq('assignment_id', assignmentId),
    ]);

    const inserts = [];

    if (sources.length > 0) {
      inserts.push(
        supabase.from('assignment_sources').insert(
          sources.map((s, i) => ({
            assignment_id: assignmentId,
            title:        s.title,
            content:      s.content,
            source_type:  s.source_type || 'primary',
            format:       s.format || 'real',
            order_index:  s.order_index ?? i,
            image_url:    s.image_url || null,
          }))
        ).select()
      );
    }

    if (questions.length > 0) {
      inserts.push(
        supabase.from('assignment_questions').insert(
          questions.map((q, i) => ({
            assignment_id:  assignmentId,
            question_text:  q.question_text,
            type:           q.type,
            options:        q.options || null,
            correct_answer: q.correct_answer,
            order_index:    q.order_index ?? i,
            image_url:      q.image_url || null,
          }))
        ).select()
      );
    }

    const results = await Promise.all(inserts);
    for (const { error } of results) { if (error) throw error; }

    const savedSources   = sources.length   > 0 ? results[0].data : [];
    const savedQuestions = questions.length > 0 ? results[sources.length > 0 ? 1 : 0]?.data || [] : [];

    res.json({ assignment: { ...assignment, sources: savedSources, questions: savedQuestions } });
  } catch (err) { next(err); }
});

// ─── DELETE ────────────────────────────────────────────────────────────────────

// DELETE /api/units/:unitId/assignments/:assignmentId
router.delete('/:unitId/assignments/:assignmentId', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId, assignmentId } = req.params;

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    await Promise.all([
      supabase.from('assignment_sources').delete().eq('assignment_id', assignmentId),
      supabase.from('assignment_questions').delete().eq('assignment_id', assignmentId),
      supabase.from('assignment_submissions').delete().eq('assignment_id', assignmentId),
    ]);

    const { error } = await supabase.from('assignments').delete().eq('id', assignmentId).eq('unit_id', unitId);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── SUBMIT ────────────────────────────────────────────────────────────────────

// POST /api/units/:unitId/assignments/:assignmentId/submit
router.post('/:unitId/assignments/:assignmentId/submit', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { unitId, assignmentId } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers array is required' });

    const canAccess = await studentCanAccessUnit(unitId, req.user.id);
    if (!canAccess) return res.status(403).json({ error: 'Access denied' });

    const { data: assignment } = await supabase
      .from('assignments').select('id').eq('id', assignmentId).eq('unit_id', unitId).single();
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const { data: existing } = await supabase
      .from('assignment_submissions').select('id')
      .eq('assignment_id', assignmentId).eq('student_id', req.user.id).single();
    if (existing) return res.status(409).json({ error: 'Assignment already submitted' });

    const { data: questions } = await supabase
      .from('assignment_questions').select('id, type, question_text, correct_answer')
      .eq('assignment_id', assignmentId);
    const studentSettings = await getUserSettings(req.user.id, req.user.role);
    const aiInstruction = buildStudentAiInstruction(studentSettings);

    const mcQuestions = questions.filter(q => q.type === 'multiple_choice');
    let mcCorrect = 0;
    mcQuestions.forEach(q => {
      const a = answers.find(a => a.question_id === q.id);
      if (isMatchingMcAnswer(a?.answer, q.correct_answer)) mcCorrect++;
    });

    const mcResults = mcQuestions.map(q => {
      const a = answers.find(a => a.question_id === q.id);
      return { question_id: q.id, correct: isMatchingMcAnswer(a?.answer, q.correct_answer), correct_answer: q.correct_answer };
    });

    const saQuestions = questions.filter(q => q.type === 'short_answer');
    let saFeedback = [];

    if (saQuestions.length > 0) {
      saFeedback = await Promise.all(
        saQuestions.map(async (q) => {
          const studentAnswer = answers.find(a => a.question_id === q.id);
          if (!studentAnswer?.answer?.trim()) return { question_id: q.id, score: 0, feedback: 'No answer provided.' };
          try {
            const { score, feedback } = await gradeShortAnswer(q.question_text, q.correct_answer, studentAnswer.answer, aiInstruction);
            return { question_id: q.id, score, feedback };
          } catch (e) {
            console.error('gradeShortAnswer failed (assignment):', e?.message || e);
            return { question_id: q.id, score: null, feedback: 'Could not be graded automatically.' };
          }
        })
      );
    }

    const essayQuestions = questions.filter(q => q.type === 'essay');
    let essayFeedback = [];

    if (essayQuestions.length > 0) {
      essayFeedback = await Promise.all(
        essayQuestions.map(async (q) => {
          const studentAnswer = answers.find(a => a.question_id === q.id);
          if (!studentAnswer?.answer?.trim()) {
            return { question_id: q.id, score: 0, feedback: 'No answer provided.', breakdown: { thesis: 0, evidence: 0, analysis: 0, counterclaim: 0 }, tagged_response: '' };
          }
          try {
            const result = await gradeEssay(q.question_text, q.correct_answer, studentAnswer.answer, aiInstruction);
            return { question_id: q.id, ...result };
          } catch (e) {
            console.error('gradeEssay failed (assignment):', e?.message || e);
            return { question_id: q.id, score: null, feedback: 'Could not be graded automatically.', breakdown: null, tagged_response: studentAnswer.answer };
          }
        })
      );
    }

    let weightedSum = 0, weightedCount = 0;

    if (mcQuestions.length > 0) {
      weightedSum   += (mcCorrect / mcQuestions.length) * 100 * mcQuestions.length;
      weightedCount += mcQuestions.length;
    }
    const saScores = saFeedback.filter(r => r.score !== null);
    if (saScores.length > 0) {
      weightedSum   += (saScores.reduce((s, r) => s + r.score, 0) / saScores.length) * saQuestions.length;
      weightedCount += saQuestions.length;
    }
    const essayScores = essayFeedback.filter(r => r.score !== null);
    if (essayScores.length > 0) {
      weightedSum   += (essayScores.reduce((s, r) => s + r.score, 0) / essayScores.length) * essayQuestions.length;
      weightedCount += essayQuestions.length;
    }

    const finalScore = weightedCount > 0 ? Math.round(weightedSum / weightedCount) : null;

    const { data: submission, error } = await supabase
      .from('assignment_submissions')
      .insert({
        assignment_id:  assignmentId,
        student_id:     req.user.id,
        answers,
        score:          finalScore,
        sa_feedback:    saFeedback.length    > 0 ? saFeedback    : null,
        essay_feedback: essayFeedback.length > 0 ? essayFeedback : null,
        mc_results:     mcResults.length     > 0 ? mcResults     : null,
      })
      .select().single();

    if (error) throw error;
    res.status(201).json({ submission });
  } catch (err) { next(err); }
});

// ─── RESULTS ───────────────────────────────────────────────────────────────────

// GET /api/units/:unitId/assignments/:assignmentId/results/:studentId
router.get('/:unitId/assignments/:assignmentId/results/:studentId', authenticate, async (req, res, next) => {
  try {
    const { unitId, assignmentId, studentId } = req.params;

    if (req.user.role === 'student' && req.user.id !== studentId) return res.status(403).json({ error: 'Access denied' });
    if (req.user.role === 'teacher') {
      const owns = await teacherOwnsUnit(unitId, req.user.id);
      if (!owns) return res.status(403).json({ error: 'Access denied' });
    }

    const { data: submission, error } = await supabase
      .from('assignment_submissions').select('*')
      .eq('assignment_id', assignmentId).eq('student_id', studentId).single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json({ submission: submission || null });
  } catch (err) { next(err); }
});

// GET /api/units/:unitId/assignments/:assignmentId/all-results
router.get('/:unitId/assignments/:assignmentId/all-results', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId, assignmentId } = req.params;

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { data: submissions, error } = await supabase
      .from('assignment_submissions')
      .select('*, profiles(display_name)')
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    res.json({ submissions: submissions || [] });
  } catch (err) { next(err); }
});

module.exports = router;
