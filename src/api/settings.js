import api from './axiosInstance';

export async function getSettings() {
  const res = await api.get('/api/settings');
  return res.data;
}

export async function saveSettings(settings) {
  const res = await api.put('/api/settings', { settings });
  return res.data;
}

export async function resetSettings() {
  const res = await api.post('/api/settings/reset');
  return res.data;
}
