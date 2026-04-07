const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const supabase = require('../services/supabaseClient');
const {
  chatWithEpochAssistant,
  evaluateEssayOutline,
  chatWithEssayGuide,
  chatWithGeorgeWashington,
  chatWithStudentUnitCopilot,
} = require('../services/claude');
const { getUserSettings, buildTeacherAiInstruction, buildStudentAiInstruction } = require('../services/userSettings');

const router = express.Router();
const STUDENT_COPILOT_SURFACES = new Set(['notes', 'personas']);

function formatPersonaSummary(persona = {}) {
  const yearPart = persona.year_start
    ? (persona.year_end ? ` (${persona.year_start}–${persona.year_end})` : ` (b. ${persona.year_start})`)
    : '';
  const locPart = persona.location ? `, ${persona.location}` : '';
  return `${persona.name}${yearPart}${locPart}`;
}

function buildAiInstructionForUser(role, settings) {
  return role === 'teacher'
    ? buildTeacherAiInstruction(settings)
    : buildStudentAiInstruction(settings);
}

function normalizeMessages(messages, maxCount = 12) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((message) => typeof message?.content === 'string' && message.content.trim())
    .slice(-maxCount)
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content.trim(),
    }));
}

function looksLikeAssessmentAnswerRequest(text = '') {
  const normalized = String(text).toLowerCase();
  const assessmentPattern = /\b(quiz|assignment|dbq|frq|prompt|question|multiple choice|essay)\b/;
  const answerSeekingPattern = /\b(answer|answers|correct answer|solve|which option|which choice|pick the right|choose the right|write this|write my|respond with|what do i put|what should i put|what should i write|complete this for me|do this for me)\b/;

  return assessmentPattern.test(normalized) && answerSeekingPattern.test(normalized);
}

async function getStudentUnitCopilotContext(unitId, studentId) {
  const { data: unit, error: unitError } = await supabase
    .from('units')
    .select('id, title, context, classroom_id, is_visible, classrooms(name)')
    .eq('id', unitId)
    .single();

  if (unitError || !unit) {
    return { unit: null, notes: '', personas: [], error: 'Unit not found', status: 404 };
  }

  if (!unit.is_visible) {
    return { unit: null, notes: '', personas: [], error: 'Access denied', status: 403 };
  }

  const { data: enrollment } = await supabase
    .from('classroom_students')
    .select('classroom_id')
    .eq('classroom_id', unit.classroom_id)
    .eq('student_id', studentId)
    .single();

  if (!enrollment) {
    return { unit: null, notes: '', personas: [], error: 'Access denied', status: 403 };
  }

  const [
    { data: notesRow, error: notesError },
    { data: personas, error: personasError },
  ] = await Promise.all([
    supabase
      .from('notes')
      .select('content')
      .eq('unit_id', unitId)
      .maybeSingle(),
    supabase
      .from('personas')
      .select('id, name, description, year_start, year_end, location, mode')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: true }),
  ]);

  if (notesError) throw notesError;
  if (personasError) throw personasError;

  return {
    unit: {
      id: unit.id,
      title: unit.title,
      context: unit.context || '',
      classroom_name: unit.classrooms?.name || '',
    },
    notes: notesRow?.content || '',
    personas: personas || [],
    error: null,
    status: 200,
  };
}

router.post('/essay-guide/evaluate', authenticate, async (req, res, next) => {
  try {
    const { question, outline } = req.body;

    if (!question?.trim()) {
      return res.status(400).json({ error: 'question is required' });
    }

    const settings = await getUserSettings(req.user.id, req.user.role);
    const result = await evaluateEssayOutline(
      question.trim(),
      outline || {},
      buildAiInstructionForUser(req.user.role, settings),
    );
    res.json({ feedback: result });
  } catch (err) {
    next(err);
  }
});

