const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const { generateQuizQuestions, gradeShortAnswer, gradeEssay, analyzePerformance } = require('../services/claude');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');

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

// GET /api/units/:unitId/quiz
router.get('/:unitId/quiz', authenticate, async (req, res, next) => {
  try {
    const { unitId } = req.params;

    if (req.user.role === 'teacher') {
      const owns = await teacherOwnsUnit(unitId, req.user.id);
      if (!owns) return res.status(403).json({ error: 'Access denied' });
    } else {
      const canAccess = await studentCanAccessUnit(unitId, req.user.id);
      if (!canAccess) return res.status(403).json({ error: 'Access denied' });
    }

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes').select('*').eq('unit_id', unitId).single();

    if (quizError && quizError.code !== 'PGRST116') throw quizError;
    if (!quiz) return res.json({ quiz: null });

    const { data: questions, error: qError } = await supabase
      .from('quiz_questions').select('*').eq('quiz_id', quiz.id)
      .order('order_index', { ascending: true });

    if (qError) throw qError;

    const safeQuestions = req.user.role === 'student'
      ? questions.map(({ correct_answer, ...q }) => q)
      : questions;

    res.json({ quiz: { ...quiz, questions: safeQuestions } });
  } catch (err) {
    next(err);
  }
});

// POST /api/units/:unitId/quiz/generate
router.post('/:unitId/quiz/generate', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId } = req.params;
    const { count = 10 } = req.body;

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { data: unit } = await supabase
      .from('units').select('title, context').eq('id', unitId).single();

    if (!unit?.context) {
      return res.status(400).json({ error: 'Unit must have a context before generating a quiz' });
    }

    const generatedQuestions = await generateQuizQuestions(unit.title, unit.context, count);

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes').upsert({ unit_id: unitId }, { onConflict: 'unit_id' }).select().single();

    if (quizError) throw quizError;

    await supabase.from('quiz_questions').delete().eq('quiz_id', quiz.id);

    const questionsToInsert = generatedQuestions.map((q, i) => ({
      quiz_id: quiz.id,
      question_text: q.question_text,
      type: q.type,
      options: q.options || null,
      correct_answer: q.correct_answer,
      order_index: i,
    }));

    const { data: questions, error: insertError } = await supabase
      .from('quiz_questions').insert(questionsToInsert).select();

    if (insertError) throw insertError;

    res.json({ quiz: { ...quiz, questions } });
  } catch (err) {
    next(err);
  }
});

// POST /api/units/:unitId/quiz/grade/:studentId
router.post('/:unitId/quiz/grade/:studentId', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId, studentId } = req.params;

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { data: quiz } = await supabase
      .from('quizzes').select('id').eq('unit_id', unitId).single();
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const { data: questions } = await supabase
      .from('quiz_questions').select('id, question_text, type, correct_answer')
      .eq('quiz_id', quiz.id).eq('type', 'short_answer');

    if (!questions || questions.length === 0) {
      return res.status(400).json({ error: 'No short answer questions to grade' });
    }

    const { data: submission } = await supabase
      .from('quiz_submissions').select('*')
      .eq('quiz_id', quiz.id).eq('student_id', studentId).single();
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const gradingResults = await Promise.all(
      questions.map(async (q) => {
        const studentAnswer = submission.answers.find(a => a.question_id === q.id);
        if (!studentAnswer?.answer) {
          return { question_id: q.id, score: 0, feedback: 'No answer provided.' };
        }
        const { score, feedback } = await gradeShortAnswer(
          q.question_text, q.correct_answer, studentAnswer.answer
        );
        return { question_id: q.id, score, feedback };
      })
    );

    const { data: allQuestions } = await supabase
      .from('quiz_questions').select('id, type, correct_answer').eq('quiz_id', quiz.id);

    const mcQuestions = allQuestions.filter(q => q.type === 'multiple_choice');
    const saQuestions = allQuestions.filter(q => q.type === 'short_answer');

    let mcCorrect = 0;
    mcQuestions.forEach(q => {
      const a = submission.answers.find(a => a.question_id === q.id);
      if (isMatchingMcAnswer(a?.answer, q.correct_answer)) mcCorrect++;
    });

    const mcScore = mcQuestions.length > 0 ? (mcCorrect / mcQuestions.length) * 100 : null;
    const saAvg = gradingResults.reduce((sum, r) => sum + r.score, 0) / gradingResults.length;

    let finalScore;
    if (mcQuestions.length > 0 && saQuestions.length > 0) {
      const total = allQuestions.length;
      finalScore = Math.round(
        (mcScore * mcQuestions.length / total) + (saAvg * saQuestions.length / total)
      );
    } else {
      finalScore = Math.round(saAvg);
    }

    const { data: updated, error } = await supabase
      .from('quiz_submissions')
      .update({ score: finalScore, sa_feedback: gradingResults })
      .eq('id', submission.id).select().single();

    if (error) throw error;

    res.json({ submission: updated, grading: gradingResults, score: finalScore });
  } catch (err) {
    next(err);
  }
});

