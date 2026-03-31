import api from './axiosInstance';

export async function getPersonas(unitId) {
  const res = await api.get(`/api/units/${unitId}/personas`);
  return res.data;
}

export async function createPersona(unitId, { name, description, min_turns, due_date, year_start, year_end, location, mode, missions }) {
  const res = await api.post(`/api/units/${unitId}/personas`, {
    name,
    description: description || null,
    min_turns: min_turns ?? 5,
    due_date: due_date || null,
    year_start: year_start || null,
    year_end: year_end || null,
    location: location || null,
    mode: mode || 'free',
    missions: missions || [],
  });
  return res.data;
}

export async function updatePersona(personaId, updates) {
  const res = await api.patch(`/api/personas/${personaId}`, updates);
  return res.data;
}

export async function deletePersona(personaId) {
  const res = await api.delete(`/api/personas/${personaId}`);
  return res.data;
}

export async function generateMissions(personaId) {
  const res = await api.post(`/api/personas/${personaId}/generate-missions`);
  return res.data;
}

export async function sendMessage(personaId, { message }) {
  const res = await api.post(`/api/personas/${personaId}/chat`, { message });
  return res.data;
}

export async function updateMissionsProgress(personaId, completedMissions) {
  const res = await api.patch(`/api/personas/${personaId}/missions-progress`, { completed_missions: completedMissions });
  return res.data;
}

export async function getConversation(personaId, studentId) {
  const params = studentId ? { student_id: studentId } : {};
  const res = await api.get(`/api/personas/${personaId}/conversation`, { params });
  return res.data;
}

export async function generatePersonaQuiz(personaId) {
  const res = await api.post(`/api/personas/${personaId}/quiz/generate`);
  return res.data;
}

export async function submitPersonaQuiz(personaId, answers) {
  const res = await api.post(`/api/personas/${personaId}/quiz/submit`, { answers });
  return res.data;
}

export async function getPersonaQuiz(personaId) {
  const res = await api.get(`/api/personas/${personaId}/quiz`);
  return res.data;
}

export async function getAllPersonaQuizResults(personaId) {
  const res = await api.get(`/api/personas/${personaId}/quiz/all`);
  return res.data;
}
