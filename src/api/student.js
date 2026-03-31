import api from './axiosInstance';

export async function getStudentDashboard() {
  const res = await api.get('/api/student/dashboard');
  return res.data;
}

export async function getStudentDashboardPriorities() {
  const res = await api.get('/api/student/dashboard/priorities');
  return res.data;
}
