import api from './axiosInstance';

/**
 * Get the notes page for a unit.
 * Returns null in the notes field if notes haven't been created yet.
 * @param {string} unitId
 * @returns {{ notes: object|null }}
 */
export async function getNotes(unitId) {
  const res = await api.get(`/api/units/${unitId}/notes`);
  return res.data;
}

/**
 * AI-generate notes for a unit from its context. (Teacher only)
 * The unit must have a context set before calling this.
 * Overwrites any existing notes for the unit.
 * @param {string} unitId
 * @returns {{ notes: object }}
 */
export async function generateNotes(unitId) {
  const res = await api.post(`/api/units/${unitId}/notes/generate`);
  return res.data;
}

/**
 * Save or overwrite notes content manually. (Teacher only)
 * @param {string} unitId
 * @param {{ content: string, due_date?: string }} data
 * @returns {{ notes: object }}
 */
export async function saveNotes(unitId, { content, due_date }) {
  const res = await api.put(`/api/units/${unitId}/notes`, {
    content,
    due_date: due_date || null,
  });
  return res.data;
}