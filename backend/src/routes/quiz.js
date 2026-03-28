const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const { generateQuizQuestions, gradeShortAnswer, gradeEssay, analyzePerformance } = require('../services/claude');
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
  return String(answer || '')
    .trim()
    .replace(/^[A-Z]\)\s*/i, '')
    .replace(/^[A-Z][.: -]+\s*/i, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function isMatchingMcAnswer(studentAnswer, correctAnswer) {
  return normalizeMcAnswer(studentAnswer) !== '' && normalizeMcAnswer(studentAnswer) === normalizeMcAnswer(correctAnswer);
}

// ─── QUIZ LIST ────────────────────────────────────────────────────────────────

// GET /api/units/:unitId/quizzes
router.get('/:unitId/quizzes', authenticate, async (req, res, next) => {
  try {
    const { unitId } = req.params;

    if (req.user.role === 'teacher') {
      const owns = await teacherOwnsUnit(unitId, req.user.id);
      if (!owns) return res.status(403).json({ error: 'Access denied' });
    } else {
      const canAccess = await studentCanAccessUnit(unitId, req.user.id);
      if (!canAccess) return res.status(403).json({ error: 'Access denied' });
    }

    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('id, name, context, due_date, essay_guide_enabled, created_at')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const withCounts = await Promise.all((quizzes || []).map(async quiz => {
      const { count } = await supabase
        .from('quiz_questions')
        .select('id', { count: 'exact', head: true })
        .eq('quiz_id', quiz.id);
      return { ...quiz, question_count: count || 0 };
    }));

    res.json({ quizzes: withCounts });
  } catch (err) {
    next(err);
  }
});

// POST /api/units/:unitId/quizzes
router.post('/:unitId/quizzes', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId } = req.params;
    const { name, context, due_date } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Quiz name is required' });

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .insert({ unit_id: unitId, name: name.trim(), context: context?.trim() || null, due_date: due_date || null })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ quiz: { ...quiz, question_count: 0 } });
  } catch (err) {
    next(err);
  }
});

// ─── SINGLE QUIZ ─────────────────────────────────────────────────────────────

