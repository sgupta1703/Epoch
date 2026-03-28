import api from './axiosInstance';

export async function chatWithAssistant(messages) {
  const res = await api.post('/api/assistant/chat', { messages });
  return res.data;
}

export async function executeAssistantAction(action) {
  const res = await api.post('/api/assistant/execute', { action });
  return res.data;
}