// PUT /api/units/:unitId/quiz/questions
router.put('/:unitId/quiz/questions', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId } = req.params;
    const { questions, due_date } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'questions array is required' });
    }

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .upsert({ unit_id: unitId, due_date: due_date || null }, { onConflict: 'unit_id' })
      .select().single();

    if (quizError) throw quizError;

    await supabase.from('quiz_questions').delete().eq('quiz_id', quiz.id);

    const questionsToInsert = questions.map((q, i) => ({
      quiz_id: quiz.id,
      question_text: q.question_text,
      type: q.type,
      options: q.options || null,
      correct_answer: q.correct_answer,
      order_index: q.order_index ?? i,
    }));

    const { data: saved, error: insertError } = await supabase
      .from('quiz_questions').insert(questionsToInsert).select();

    if (insertError) throw insertError;

    res.json({ quiz: { ...quiz, questions: saved } });
  } catch (err) {
    next(err);
  }
});

// POST /api/units/:unitId/quiz/submit
router.post('/:unitId/quiz/submit', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { unitId } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'answers array is required' });
    }

    const canAccess = await studentCanAccessUnit(unitId, req.user.id);
    if (!canAccess) return res.status(403).json({ error: 'Access denied' });

    const { data: quiz } = await supabase
      .from('quizzes').select('id').eq('unit_id', unitId).single();
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const { data: existing } = await supabase
      .from('quiz_submissions').select('id')
      .eq('quiz_id', quiz.id).eq('student_id', req.user.id).single();
    if (existing) return res.status(409).json({ error: 'Quiz already submitted' });

    const { data: questions } = await supabase
      .from('quiz_questions').select('id, type, question_text, correct_answer')
      .eq('quiz_id', quiz.id);

    // ── Grade MC ──
    const mcQuestions = questions.filter(q => q.type === 'multiple_choice');
    let mcCorrect = 0;
    mcQuestions.forEach(q => {
      const a = answers.find(a => a.question_id === q.id);
      if (isMatchingMcAnswer(a?.answer, q.correct_answer)) mcCorrect++;
    });

    const mcResults = mcQuestions.map(q => {
      const a = answers.find(a => a.question_id === q.id);
      return {
        question_id:    q.id,
        correct:        isMatchingMcAnswer(a?.answer, q.correct_answer),
        correct_answer: q.correct_answer,
      };
    });

    // ── Grade Short Answer ──
    const saQuestions = questions.filter(q => q.type === 'short_answer');
    let saFeedback = [];

    if (saQuestions.length > 0) {
      saFeedback = await Promise.all(
        saQuestions.map(async (q) => {
          const studentAnswer = answers.find(a => a.question_id === q.id);
          if (!studentAnswer?.answer?.trim()) {
            return { question_id: q.id, score: 0, feedback: 'No answer provided.' };
          }
          try {
            const { score, feedback } = await gradeShortAnswer(
              q.question_text, q.correct_answer, studentAnswer.answer
            );
            return { question_id: q.id, score, feedback };
          } catch {
            return { question_id: q.id, score: null, feedback: 'Could not be graded automatically.' };
          }
        })
      );
    }

    // ── Grade Essays ──
    const essayQuestions = questions.filter(q => q.type === 'essay');
    let essayFeedback = [];

    if (essayQuestions.length > 0) {
      essayFeedback = await Promise.all(
        essayQuestions.map(async (q) => {
          const studentAnswer = answers.find(a => a.question_id === q.id);
          if (!studentAnswer?.answer?.trim()) {
            return {
              question_id: q.id, score: 0,
              feedback: 'No answer provided.',
              breakdown: { thesis: 0, evidence: 0, analysis: 0, counterclaim: 0 },
              tagged_response: '',
            };
          }
          try {
            const result = await gradeEssay(q.question_text, q.correct_answer, studentAnswer.answer);
            return { question_id: q.id, ...result };
          } catch {
            return {
              question_id: q.id, score: null,
              feedback: 'Could not be graded automatically.',
              breakdown: null,
              tagged_response: studentAnswer.answer,
            };
          }
        })
      );
    }

    // ── Blend score ──
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
      .from('quiz_submissions')
      .insert({
        quiz_id:        quiz.id,
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
  } catch (err) {
    next(err);
  }
});

// GET /api/units/:unitId/quiz/results/:studentId
router.get('/:unitId/quiz/results/:studentId', authenticate, async (req, res, next) => {
  try {
    const { unitId, studentId } = req.params;

    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'teacher') {
      const owns = await teacherOwnsUnit(unitId, req.user.id);
      if (!owns) return res.status(403).json({ error: 'Access denied' });
    }

    const { data: quiz } = await supabase
      .from('quizzes').select('id').eq('unit_id', unitId).single();
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const { data: submission, error } = await supabase
      .from('quiz_submissions').select('*')
      .eq('quiz_id', quiz.id).eq('student_id', studentId).single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json({ submission: submission || null });
  } catch (err) {
    next(err);
  }
});

