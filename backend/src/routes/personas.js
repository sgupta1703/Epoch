const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const { chatWithPersona, generatePersonaMissions, generatePersonaQuizQuestions, gradeShortAnswer } = require('../services/claude');
const { getUserSettings, buildStudentAiInstruction } = require('../services/userSettings');
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

function normalizeMcAnswer(answer) {
  return String(answer || '')
    .trim()
    .replace(/^[A-Z]\)\s*/i, '')
    .replace(/^[A-Z][.: -]+\s*/i, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
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
    const { name, description, min_turns, due_date, year_start, year_end, location, mode, missions } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!year_start) return res.status(400).json({ error: 'year_start is required' });
    const owns = await teacherOwnsUnit(unitId, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });
    const validModes = ['free', 'missions', 'quiz'];
    const personaMode = validModes.includes(mode) ? mode : 'free';
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
        mode: personaMode,
        missions: missions || [],
      })
      .select().single();
    if (error) throw error;
    res.status(201).json({ persona: data });
  } catch (err) { next(err); }
});

// PATCH /api/personas/:id
router.patch('/:id', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { name, description, min_turns, due_date, year_start, year_end, location, mode, missions } = req.body;
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
    if (mode        !== undefined) {
      const validModes = ['free', 'missions', 'quiz'];
      updates.mode = validModes.includes(mode) ? mode : 'free';
    }
    if (missions    !== undefined) updates.missions    = missions;
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

// POST /api/personas/:id/generate-missions  (teacher only)
router.post('/:id/generate-missions', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { data: persona } = await supabase
      .from('personas')
      .select('*, units(context)')
      .eq('id', req.params.id).single();
    if (!persona) return res.status(404).json({ error: 'Persona not found' });
    const owns = await teacherOwnsUnit(persona.unit_id, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });
    if (!persona.name) return res.status(400).json({ error: 'Persona must have a name before generating missions' });

    const missions = await generatePersonaMissions(persona, persona.units?.context || '');
    res.json({ missions });
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

    // In quiz mode, lock chat once conversation is completed
    let { data: conversation } = await supabase
      .from('conversations').select('*')
      .eq('persona_id', req.params.id).eq('student_id', req.user.id).single();

    if (persona.mode === 'quiz' && conversation?.quiz_locked) {
      return res.status(403).json({ error: 'Conversation is locked. Please complete your quiz.' });
    }

    const existingMessages = conversation?.messages || [];
    const updatedMessages = [...existingMessages, { role: 'user', content: message }];
    const settings = await getUserSettings(req.user.id, req.user.role);
    const reply = await chatWithPersona(
      persona,
      persona.units.context,
      updatedMessages,
      buildStudentAiInstruction(settings),
    );
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
          completed_missions: conversation?.completed_missions || [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'persona_id,student_id' }
      ).select().single();
    if (error) throw error;
    res.json({ reply, turn_count: newTurnCount, completed, min_turns: persona.min_turns });
  } catch (err) { next(err); }
});

// PATCH /api/personas/:id/missions-progress  (student marks missions complete)
router.patch('/:id/missions-progress', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { completed_missions } = req.body;
    if (!Array.isArray(completed_missions)) return res.status(400).json({ error: 'completed_missions must be an array' });
    const { data: persona } = await supabase
      .from('personas').select('unit_id').eq('id', req.params.id).single();
    if (!persona) return res.status(404).json({ error: 'Persona not found' });
    const canAccess = await studentCanAccessUnit(persona.unit_id, req.user.id);
    if (!canAccess) return res.status(403).json({ error: 'Access denied' });

    const { data, error } = await supabase
      .from('conversations')
      .upsert(
        {
          persona_id: req.params.id,
          student_id: req.user.id,
          completed_missions,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'persona_id,student_id' }
      ).select().single();
    if (error) throw error;
    res.json({ conversation: data });
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

// POST /api/personas/:id/quiz/generate  (student — generates quiz from their conversation)
router.post('/:id/quiz/generate', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { data: persona } = await supabase
      .from('personas')
      .select('*, units(context, is_visible, classroom_id)')
      .eq('id', req.params.id).single();
    if (!persona) return res.status(404).json({ error: 'Persona not found' });
    if (persona.mode !== 'quiz') return res.status(400).json({ error: 'This persona is not in quiz mode' });
    const canAccess = await studentCanAccessUnit(persona.unit_id, req.user.id);
    if (!canAccess) return res.status(403).json({ error: 'Access denied' });

    const { data: conversation } = await supabase
      .from('conversations').select('*')
      .eq('persona_id', req.params.id).eq('student_id', req.user.id).single();
    if (!conversation?.completed) {
      return res.status(400).json({ error: 'You must complete the minimum conversation before taking the quiz' });
    }

    // Check if quiz already exists
    const { data: existing } = await supabase
      .from('persona_quiz_submissions')
      .select('id, questions, answers, score, submitted_at')
      .eq('persona_id', req.params.id).eq('student_id', req.user.id).single();
    if (existing) return res.json({ quiz: existing });

    // Generate quiz from conversation
    const questions = await generatePersonaQuizQuestions(
      persona,
      conversation.messages || [],
      persona.units?.context || ''
    );

    const questionsWithIds = questions.map((q, i) => ({ ...q, id: `pq_${i + 1}` }));

    const { data: submission, error } = await supabase
      .from('persona_quiz_submissions')
      .insert({
        persona_id: req.params.id,
        student_id: req.user.id,
        questions: questionsWithIds,
        answers: null,
        score: null,
        submitted_at: null,
      })
      .select().single();
    if (error) throw error;

    // Lock the conversation so student can't keep chatting after starting quiz
    await supabase.from('conversations').update({ quiz_locked: true })
      .eq('persona_id', req.params.id).eq('student_id', req.user.id);

    res.json({ quiz: submission });
  } catch (err) { next(err); }
});

