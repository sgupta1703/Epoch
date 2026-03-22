import api from './axiosInstance';

export async function chatWithAssistant(messages) {
  const res = await api.post('/api/assistant/chat', { messages });
  return res.data;
}
