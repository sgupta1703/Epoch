import api from './axiosInstance';

export async function getQuizzes(unitId) {
  const res = await api.get(`/api/units/${unitId}/quizzes`);
  return res.data;
}

export async function createQuiz(unitId, { name, context, due_date } = {}) {
  const res = await api.post(`/api/units/${unitId}/quizzes`, { name, context, due_date });
  return res.data;
}

export async function getQuizById(unitId, quizId) {
  const res = await api.get(`/api/units/${unitId}/quizzes/${quizId}`);
  return res.data;
}

export async function updateQuizMeta(unitId, quizId, { name, context, due_date, essay_guide_enabled } = {}) {
  const res = await api.put(`/api/units/${unitId}/quizzes/${quizId}`, { name, context, due_date, essay_guide_enabled });
  return res.data;
}

export async function deleteQuiz(unitId, quizId) {
  const res = await api.delete(`/api/units/${unitId}/quizzes/${quizId}`);
  return res.data;
}

export async function generateQuiz(unitId, quizId, { count = 10 } = {}) {
  const res = await api.post(`/api/units/${unitId}/quizzes/${quizId}/generate`, { count });
  return res.data;
}

export async function saveQuizQuestions(unitId, quizId, { questions }) {
  const res = await api.put(`/api/units/${unitId}/quizzes/${quizId}/questions`, { questions });
  return res.data;
}

export async function submitQuiz(unitId, quizId, { answers }) {
  const res = await api.post(`/api/units/${unitId}/quizzes/${quizId}/submit`, { answers });
  return res.data;
}

export async function getQuizResults(unitId, quizId, studentId) {
  const res = await api.get(`/api/units/${unitId}/quizzes/${quizId}/results/${studentId}`);
  return res.data;
}

export async function getAllQuizResults(unitId, quizId) {
  const res = await api.get(`/api/units/${unitId}/quizzes/${quizId}/all-results`);
  return res.data;
}

export async function analyzeStudentQuiz(unitId, quizId, studentId) {
  const res = await api.post(`/api/units/${unitId}/quizzes/${quizId}/analyze/${studentId}`);
  return res.data;
}

export async function overrideSaGrades(unitId, quizId, submissionId, overrides) {
  const res = await api.patch(
    `/api/units/${unitId}/quizzes/${quizId}/submissions/${submissionId}/sa`,
    { overrides }
  );
  return res.data;
}