// GET /api/units/:unitId/quizzes/:quizId
router.get('/:unitId/quizzes/:quizId', authenticate, async (req, res, next) => {
  try {
    const { unitId, quizId } = req.params;

    if (req.user.role === 'teacher') {
      const owns = await teacherOwnsUnit(unitId, req.user.id);
      if (!owns) return res.status(403).json({ error: 'Access denied' });
    } else {
      const canAccess = await studentCanAccessUnit(unitId, req.user.id);
      if (!canAccess) return res.status(403).json({ error: 'Access denied' });
    }

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes').select('*').eq('id', quizId).eq('unit_id', unitId).single();
    if (quizError || !quiz) return res.status(404).json({ error: 'Quiz not found' });

    const { data: questions, error: qError } = await supabase
      .from('quiz_questions').select('*').eq('quiz_id', quizId).order('order_index', { ascending: true });
    if (qError) throw qError;

    const safeQuestions = req.user.role === 'student'
      ? questions.map(({ correct_answer, ...q }) => q)
      : questions;

    res.json({ quiz: { ...quiz, questions: safeQuestions } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/units/:unitId/quizzes/:quizId
router.put('/:unitId/quizzes/:quizId', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId, quizId } = req.params;
    const { name, context, due_date, essay_guide_enabled } = req.body;

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (context !== undefined) updates.context = context?.trim() || null;
    if (due_date !== undefined) updates.due_date = due_date || null;
    if (essay_guide_enabled !== undefined) updates.essay_guide_enabled = essay_guide_enabled;

    const { data: quiz, error } = await supabase
      .from('quizzes').update(updates).eq('id', quizId).eq('unit_id', unitId).select().single();
    if (error) throw error;
    res.json({ quiz });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/units/:unitId/quizzes/:quizId
router.delete('/:unitId/quizzes/:quizId', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId, quizId } = req.params;

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    await supabase.from('quiz_submissions').delete().eq('quiz_id', quizId);
    await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);
    const { error } = await supabase.from('quizzes').delete().eq('id', quizId).eq('unit_id', unitId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── GENERATE & SAVE QUESTIONS ────────────────────────────────────────────────

// POST /api/units/:unitId/quizzes/:quizId/generate
router.post('/:unitId/quizzes/:quizId/generate', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId, quizId } = req.params;
    const { count = 10 } = req.body;

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const [{ data: unit }, { data: quiz }] = await Promise.all([
      supabase.from('units').select('title, context').eq('id', unitId).single(),
      supabase.from('quizzes').select('*').eq('id', quizId).eq('unit_id', unitId).single(),
    ]);

    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const baseContext = unit?.context || '';
    if (!baseContext && !quiz.context) {
      return res.status(400).json({ error: 'Unit or quiz must have context before generating' });
    }

    const contextToUse = quiz.context
      ? `${baseContext}\n\nFocus for this quiz: ${quiz.context}`
      : baseContext;

    const settings = await getUserSettings(req.user.id, req.user.role);
    const generatedQuestions = await generateQuizQuestions(unit.title, contextToUse, count, buildTeacherAiInstruction(settings));

    await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);

    const { data: questions, error: insertError } = await supabase
      .from('quiz_questions')
      .insert(generatedQuestions.map((q, i) => ({
        quiz_id: quizId, question_text: q.question_text, type: q.type,
        options: q.options || null, correct_answer: q.correct_answer, order_index: i,
      })))
      .select();

    if (insertError) throw insertError;
    res.json({ quiz: { ...quiz, questions } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/units/:unitId/quizzes/:quizId/questions
router.put('/:unitId/quizzes/:quizId/questions', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId, quizId } = req.params;
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'questions array is required' });
    }

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { data: quiz } = await supabase.from('quizzes').select('*').eq('id', quizId).eq('unit_id', unitId).single();
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);

    const { data: saved, error: insertError } = await supabase
      .from('quiz_questions')
      .insert(questions.map((q, i) => ({
        quiz_id: quizId, question_text: q.question_text, type: q.type,
        options: q.options || null, correct_answer: q.correct_answer, order_index: q.order_index ?? i,
      })))
      .select();

    if (insertError) throw insertError;
    res.json({ quiz: { ...quiz, questions: saved } });
  } catch (err) {
    next(err);
  }
});

// ─── STUDENT SUBMIT ───────────────────────────────────────────────────────────

