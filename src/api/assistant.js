import api from './axiosInstance';

export async function chatWithAssistant(messages) {
  const res = await api.post('/api/assistant/chat', { messages });
  return res.data;
}

export async function executeAssistantAction(action) {
  const res = await api.post('/api/assistant/execute', { action });
  return res.data;
}

export async function evaluateEssayGuideOutline(question, outline) {
  const res = await api.post('/api/assistant/essay-guide/evaluate', { question, outline });
  return res.data;
}

export async function chatWithEssayGuideApi(question, essayDraft, messages) {
  const res = await api.post('/api/assistant/essay-guide/chat', { question, essayDraft, messages });
  return res.data;
}

export async function chatWithStudentUnitCopilotApi(unitId, surface, messages) {
  const res = await api.post('/api/assistant/student-unit/chat', { unitId, surface, messages });
  return res.data;
}
