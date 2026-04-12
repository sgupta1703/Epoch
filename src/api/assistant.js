import api from './axiosInstance';

export async function chatWithAssistant(messages) {
  const res = await api.post('/api/assistant/chat', { messages });
  return res.data;
}

export async function executeAssistantAction(action) {
  const res = await api.post('/api/assistant/execute', { action });
  return res.data;
}

export async function chatWithLandingGeorgeWashington(messages) {
  const res = await api.post('/api/assistant/landing/george-washington', { messages });
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

export async function decodeEssayQuestionApi(question) {
  const res = await api.post('/api/assistant/essay-guide/decode', { question });
  return res.data;
}

export async function coachEssayDraftApi(question, draft, mode, customPrompt) {
  const res = await api.post('/api/assistant/essay-guide/coach', { question, draft, mode, customPrompt });
  return res.data;
}

export async function rateThesisAttemptApi(question, thesis) {
  const res = await api.post('/api/assistant/essay-guide/practice/thesis', { question, thesis });
  return res.data;
}

export async function organizeEvidenceVaultApi(question, evidence) {
  const res = await api.post('/api/assistant/essay-guide/practice/evidence', { question, evidence });
  return res.data;
}

export async function generateCounterargumentsApi(question, thesis) {
  const res = await api.post('/api/assistant/essay-guide/practice/counter', { question, thesis });
  return res.data;
}

export async function evaluateRebuttalApi(question, thesis, counterargument, rebuttal) {
  const res = await api.post('/api/assistant/essay-guide/practice/rebuttal', { question, thesis, counterargument, rebuttal });
  return res.data;
}
