import api from './axiosInstance';

export async function getQuiz(unitId) {
  const res = await api.get(`/api/units/${unitId}/quiz`);
  return res.data;
}

export async function generateQuiz(unitId, { count = 10 } = {}) {
  const res = await api.post(`/api/units/${unitId}/quiz/generate`, { count });
  return res.data;
}

export async function saveQuizQuestions(unitId, { questions, due_date }) {
  const res = await api.put(`/api/units/${unitId}/quiz/questions`, {
    questions,
    due_date: due_date || null,
  });
  return res.data;
}

export async function submitQuiz(unitId, { answers }) {
  const res = await api.post(`/api/units/${unitId}/quiz/submit`, { answers });
  return res.data;
}

export async function getQuizResults(unitId, studentId) {
  const res = await api.get(`/api/units/${unitId}/quiz/results/${studentId}`);
  return res.data;
}

export async function gradeQuiz(unitId, studentId) {
  const res = await api.post(`/api/units/${unitId}/quiz/grade/${studentId}`);
  return res.data;
}

export async function getAllQuizResults(unitId) {
  const res = await api.get(`/api/units/${unitId}/quiz/all-results`);
  return res.data;
}

export async function analyzeStudentQuiz(unitId, studentId) {
  const res = await api.post(`/api/units/${unitId}/quiz/analyze/${studentId}`);
  return res.data;
}

/**
 * Teacher manually overrides SA scores for a submission.
 * Also triggers a full recalculation of the overall score on the backend.
 * @param {string} unitId
 * @param {string} submissionId
 * @param {{ question_id: string, score: number, feedback?: string }[]} overrides
 * @returns {{ submission: object }}
 */
export async function overrideSaGrades(unitId, submissionId, overrides) {
  const res = await api.patch(
    `/api/units/${unitId}/quiz/submissions/${submissionId}/sa`,
    { overrides }
  );
  return res.data;
}