router.post('/essay-guide/chat', authenticate, async (req, res, next) => {
  try {
    const { question, essayDraft, messages } = req.body;

    if (!question?.trim()) {
      return res.status(400).json({ error: 'question is required' });
    }

    const cleanedMessages = Array.isArray(messages)
      ? messages
          .filter((message) => typeof message?.content === 'string' && message.content.trim())
          .map((message) => ({
            role: message.role === 'assistant' ? 'assistant' : 'user',
            content: message.content.trim(),
          }))
      : [];

    if (cleanedMessages.length === 0) {
      return res.status(400).json({ error: 'messages is required' });
    }

    const settings = await getUserSettings(req.user.id, req.user.role);
    const reply = await chatWithEssayGuide(
      question.trim(),
      essayDraft || '',
      cleanedMessages,
      buildAiInstructionForUser(req.user.role, settings),
    );
    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

router.post('/landing/george-washington', async (req, res, next) => {
  try {
    const cleanedMessages = Array.isArray(req.body?.messages)
      ? req.body.messages
          .filter((message) => typeof message?.content === 'string' && message.content.trim())
          .slice(-10)
          .map((message) => ({
            role: message.role === 'assistant' ? 'assistant' : 'user',
            content: message.content.trim(),
          }))
      : [];

    if (cleanedMessages.length === 0) {
      return res.status(400).json({ error: 'messages is required' });
    }

    const reply = await chatWithGeorgeWashington(cleanedMessages);
    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

router.post('/student-unit/chat', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { unitId, surface, messages } = req.body;

    if (!unitId) {
      return res.status(400).json({ error: 'unitId is required' });
    }

    if (!STUDENT_COPILOT_SURFACES.has(surface)) {
      return res.status(403).json({ error: 'Unit Copilot is only available on notes and personas.' });
    }

    const cleanedMessages = normalizeMessages(messages, 10);
    if (cleanedMessages.length === 0) {
      return res.status(400).json({ error: 'messages is required' });
    }

    const latestUserMessage = [...cleanedMessages].reverse().find((message) => message.role === 'user');
    if (latestUserMessage && looksLikeAssessmentAnswerRequest(latestUserMessage.content)) {
      return res.json({
        reply: "I can't help with quiz or assignment answers. I can help you review the notes, compare personas, or make a study plan instead.",
      });
    }

    const { unit, notes, personas, error: accessError, status } = await getStudentUnitCopilotContext(unitId, req.user.id);
    if (accessError) {
      return res.status(status).json({ error: accessError });
    }

    const settings = await getUserSettings(req.user.id, req.user.role);
    const reply = await chatWithStudentUnitCopilot(
      {
        unit,
        notes,
        personas,
        surface,
        studentName: req.user.display_name || '',
      },
      cleanedMessages,
      buildStudentAiInstruction(settings),
    );

    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

// POST /api/assistant/chat
router.post('/chat', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages is required' });
    }

    const cleanedMessages = messages
      .filter((message) => typeof message?.content === 'string' && message.content.trim())
      .slice(-12)
      .map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content.trim(),
      }));

    if (cleanedMessages.length === 0) {
      return res.status(400).json({ error: 'messages must include at least one non-empty message' });
    }

    const { data: classrooms } = await supabase
      .from('classrooms')
      .select('id, name')
      .eq('teacher_id', req.user.id);

    // Fetch all units across teacher's classrooms
    const classroomIds = (classrooms || []).map(c => c.id);
    let units = [];
    if (classroomIds.length > 0) {
      const { data: unitRows } = await supabase
        .from('units')
        .select('id, title, context, classroom_id, is_visible')
        .in('classroom_id', classroomIds);

      const classroomMap = Object.fromEntries((classrooms || []).map(c => [c.id, c.name]));
      units = (unitRows || []).map(u => ({
        id:             u.id,
        title:          u.title,
        context:        u.context,
        classroom_id:   u.classroom_id,
        classroom_name: classroomMap[u.classroom_id] || '',
        is_visible:     !!u.is_visible,
      }));
    }

    const settings = await getUserSettings(req.user.id, req.user.role);
    const result = await chatWithEpochAssistant(
      cleanedMessages,
      classrooms || [],
      units,
      buildTeacherAiInstruction(settings),
    );

    if (result.type === 'action') {
      if (result.name === 'create_classroom') {
        const { name } = result.args;
        return res.json({ action: { name: result.name, args: result.args, confirmMessage: `Create classroom "${name}"?` } });
      }

      if (result.name === 'create_unit') {
        const { title, classroom_name, due_date } = result.args;
        const duePart = due_date ? ` with due date ${due_date}` : '';
        const confirmMessage = `Create unit "${title}" in ${classroom_name}${duePart}?`;
        return res.json({ action: { name: result.name, args: result.args, confirmMessage } });
      }

      if (result.name === 'create_multiple_units') {
        const { classroom_name, units } = result.args;
        const unitList = units.map((u, i) => `${i + 1}. ${u.title}`).join('\n');
        const confirmMessage = `Create ${units.length} units in ${classroom_name}?\n\n${unitList}`;
        return res.json({ action: { name: result.name, args: result.args, confirmMessage } });
      }

      if (result.name === 'create_personas') {
        const { unit_id, unit_name, classroom_name, personas } = result.args;

        // Check for existing personas with the same names in this unit
        const { data: existing } = await supabase
          .from('personas')
          .select('name')
          .eq('unit_id', unit_id);

        const existingNames = (existing || []).map(p => p.name.toLowerCase());
        const duplicates = personas
          .map(p => p.name)
          .filter(n => existingNames.includes(n.toLowerCase()));

        const personaList = personas.map((p, i) => {
          const yearPart = p.year_start
            ? (p.year_end ? ` (${p.year_start}–${p.year_end})` : ` (b. ${p.year_start})`)
            : '';
          const locPart = p.location ? `, ${p.location}` : '';
          const dupFlag = duplicates.includes(p.name) ? ' ⚠ already exists' : '';
          return `${i + 1}. ${p.name}${yearPart}${locPart}${dupFlag}`;
        }).join('\n');

        const count = personas.length;
        const dupWarning = duplicates.length > 0
          ? `\n\n⚠ ${duplicates.join(', ')} already exist${duplicates.length === 1 ? 's' : ''} in this unit. Adding again will create a duplicate.`
          : '';
        const confirmMessage = `Create ${count} persona${count !== 1 ? 's' : ''} in "${unit_name}" (${classroom_name})?\n\n${personaList}${dupWarning}`;
        return res.json({ action: { name: result.name, args: result.args, confirmMessage } });
      }

      if (result.name === 'create_personas_in_every_unit') {
        const { classroom_name, units } = result.args;

        if (!Array.isArray(units) || units.length === 0) {
          return res.json({ reply: `I couldn't find any units in ${classroom_name || 'that classroom'} to add personas to yet.` });
        }

        const unitIds = units.map((unit) => unit.unit_id).filter(Boolean);
        const { data: existing } = await supabase
          .from('personas')
          .select('unit_id, name')
          .in('unit_id', unitIds);

        const existingNamesByUnit = (existing || []).reduce((acc, persona) => {
          const key = persona.unit_id;
          if (!acc[key]) acc[key] = new Set();
          acc[key].add(persona.name.toLowerCase());
          return acc;
        }, {});

        const unitBlocks = units.map((unit, unitIndex) => {
          const existingNames = existingNamesByUnit[unit.unit_id] || new Set();
          const duplicates = (unit.personas || [])
            .map((persona) => persona.name)
            .filter((name) => existingNames.has(name.toLowerCase()));

          const personaLines = (unit.personas || []).map((persona, personaIndex) => {
            const dupFlag = duplicates.includes(persona.name) ? ' ⚠ already exists' : '';
            return `   ${unitIndex + 1}.${personaIndex + 1} ${formatPersonaSummary(persona)}${dupFlag}`;
          }).join('\n');

          const dupWarning = duplicates.length > 0
            ? `\n   ⚠ Duplicates in this unit: ${duplicates.join(', ')}`
            : '';

          return `${unitIndex + 1}. ${unit.unit_name}\n${personaLines}${dupWarning}`;
        }).join('\n\n');

        const totalPersonas = units.reduce((sum, unit) => sum + ((unit.personas || []).length), 0);
        const confirmMessage = `Create ${totalPersonas} personas across ${units.length} unit${units.length === 1 ? '' : 's'} in "${classroom_name}"?\n\n${unitBlocks}`;
        return res.json({ action: { name: result.name, args: result.args, confirmMessage } });
      }

      if (result.name === 'set_unit_visibility') {
        const { unit_names, visible } = result.args;
        const verb = visible ? 'Make visible' : 'Hide';
        const nameList = unit_names.length === 1
          ? `"${unit_names[0]}"`
          : unit_names.map(n => `"${n}"`).join(', ');
        const confirmMessage = `${verb} ${nameList}?`;
        return res.json({ action: { name: result.name, args: result.args, confirmMessage } });
      }

      if (result.name === 'delete_unit') {
        const { unit_name, classroom_name } = result.args;
        const confirmMessage = `Delete unit "${unit_name}" from ${classroom_name}? This cannot be undone.`;
        return res.json({ action: { name: result.name, args: result.args, confirmMessage } });
      }

      if (result.name === 'delete_multiple_units') {
        const { classroom_name, unit_names } = result.args;
        const count = Array.isArray(unit_names) ? unit_names.length : 0;
        const unitList = count > 0 ? `\n\n${unit_names.map((name, index) => `${index + 1}. ${name}`).join('\n')}` : '';
        const confirmMessage = `Delete ${count} selected unit${count === 1 ? '' : 's'} from ${classroom_name}? This cannot be undone.${unitList}`;
        return res.json({ action: { name: result.name, args: result.args, confirmMessage } });
      }

      if (result.name === 'delete_all_units') {
        const { classroom_name, unit_names } = result.args;
        const count = Array.isArray(unit_names) ? unit_names.length : 0;
        const unitList = count > 0 ? `\n\n${unit_names.map((name, index) => `${index + 1}. ${name}`).join('\n')}` : '';
        const confirmMessage = `Delete all ${count} unit${count === 1 ? '' : 's'} in ${classroom_name}? This cannot be undone.${unitList}`;
        return res.json({ action: { name: result.name, args: result.args, confirmMessage } });
      }
    }

    res.json({ reply: result.content });
  } catch (err) {
    next(err);
  }
});

// POST /api/assistant/execute
router.post('/execute', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const { action } = req.body;
    if (!action?.name) return res.status(400).json({ error: 'action.name is required' });

    if (action.name === 'create_unit') {
      const { title, context, classroom_id, is_visible, due_date } = action.args;

      if (!title || !classroom_id) {
        return res.status(400).json({ error: 'title and classroom_id are required' });
      }

      const { data: classroom } = await supabase
        .from('classrooms')
        .select('id, name')
        .eq('id', classroom_id)
        .eq('teacher_id', req.user.id)
        .single();

      if (!classroom) return res.status(403).json({ error: 'Classroom not found or access denied' });

      const { data: unit, error } = await supabase
        .from('units')
        .insert({ classroom_id, title, context: context || null, is_visible: is_visible ?? false, due_date: due_date || null })
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        message: `Unit "${title}" created in ${classroom.name}.`,
        unit,
      });
    }

    if (action.name === 'create_classroom') {
      const { name } = action.args;
      if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

      let join_code, attempts = 0;
      while (attempts < 10) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const candidate = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const { data: existing } = await supabase.from('classrooms').select('id').eq('join_code', candidate).single();
        if (!existing) { join_code = candidate; break; }
        attempts++;
      }
      if (!join_code) throw new Error('Failed to generate unique join code');

      const { data: classroom, error } = await supabase
        .from('classrooms')
        .insert({ name: name.trim(), teacher_id: req.user.id, join_code })
        .select().single();

      if (error) throw error;
      return res.json({ success: true, message: `Classroom "${classroom.name}" created. Join code: ${classroom.join_code}`, classroom });
    }

    if (action.name === 'create_personas') {
      const { unit_id, unit_name, personas } = action.args;

      if (!unit_id || !Array.isArray(personas) || personas.length === 0) {
        return res.status(400).json({ error: 'unit_id and personas are required' });
      }

      const { data: unit } = await supabase
        .from('units')
        .select('id, classroom_id, classrooms!inner(teacher_id)')
        .eq('id', unit_id)
        .eq('classrooms.teacher_id', req.user.id)
        .single();

      if (!unit) return res.status(403).json({ error: 'Unit not found or access denied' });

      const { data: created, error } = await supabase
        .from('personas')
        .insert(personas.map(p => ({
          unit_id,
          name:        p.name,
          description: p.description || null,
          min_turns:   p.min_turns   || 5,
          year_start:  p.year_start  ? Number(p.year_start) : null,
          year_end:    p.year_end    ? Number(p.year_end)   : null,
          location:    p.location    || null,
        })))
        .select();

      if (error) throw error;

      const count = created.length;
      return res.json({
        success: true,
        message: `${count} persona${count !== 1 ? 's' : ''} created in "${unit_name}".`,
        personas: created,
      });
    }

    if (action.name === 'create_personas_in_every_unit') {
      const { classroom_id, classroom_name, units } = action.args;

      if (!classroom_id || !Array.isArray(units) || units.length === 0) {
        return res.status(400).json({ error: 'classroom_id and units are required' });
      }

      const { data: classroom } = await supabase
        .from('classrooms')
        .select('id, name')
        .eq('id', classroom_id)
        .eq('teacher_id', req.user.id)
        .single();

      if (!classroom) return res.status(403).json({ error: 'Classroom not found or access denied' });

      const unitIds = units.map((unit) => unit.unit_id).filter(Boolean);
      if (unitIds.length !== units.length) {
        return res.status(400).json({ error: 'Each unit must include a unit_id' });
      }

      const { data: ownedUnits } = await supabase
        .from('units')
        .select('id')
        .eq('classroom_id', classroom_id)
        .in('id', unitIds);

      if (!ownedUnits || ownedUnits.length !== unitIds.length) {
        return res.status(403).json({ error: 'One or more units not found or access denied' });
      }

      const rowsToInsert = units.flatMap((unit) => (
        (unit.personas || []).map((persona) => ({
          unit_id:      unit.unit_id,
          name:         persona.name,
          description:  persona.description || null,
          min_turns:    persona.min_turns || 5,
          year_start:   persona.year_start ? Number(persona.year_start) : null,
          year_end:     persona.year_end ? Number(persona.year_end) : null,
          location:     persona.location || null,
        }))
      ));

      if (rowsToInsert.length === 0) {
        return res.status(400).json({ error: 'At least one persona is required' });
      }

      const { data: created, error } = await supabase
        .from('personas')
        .insert(rowsToInsert)
        .select();

      if (error) throw error;

      return res.json({
        success: true,
        message: `${created.length} personas created across ${units.length} unit${units.length === 1 ? '' : 's'} in "${classroom_name || classroom.name}".`,
        personas: created,
      });
    }

    if (action.name === 'create_multiple_units') {
      const { classroom_id, units } = action.args;

      if (!classroom_id || !Array.isArray(units) || units.length === 0) {
        return res.status(400).json({ error: 'classroom_id and units are required' });
      }

      const { data: classroom } = await supabase
        .from('classrooms')
        .select('id, name')
        .eq('id', classroom_id)
        .eq('teacher_id', req.user.id)
        .single();

      if (!classroom) return res.status(403).json({ error: 'Classroom not found or access denied' });

      const { is_visible } = action.args;

      const { data: created, error } = await supabase
        .from('units')
        .insert(units.map((u, i) => ({
          classroom_id,
          title:       u.title,
          context:     u.context || null,
          is_visible:  is_visible ?? false,
          order_index: i,
        })))
        .select();

      if (error) throw error;

      return res.json({
        success: true,
        message: `${created.length} units created in ${classroom.name}.`,
        units: created,
      });
    }

    if (action.name === 'set_unit_visibility') {
      const { unit_ids, unit_names, visible } = action.args;

      if (!Array.isArray(unit_ids) || unit_ids.length === 0) {
        return res.status(400).json({ error: 'unit_ids array is required' });
      }

      // Verify teacher owns all these units via classroom ownership
      const { data: ownedUnits } = await supabase
        .from('units')
        .select('id, classroom_id, classrooms!inner(teacher_id)')
        .in('id', unit_ids)
        .eq('classrooms.teacher_id', req.user.id);

      if (!ownedUnits || ownedUnits.length !== unit_ids.length) {
        return res.status(403).json({ error: 'One or more units not found or access denied' });
      }

      const { error } = await supabase
        .from('units')
        .update({ is_visible: visible })
        .in('id', unit_ids);

      if (error) throw error;

      const verb = visible ? 'visible' : 'hidden';
      const nameList = unit_names.length === 1
        ? `"${unit_names[0]}"`
        : `${unit_names.length} units`;
      return res.json({
        success: true,
        message: `${nameList} ${unit_names.length === 1 ? 'is' : 'are'} now ${verb}.`,
      });
    }

    if (action.name === 'delete_unit') {
      const { unit_id, unit_name } = action.args;

      if (!unit_id) {
        return res.status(400).json({ error: 'unit_id is required' });
      }

      const { data: ownedUnit } = await supabase
        .from('units')
        .select('id, title, classroom_id, classrooms!inner(teacher_id)')
        .eq('id', unit_id)
        .eq('classrooms.teacher_id', req.user.id)
        .single();

      if (!ownedUnit) {
        return res.status(403).json({ error: 'Unit not found or access denied' });
      }

      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', unit_id);

      if (error) throw error;

      return res.json({
        success: true,
        message: `Unit "${unit_name || ownedUnit.title}" deleted.`,
      });
    }

    if (action.name === 'delete_multiple_units') {
      const { classroom_id, classroom_name, unit_ids, unit_names } = action.args;

      if (!classroom_id || !Array.isArray(unit_ids) || unit_ids.length === 0) {
        return res.status(400).json({ error: 'classroom_id and unit_ids are required' });
      }

      const { data: classroom } = await supabase
        .from('classrooms')
        .select('id, name')
        .eq('id', classroom_id)
        .eq('teacher_id', req.user.id)
        .single();

      if (!classroom) {
        return res.status(403).json({ error: 'Classroom not found or access denied' });
      }

      const { data: ownedUnits } = await supabase
        .from('units')
        .select('id')
        .eq('classroom_id', classroom_id)
        .in('id', unit_ids);

      if (!ownedUnits || ownedUnits.length !== unit_ids.length) {
        return res.status(403).json({ error: 'One or more units not found or access denied' });
      }

      const { error } = await supabase
        .from('units')
        .delete()
        .in('id', unit_ids);

      if (error) throw error;

      const count = unit_ids.length;
      return res.json({
        success: true,
        message: `Deleted ${count} unit${count === 1 ? '' : 's'} from ${classroom_name || classroom.name}.`,
        unit_names,
      });
    }

    if (action.name === 'delete_all_units') {
      const { classroom_id, classroom_name, unit_ids, unit_names } = action.args;

      if (!classroom_id || !Array.isArray(unit_ids) || unit_ids.length === 0) {
        return res.status(400).json({ error: 'classroom_id and unit_ids are required' });
      }

      const { data: classroom } = await supabase
        .from('classrooms')
        .select('id, name')
        .eq('id', classroom_id)
        .eq('teacher_id', req.user.id)
        .single();

      if (!classroom) {
        return res.status(403).json({ error: 'Classroom not found or access denied' });
      }

      const { data: ownedUnits } = await supabase
        .from('units')
        .select('id')
        .eq('classroom_id', classroom_id)
        .in('id', unit_ids);

      if (!ownedUnits || ownedUnits.length !== unit_ids.length) {
        return res.status(403).json({ error: 'One or more units not found or access denied' });
      }

      const { error } = await supabase
        .from('units')
        .delete()
        .in('id', unit_ids);

      if (error) throw error;

      const count = unit_ids.length;
      return res.json({
        success: true,
        message: `Deleted ${count} unit${count === 1 ? '' : 's'} from ${classroom_name || classroom.name}${Array.isArray(unit_names) && unit_names.length ? '.' : '.'}`,
      });
    }

    return res.status(400).json({ error: `Unknown action: ${action.name}` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
