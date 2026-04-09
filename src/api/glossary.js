import api from './axiosInstance';

export async function lookupTerm({ term, unit_title, unit_context, persona_name, persona_era, message_snippet }) {
  const res = await api.post('/api/glossary/lookup', {
    term, unit_title, unit_context, persona_name, persona_era, message_snippet,
  });
  return res.data;
}

export async function getGlossaryTerms(unitId) {
  const res = await api.get(`/api/glossary/unit/${unitId}`);
  return res.data;
}

export async function saveGlossaryTerm(unitId, { persona_id, term, context_info, message_index, message_snippet, user_notes }) {
  const res = await api.post(`/api/glossary/unit/${unitId}`, {
    persona_id, term, context_info, message_index, message_snippet, user_notes,
  });
  return res.data;
}

export async function updateGlossaryTerm(termId, { term, user_notes }) {
  const res = await api.patch(`/api/glossary/term/${termId}`, { term, user_notes });
  return res.data;
}

export async function deleteGlossaryTerm(termId) {
  const res = await api.delete(`/api/glossary/term/${termId}`);
  return res.data;
}
