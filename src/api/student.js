import api from './axiosInstance';

export async function getStudentDashboard() {
  const res = await api.get('/api/student/dashboard');
  return res.data;
}
