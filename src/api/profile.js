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

export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);
  const token = localStorage.getItem('access_token');
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const res = await fetch(`${baseUrl}/api/profile/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Upload failed');
  return res.json();
}

export async function changePassword({ current_password, new_password }) {
  const res = await api.put('/api/profile/password', { current_password, new_password });
  return res.data;
}

export async function leaveClassroom(classroomId) {
  const res = await api.delete(`/api/profile/classes/${classroomId}`);
  return res.data;
}

export async function getTeacherStats() {
  const res = await api.get('/api/profile/teacher/stats');
  return res.data;
}

export async function getTeacherClasses() {
  const res = await api.get('/api/profile/teacher/classes');
  return res.data;
}

export async function deleteTeacherClass(classroomId) {
  const res = await api.delete(`/api/profile/teacher/classes/${classroomId}`);
  return res.data;
}

export async function renameTeacherClass(classroomId, name) {
  const res = await api.patch(`/api/profile/teacher/classes/${classroomId}`, { name });
  return res.data;
}