// GET /api/units/:unitId/quiz/all-results
router.get('/:unitId/quiz/all-results', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId } = req.params;

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { data: quiz } = await supabase
      .from('quizzes').select('id').eq('unit_id', unitId).single();
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const { data: submissions, error } = await supabase
      .from('quiz_submissions')
      .select('*, profiles(display_name)')
      .eq('quiz_id', quiz.id)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    res.json({ submissions: submissions || [] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/units/:unitId/quiz/submissions/:submissionId/sa
// Teacher manually overrides SA scores. Recalculates overall score.
// Body: { overrides: [{ question_id, score (0-100), feedback }] }
router.patch('/:unitId/quiz/submissions/:submissionId/sa', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId, submissionId } = req.params;
    const { overrides } = req.body;

    if (!Array.isArray(overrides) || overrides.length === 0) {
      return res.status(400).json({ error: 'overrides array is required' });
    }
    for (const o of overrides) {
      if (typeof o.score !== 'number' || o.score < 0 || o.score > 100) {
        return res.status(400).json({ error: `Invalid score for question ${o.question_id} — must be 0–100` });
      }
    }

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { data: submission, error: subErr } = await supabase
      .from('quiz_submissions').select('*').eq('id', submissionId).single();
    if (subErr || !submission) return res.status(404).json({ error: 'Submission not found' });

    // Merge overrides into sa_feedback, marking each as teacher-graded
    const existing = submission.sa_feedback || [];
    const merged = existing.map(item => {
      const override = overrides.find(o => o.question_id === item.question_id);
      if (!override) return item;
      return {
        ...item,
        score:          override.score,
        feedback:       override.feedback !== undefined ? override.feedback : item.feedback,
        teacher_graded: true,
      };
    });
    // Handle any overrides for SA questions not yet in sa_feedback
    overrides.forEach(o => {
      if (!merged.find(m => m.question_id === o.question_id)) {
        merged.push({
          question_id:    o.question_id,
          score:          o.score,
          feedback:       o.feedback ?? '',
          teacher_graded: true,
        });
      }
    });

    // Recalculate overall weighted score
    const { data: allQuestions } = await supabase
      .from('quiz_questions').select('id, type').eq('quiz_id', submission.quiz_id);

    const mcQuestions    = allQuestions.filter(q => q.type === 'multiple_choice');
    const saQuestions    = allQuestions.filter(q => q.type === 'short_answer');
    const essayQuestions = allQuestions.filter(q => q.type === 'essay');

    let weightedSum = 0, weightedCount = 0;

    // MC — from stored mc_results
    if (mcQuestions.length > 0 && submission.mc_results?.length > 0) {
      const mcCorrect = submission.mc_results.filter(r => r.correct).length;
      weightedSum   += (mcCorrect / mcQuestions.length) * 100 * mcQuestions.length;
      weightedCount += mcQuestions.length;
    }

    // SA — use newly merged scores
    const saScored = merged.filter(r => r.score !== null && r.score !== undefined);
    if (saScored.length > 0 && saQuestions.length > 0) {
      const saAvg = saScored.reduce((s, r) => s + r.score, 0) / saScored.length;
      weightedSum   += saAvg * saQuestions.length;
      weightedCount += saQuestions.length;
    }

    // Essays — unchanged
    const essayScored = (submission.essay_feedback || []).filter(r => r.score !== null && r.score !== undefined);
    if (essayScored.length > 0 && essayQuestions.length > 0) {
      const essayAvg = essayScored.reduce((s, r) => s + r.score, 0) / essayScored.length;
      weightedSum   += essayAvg * essayQuestions.length;
      weightedCount += essayQuestions.length;
    }

    const newScore = weightedCount > 0 ? Math.round(weightedSum / weightedCount) : null;

    const { data: updated, error: updateErr } = await supabase
      .from('quiz_submissions')
      .update({ sa_feedback: merged, score: newScore })
      .eq('id', submissionId)
      .select().single();

    if (updateErr) throw updateErr;
    res.json({ submission: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/units/:unitId/quiz/analyze/:studentId
router.post('/:unitId/quiz/analyze/:studentId', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { unitId, studentId } = req.params;

    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { data: quiz } = await supabase
      .from('quizzes').select('id').eq('unit_id', unitId).single();
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('id, question_text, type, correct_answer, options')
      .eq('quiz_id', quiz.id).order('order_index');

    const { data: submission } = await supabase
      .from('quiz_submissions').select('*')
      .eq('quiz_id', quiz.id).eq('student_id', studentId).single();
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const { data: unit } = await supabase
      .from('units').select('title, context').eq('id', unitId).single();

    const analysis = await analyzePerformance(unit, questions, submission);
    res.json({ analysis });
  } catch (err) {
    next(err);
  }
});

module.exports = router;