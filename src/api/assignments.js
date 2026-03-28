import api from './axiosInstance';

export async function getAssignment(unitId) {
  const res = await api.get(`/api/units/${unitId}/assignment`);
  return res.data;
}

export async function generateAssignment(unitId, { source_count = 2, question_count = 4 } = {}) {
  const res = await api.post(`/api/units/${unitId}/assignment/generate`, { source_count, question_count });
  return res.data;
}

export async function saveAssignment(unitId, { sources, questions, due_date, essay_guide_enabled }) {
  const res = await api.put(`/api/units/${unitId}/assignment`, {
    sources,
    questions,
    due_date: due_date || null,
    essay_guide_enabled: essay_guide_enabled ?? true,
  });
  return res.data;
}

export async function submitAssignment(unitId, { answers }) {
  const res = await api.post(`/api/units/${unitId}/assignment/submit`, { answers });
  return res.data;
}

export async function getAssignmentResults(unitId, studentId) {
  const res = await api.get(`/api/units/${unitId}/assignment/results/${studentId}`);
  return res.data;
}

export async function getAllAssignmentResults(unitId) {
  const res = await api.get(`/api/units/${unitId}/assignment/all-results`);
  return res.data;
}