import api from './axiosInstance';

export async function getProfileStats() {
  const res = await api.get('/api/profile/stats');
  return res.data;
}

export async function getEnrolledClasses() {
  const res = await api.get('/api/profile/classes');
  return res.data;
}

export async function updateProfile({ display_name, email }) {
  const res = await api.put('/api/profile', { display_name, email });
  return res.data;
}

export async function changePassword({ current_password, new_password }) {
  const res = await api.put('/api/profile/password', { current_password, new_password });
  return res.data;
}

export async function leaveClassroom(classroomId) {
  const res = await api.delete(`/api/profile/classes/${classroomId}`);
  return res.data;
}
