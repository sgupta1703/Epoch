import api from './axiosInstance';

export async function getClassrooms() {
  const res = await api.get('/api/classrooms');
  return res.data;
}

export async function getClassroom(classroomId) {
  const res = await api.get(`/api/classrooms/${classroomId}`);
  return res.data;
}

export async function createClassroom({ name }) {
  const res = await api.post('/api/classrooms', { name });
  return res.data;
}

export async function updateClassroom(classroomId, fields) {
  const res = await api.patch(`/api/classrooms/${classroomId}`, fields);
  return res.data;
}

export async function regenerateJoinCode(classroomId) {
  const res = await api.post(`/api/classrooms/${classroomId}/regenerate-code`);
  return res.data;
}

export async function deleteClassroom(classroomId) {
  const res = await api.delete(`/api/classrooms/${classroomId}`);
  return res.data;
}

export async function joinClassroom({ join_code }) {
  const res = await api.post('/api/classrooms/join', { join_code });
  return res.data;
}

export async function getClassroomStudents(classroomId) {
  const res = await api.get(`/api/classrooms/${classroomId}/students`);
  return res.data;
}

export async function removeStudent(classroomId, studentId) {
  const res = await api.delete(`/api/classrooms/${classroomId}/students/${studentId}`);
  return res.data;
}

/**
 * Full performance breakdown for one student across every unit.
 * Returns { student, performance: { overall, units: [...] } }
 * Each unit has: unit_id, unit_title, quiz: { score, ... } | null, assignment: { score, ... } | null
 * @param {string} classroomId
 * @param {string} studentId
 */
export async function getStudentPerformance(classroomId, studentId) {
  const res = await api.get(`/api/classrooms/${classroomId}/students/${studentId}/performance`);
  return res.data;
}

/**
 * At-a-glance performance for every student across every unit.
 * Returns { units: [{id, title}], results: [{ student, performance: { overall, units } }] }
 * @param {string} classroomId
 */
export async function getClassroomPerformance(classroomId) {
  const res = await api.get(`/api/classrooms/${classroomId}/performance`);
  return res.data;
}

export async function getClassAnalysis(classroomId) {
  const res = await api.get(`/api/classrooms/${classroomId}/analyze`);
  return res.data;
}

export async function analyzeClassPerformance(classroomId) {
  const res = await api.post(`/api/classrooms/${classroomId}/analyze`);
  return res.data;
}

export async function getStudentScores(classroomId) {
  const res = await api.get(`/api/student/classrooms/${classroomId}/scores`);
  return res.data;
}