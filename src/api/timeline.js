import api from './axiosInstance';

export async function getTimeline(classroomId) {
  const res = await api.get(`/api/classrooms/${classroomId}/timeline`);
  return res.data;
}

export async function generateTimeline(classroomId) {
  const res = await api.post(`/api/classrooms/${classroomId}/timeline/generate`);
  return res.data;
}

export async function saveTimeline(classroomId, { title, events }) {
  const res = await api.put(`/api/classrooms/${classroomId}/timeline`, { title, events });
  return res.data;
}

export async function updateTimelineEvent(classroomId, eventId, updates) {
  const res = await api.patch(`/api/classrooms/${classroomId}/timeline/events/${eventId}`, updates);
  return res.data;
}

export async function deleteTimelineEvent(classroomId, eventId) {
  const res = await api.delete(`/api/classrooms/${classroomId}/timeline/events/${eventId}`);
  return res.data;
}