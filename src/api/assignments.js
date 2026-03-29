import api from './axiosInstance';

export async function getAssignments(unitId) {
  const res = await api.get(`/api/units/${unitId}/assignments`);
  return res.data;
}

export async function createAssignment(unitId, { name, due_date } = {}) {
  const res = await api.post(`/api/units/${unitId}/assignments`, { name, due_date });
  return res.data;
}

export async function deleteAssignment(unitId, assignmentId) {
  const res = await api.delete(`/api/units/${unitId}/assignments/${assignmentId}`);
  return res.data;
}

export async function getAssignment(unitId, assignmentId) {
  const res = await api.get(`/api/units/${unitId}/assignments/${assignmentId}`);
  return res.data;
}

export async function generateAssignment(unitId, assignmentId, { source_count = 2, question_count = 4 } = {}) {
  const res = await api.post(`/api/units/${unitId}/assignments/${assignmentId}/generate`, { source_count, question_count });
  return res.data;
}

export async function saveAssignment(unitId, assignmentId, { sources, questions, due_date, essay_guide_enabled, name }) {
  const res = await api.put(`/api/units/${unitId}/assignments/${assignmentId}`, {
    sources,
    questions,
    due_date: due_date || null,
    essay_guide_enabled: essay_guide_enabled ?? true,
    name,
  });
  return res.data;
}

export async function submitAssignment(unitId, assignmentId, { answers }) {
  const res = await api.post(`/api/units/${unitId}/assignments/${assignmentId}/submit`, { answers });
  return res.data;
}

export async function getAssignmentResults(unitId, assignmentId, studentId) {
  const res = await api.get(`/api/units/${unitId}/assignments/${assignmentId}/results/${studentId}`);
  return res.data;
}

export async function getAllAssignmentResults(unitId, assignmentId) {
  const res = await api.get(`/api/units/${unitId}/assignments/${assignmentId}/all-results`);
  return res.data;
}