// POST /api/units/:unitId/quizzes/:quizId/submit
router.post('/:unitId/quizzes/:quizId/submit', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { unitId, quizId } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers array is required' });

    const canAccess = await studentCanAccessUnit(unitId, req.user.id);
    if (!canAccess) return res.status(403).json({ error: 'Access denied' });

    const { data: quiz } = await supabase.from('quizzes').select('id').eq('id', quizId).eq('unit_id', unitId).single();
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const { data: existing } = await supabase.from('quiz_submissions').select('id').eq('quiz_id', quizId).eq('student_id', req.user.id).single();
    if (existing) return res.status(409).json({ error: 'Quiz already submitted' });

    const { data: questions } = await supabase.from('quiz_questions').select('id, type, question_text, correct_answer').eq('quiz_id', quizId);

    const studentSettings = await getUserSettings(req.user.id, req.user.role);
    const aiInstruction = buildStudentAiInstruction(studentSettings);

    const mcQuestions = questions.filter(q => q.type === 'multiple_choice');
    let mcCorrect = 0;
    mcQuestions.forEach(q => { const a = answers.find(a => a.question_id === q.id); if (isMatchingMcAnswer(a?.answer, q.correct_answer)) mcCorrect++; });
    const mcResults = mcQuestions.map(q => { const a = answers.find(a => a.question_id === q.id); return { question_id: q.id, correct: isMatchingMcAnswer(a?.answer, q.correct_answer), correct_answer: q.correct_answer }; });

    const saQuestions = questions.filter(q => q.type === 'short_answer');
    let saFeedback = [];
    if (saQuestions.length > 0) {
      saFeedback = await Promise.all(saQuestions.map(async q => {
        const sa = answers.find(a => a.question_id === q.id);
        if (!sa?.answer?.trim()) return { question_id: q.id, score: 0, feedback: 'No answer provided.' };
        try { const { score, feedback } = await gradeShortAnswer(q.question_text, q.correct_answer, sa.answer, aiInstruction); return { question_id: q.id, score, feedback }; }
        catch { return { question_id: q.id, score: null, feedback: 'Could not be graded automatically.' }; }
      }));
    }

    const essayQuestions = questions.filter(q => q.type === 'essay');
    let essayFeedback = [];
    if (essayQuestions.length > 0) {
      essayFeedback = await Promise.all(essayQuestions.map(async q => {
        const ea = answers.find(a => a.question_id === q.id);
        if (!ea?.answer?.trim()) return { question_id: q.id, score: 0, feedback: 'No answer provided.', breakdown: { thesis: 0, evidence: 0, analysis: 0, counterclaim: 0 }, tagged_response: '' };
        try { const result = await gradeEssay(q.question_text, q.correct_answer, ea.answer, aiInstruction); return { question_id: q.id, ...result }; }
        catch { return { question_id: q.id, score: null, feedback: 'Could not be graded automatically.', breakdown: null, tagged_response: ea.answer }; }
      }));
    }

    let weightedSum = 0, weightedCount = 0;
    if (mcQuestions.length > 0) { weightedSum += (mcCorrect / mcQuestions.length) * 100 * mcQuestions.length; weightedCount += mcQuestions.length; }
    const saScores = saFeedback.filter(r => r.score !== null);
    if (saScores.length > 0) { weightedSum += (saScores.reduce((s, r) => s + r.score, 0) / saScores.length) * saQuestions.length; weightedCount += saQuestions.length; }
    const essayScores = essayFeedback.filter(r => r.score !== null);
    if (essayScores.length > 0) { weightedSum += (essayScores.reduce((s, r) => s + r.score, 0) / essayScores.length) * essayQuestions.length; weightedCount += essayQuestions.length; }
    const finalScore = weightedCount > 0 ? Math.round(weightedSum / weightedCount) : null;

    const { data: submission, error } = await supabase.from('quiz_submissions')
      .insert({ quiz_id: quizId, student_id: req.user.id, answers, score: finalScore, sa_feedback: saFeedback.length > 0 ? saFeedback : null, essay_feedback: essayFeedback.length > 0 ? essayFeedback : null, mc_results: mcResults.length > 0 ? mcResults : null })
      .select().single();
    if (error) throw error;
    res.status(201).json({ submission });
  } catch (err) {
    next(err);
  }
});

// ─── RESULTS ─────────────────────────────────────────────────────────────────

// GET /api/units/:unitId/quizzes/:quizId/results/:studentId
router.get('/:unitId/quizzes/:quizId/results/:studentId', authenticate, async (req, res, next) => {
  try {
    const { unitId, quizId, studentId } = req.params;
    if (req.user.role === 'student' && req.user.id !== studentId) return res.status(403).json({ error: 'Access denied' });
    if (req.user.role === 'teacher') { const owns = await teacherOwnsUnit(unitId, req.user.id); if (!owns) return res.status(403).json({ error: 'Access denied' }); }

    const { data: submission, error } = await supabase.from('quiz_submissions').select('*').eq('quiz_id', quizId).eq('student_id', studentId).single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ submission: submission || null });
  } catch (err) {
    next(err);
  }
});