// POST /api/personas/:id/quiz/submit  (student submits quiz answers)
router.post('/:id/quiz/submit', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers must be an array' });

    const { data: persona } = await supabase
      .from('personas').select('unit_id, mode').eq('id', req.params.id).single();
    if (!persona) return res.status(404).json({ error: 'Persona not found' });
    if (persona.mode !== 'quiz') return res.status(400).json({ error: 'This persona is not in quiz mode' });
    const canAccess = await studentCanAccessUnit(persona.unit_id, req.user.id);
    if (!canAccess) return res.status(403).json({ error: 'Access denied' });

    const { data: submission } = await supabase
      .from('persona_quiz_submissions').select('*')
      .eq('persona_id', req.params.id).eq('student_id', req.user.id).single();
    if (!submission) return res.status(404).json({ error: 'Quiz not found. Generate the quiz first.' });
    if (submission.submitted_at) return res.status(400).json({ error: 'Quiz already submitted' });

    const questions = submission.questions || [];
    let totalScore = 0;
    const gradedAnswers = [];

    for (const q of questions) {
      const studentAnswer = answers.find(a => a.question_id === q.id);
      const ans = studentAnswer?.answer || '';

      if (q.type === 'multiple_choice') {
        const correct = normalizeMcAnswer(ans) !== '' && normalizeMcAnswer(ans) === normalizeMcAnswer(q.correct_answer);
        const score = correct ? 100 : 0;
        totalScore += score;
        gradedAnswers.push({ question_id: q.id, answer: ans, score, feedback: correct ? 'Correct!' : `Correct answer: ${q.correct_answer}` });
      } else {
        // short_answer — grade with AI
        try {
          const result = await gradeShortAnswer(q.question_text, q.correct_answer, ans);
          totalScore += result.score;
          gradedAnswers.push({ question_id: q.id, answer: ans, score: result.score, feedback: result.feedback });
        } catch {
          const score = ans.trim().length > 5 ? 50 : 0;
          totalScore += score;
          gradedAnswers.push({ question_id: q.id, answer: ans, score, feedback: 'Could not grade automatically.' });
        }
      }
    }

    const finalScore = questions.length > 0 ? Math.round(totalScore / questions.length) : 0;

    const { data: updated, error } = await supabase
      .from('persona_quiz_submissions')
      .update({
        answers: gradedAnswers,
        score: finalScore,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', submission.id)
      .select().single();
    if (error) throw error;

    res.json({ submission: updated });
  } catch (err) { next(err); }
});

// GET /api/personas/:id/quiz  (student gets their quiz)
router.get('/:id/quiz', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { data: persona } = await supabase
      .from('personas').select('unit_id, mode').eq('id', req.params.id).single();
    if (!persona) return res.status(404).json({ error: 'Persona not found' });
    if (persona.mode !== 'quiz') return res.status(400).json({ error: 'This persona is not in quiz mode' });
    const canAccess = await studentCanAccessUnit(persona.unit_id, req.user.id);
    if (!canAccess) return res.status(403).json({ error: 'Access denied' });

    const { data, error } = await supabase
      .from('persona_quiz_submissions').select('*')
      .eq('persona_id', req.params.id).eq('student_id', req.user.id).single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ quiz: data || null });
  } catch (err) { next(err); }
});

// GET /api/personas/:id/quiz/all  (teacher — all student quiz results for a persona)
router.get('/:id/quiz/all', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { data: persona } = await supabase
      .from('personas').select('unit_id').eq('id', req.params.id).single();
    if (!persona) return res.status(404).json({ error: 'Persona not found' });
    const owns = await teacherOwnsUnit(persona.unit_id, req.user.id);
    if (!owns) return res.status(403).json({ error: 'Access denied' });

    const { data, error } = await supabase
      .from('persona_quiz_submissions').select('*')
      .eq('persona_id', req.params.id)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    res.json({ submissions: data || [] });
  } catch (err) { next(err); }
});

module.exports = router;
