const supabase = require('./supabaseClient');

const DEFAULT_SETTINGS = {
  teacher: {
    view_density: 'comfortable',
    default_landing: 'dashboard',
    reduce_motion: false,
    show_course_stats: true,
    ai_response_style: 'balanced',
    ai_tone: 'direct',
    ai_creativity: 'balanced',
    ai_citation_mode: 'recommended',
    ai_student_reading_level: 'grade-level',
    ai_feedback_focus: 'historical-thinking',
  },
  student: {
    view_density: 'comfortable',
    default_landing: 'dashboard',
    reduce_motion: false,
    show_due_dates_first: true,
    ai_explanation_style: 'guided',
    ai_tone: 'encouraging',
    ai_help_depth: 'step-by-step',
    ai_source_focus: 'balanced',
    ai_confidence_checks: true,
  },
};

const VIEW_KEYS = new Set([
  'view_density',
  'default_landing',
  'reduce_motion',
  'show_course_stats',
  'show_due_dates_first',
]);

function splitSettings(settings = {}) {
  const view_settings = {};
  const ai_settings = {};

  for (const [key, value] of Object.entries(settings)) {
    if (VIEW_KEYS.has(key)) view_settings[key] = value;
    else ai_settings[key] = value;
  }

  return { view_settings, ai_settings };
}

function mergeSettings(role, row) {
  return {
    ...DEFAULT_SETTINGS[role],
    ...(row?.view_settings || {}),
    ...(row?.ai_settings || {}),
  };
}

async function getUserSettings(userId, role) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('view_settings, ai_settings')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return mergeSettings(role, data);
}

async function saveUserSettings(userId, role, settings) {
  const merged = { ...DEFAULT_SETTINGS[role], ...(settings || {}) };
  const { view_settings, ai_settings } = splitSettings(merged);

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      view_settings,
      ai_settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('view_settings, ai_settings')
    .single();

  if (error) throw error;
  return mergeSettings(role, data);
}

async function resetUserSettings(userId, role) {
  return saveUserSettings(userId, role, DEFAULT_SETTINGS[role]);
}

function buildTeacherAiInstruction(settings = {}) {
  const styleMap = {
    concise: 'Keep responses concise and high signal.',
    balanced: 'Balance clarity with useful detail.',
    detailed: 'Provide fuller detail, examples, and rationale.',
  };
  const toneMap = {
    direct: 'Use a direct professional tone.',
    supportive: 'Use a supportive coaching tone.',
    socratic: 'Prefer questioning and guided reflection when helpful.',
  };
  const creativityMap = {
    conservative: 'Prefer reliable, conventional outputs over novelty.',
    balanced: 'Balance reliability with some originality.',
    creative: 'Allow more inventive ideas while staying historically grounded.',
  };
  const citationMap = {
    recommended: 'When helpful, recommend useful source directions or evidence to consult.',
    'cite-when-possible': 'When possible, anchor claims in concrete evidence or references.',
    minimal: 'Do not over-emphasize citations unless the task clearly needs them.',
  };
  const readingMap = {
    scaffolded: 'Default explanations to a scaffolded reading level for struggling learners.',
    'grade-level': 'Default explanations to a typical grade-level history classroom.',
    advanced: 'Default explanations to an advanced college-prep classroom level.',
  };
  const feedbackMap = {
    'historical-thinking': 'Prioritize historical thinking, causation, sourcing, and contextualization in feedback.',
    'writing-quality': 'Prioritize clarity, structure, and writing quality in feedback.',
    'evidence-use': 'Prioritize evidence quality and use of sources in feedback.',
  };

  return [
    styleMap[settings.ai_response_style],
    toneMap[settings.ai_tone],
    creativityMap[settings.ai_creativity],
    citationMap[settings.ai_citation_mode],
    readingMap[settings.ai_student_reading_level],
    feedbackMap[settings.ai_feedback_focus],
  ].filter(Boolean).join(' ');
}

function buildStudentAiInstruction(settings = {}) {
  const styleMap = {
    guided: 'Use a guided teaching style that nudges rather than simply gives answers.',
    balanced: 'Balance direct explanation with guided learning.',
    direct: 'Be more direct and explicit when explaining.',
  };
  const toneMap = {
    encouraging: 'Use an encouraging, confidence-building tone.',
    neutral: 'Use a calm neutral academic tone.',
    challenging: 'Push the student with a more demanding coaching tone.',
  };
  const depthMap = {
    light: 'Keep help light and avoid over-scaffolding.',
    'step-by-step': 'Break difficult tasks into clear step-by-step support.',
    'deep-coaching': 'Offer deeper coaching and more structured support.',
  };
  const sourceMap = {
    balanced: 'Balance conceptual explanation with source-based prompting.',
    'source-first': 'Strongly direct the student back to the text, evidence, and sources.',
    'concept-first': 'Start with the concept, then connect back to evidence.',
  };

  return [
    styleMap[settings.ai_explanation_style],
    toneMap[settings.ai_tone],
    depthMap[settings.ai_help_depth],
    sourceMap[settings.ai_source_focus],
    settings.ai_confidence_checks ? 'Ask occasional quick confidence-check questions before moving on.' : 'Do not add extra confidence-check questions unless needed.',
  ].filter(Boolean).join(' ');
}

module.exports = {
  DEFAULT_SETTINGS,
  getUserSettings,
  saveUserSettings,
  resetUserSettings,
  buildTeacherAiInstruction,
  buildStudentAiInstruction,
};