// GET /api/units/:unitId/quizzes/:quizId/all-results
router.get('/:unitId/quizzes/:quizId/all-results', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId, quizId } = req.params;
    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { data: submissions, error } = await supabase
      .from('quiz_submissions').select('*, profiles(display_name)').eq('quiz_id', quizId).order('submitted_at', { ascending: false });
    if (error) throw error;
    res.json({ submissions: submissions || [] });
  } catch (err) {
    next(err);
  }
});

// ─── SA OVERRIDE ──────────────────────────────────────────────────────────────

// PATCH /api/units/:unitId/quizzes/:quizId/submissions/:submissionId/sa
router.patch('/:unitId/quizzes/:quizId/submissions/:submissionId/sa', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId, submissionId } = req.params;
    const { overrides } = req.body;

    if (!Array.isArray(overrides) || overrides.length === 0) return res.status(400).json({ error: 'overrides array is required' });
    for (const o of overrides) {
      if (typeof o.score !== 'number' || o.score < 0 || o.score > 100) return res.status(400).json({ error: `Invalid score for question ${o.question_id}` });
    }

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { data: submission, error: subErr } = await supabase.from('quiz_submissions').select('*').eq('id', submissionId).single();
    if (subErr || !submission) return res.status(404).json({ error: 'Submission not found' });

    const existing = submission.sa_feedback || [];
    const merged = existing.map(item => {
      const o = overrides.find(o => o.question_id === item.question_id);
      if (!o) return item;
      return { ...item, score: o.score, feedback: o.feedback !== undefined ? o.feedback : item.feedback, teacher_graded: true };
    });
    overrides.forEach(o => {
      if (!merged.find(m => m.question_id === o.question_id)) merged.push({ question_id: o.question_id, score: o.score, feedback: o.feedback ?? '', teacher_graded: true });
    });

    const { data: allQ } = await supabase.from('quiz_questions').select('id, type').eq('quiz_id', submission.quiz_id);
    const mcQ = allQ.filter(q => q.type === 'multiple_choice');
    const saQ = allQ.filter(q => q.type === 'short_answer');
    const esQ = allQ.filter(q => q.type === 'essay');

    let ws = 0, wc = 0;
    if (mcQ.length > 0 && submission.mc_results?.length > 0) { ws += (submission.mc_results.filter(r => r.correct).length / mcQ.length) * 100 * mcQ.length; wc += mcQ.length; }
    const saS = merged.filter(r => r.score !== null && r.score !== undefined);
    if (saS.length > 0 && saQ.length > 0) { ws += (saS.reduce((s, r) => s + r.score, 0) / saS.length) * saQ.length; wc += saQ.length; }
    const esS = (submission.essay_feedback || []).filter(r => r.score !== null && r.score !== undefined);
    if (esS.length > 0 && esQ.length > 0) { ws += (esS.reduce((s, r) => s + r.score, 0) / esS.length) * esQ.length; wc += esQ.length; }

    const newScore = wc > 0 ? Math.round(ws / wc) : null;
    const { data: updated, error: updateErr } = await supabase.from('quiz_submissions').update({ sa_feedback: merged, score: newScore }).eq('id', submissionId).select().single();
    if (updateErr) throw updateErr;
    res.json({ submission: updated });
  } catch (err) {
    next(err);
  }
});

// ─── ANALYZE ─────────────────────────────────────────────────────────────────

// POST /api/units/:unitId/quizzes/:quizId/analyze/:studentId
router.post('/:unitId/quizzes/:quizId/analyze/:studentId', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId, quizId, studentId } = req.params;

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { data: questions } = await supabase.from('quiz_questions').select('id, question_text, type, correct_answer, options').eq('quiz_id', quizId).order('order_index');
    const { data: submission } = await supabase.from('quiz_submissions').select('*').eq('quiz_id', quizId).eq('student_id', studentId).single();
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const { data: unit } = await supabase.from('units').select('title, context').eq('id', unitId).single();
    const settings = await getUserSettings(req.user.id, req.user.role);
    const analysis = await analyzePerformance(unit, questions, submission, buildTeacherAiInstruction(settings));
    res.json({ analysis });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
