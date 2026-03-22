import api from './axiosInstance';

/**
 * Get the assignment + sources + questions for a unit.
 * Students don't receive correct_answer on questions.
 * @param {string} unitId
 * @returns {{ assignment: object|null }}
 */
export async function getAssignment(unitId) {
  const res = await api.get(`/api/units/${unitId}/assignment`);
  return res.data;
}

/**
 * AI-generate sources and questions from the unit's context. (Teacher only)
 * @param {string} unitId
 * @param {{ source_count?: number, question_count?: number }} options
 * @returns {{ assignment: object }}
 */
export async function generateAssignment(unitId, { source_count = 2, question_count = 4 } = {}) {
  const res = await api.post(`/api/units/${unitId}/assignment/generate`, {
    source_count,
    question_count,
  });
  return res.data;
}

/**
 * Save the full assignment (sources + questions + due date). (Teacher only)
 * Replaces all existing sources and questions.
 * @param {string} unitId
 * @param {{ sources: object[], questions: object[], due_date?: string }} data
 * Each source: { title, content, source_type: 'primary'|'secondary', format: 'real'|'ai_generated', order_index? }
 * Each question: { question_text, type: 'multiple_choice'|'short_answer'|'essay', options?, correct_answer, order_index? }
 * @returns {{ assignment: object }}
 */
export async function saveAssignment(unitId, { sources, questions, due_date }) {
  const res = await api.put(`/api/units/${unitId}/assignment`, {
    sources,
    questions,
    due_date: due_date || null,
  });
  return res.data;
}

/**
 * Submit a student's answers for an assignment. (Student only)
 * Can only be submitted once. Graded automatically on submission.
 * @param {string} unitId
 * @param {{ answers: { question_id: string, answer: string }[] }} data
 * @returns {{ submission: object }}
 */
export async function submitAssignment(unitId, { answers }) {
  const res = await api.post(`/api/units/${unitId}/assignment/submit`, { answers });
  return res.data;
}

/**
 * Get a student's assignment submission.
 * Teacher: can view any student. Student: own only.
 * @param {string} unitId
 * @param {string} studentId
 * @returns {{ submission: object|null }}
 */
export async function getAssignmentResults(unitId, studentId) {
  const res = await api.get(`/api/units/${unitId}/assignment/results/${studentId}`);
  return res.data;
}

/**
 * Get all student submissions for an assignment. (Teacher only)
 * @param {string} unitId
 * @returns {{ submissions: object[] }}
 */
export async function getAllAssignmentResults(unitId) {
  const res = await api.get(`/api/units/${unitId}/assignment/all-results`);
  return res.data;
}