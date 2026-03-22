import api from './axiosInstance';

/**
 * Get all units for a classroom.
 * Teacher: all units. Student: visible units only.
 * @param {string} classroomId
 * @returns {{ units: object[] }}
 */
export async function getUnits(classroomId) {
  const res = await api.get(`/api/classrooms/${classroomId}/units`);
  return res.data;
}

/**
 * Get a single unit by ID.
 * @param {string} unitId
 * @returns {{ unit: object }}
 */
export async function getUnit(unitId) {
  const res = await api.get(`/api/units/${unitId}`);
  return res.data;
}

/**
 * Create a new unit inside a classroom. (Teacher only)
 * @param {string} classroomId
 * @param {{ title: string, context?: string, due_date?: string }} data
 * @returns {{ unit: object }}
 */
export async function createUnit(classroomId, { title, context, due_date }) {
  const res = await api.post(`/api/classrooms/${classroomId}/units`, {
    title,
    context: context || null,
    due_date: due_date || null,
  });
  return res.data;
}

/**
 * Update a unit's fields. (Teacher only)
 * Only include the fields you want to change.
 * @param {string} unitId
 * @param {{ title?: string, context?: string, is_visible?: boolean, due_date?: string }} updates
 * @returns {{ unit: object }}
 */
export async function updateUnit(unitId, updates) {
  const res = await api.patch(`/api/units/${unitId}`, updates);
  return res.data;
}

/**
 * Toggle a unit's visibility. (Teacher only — convenience wrapper)
 * @param {string} unitId
 * @param {boolean} isVisible
 * @returns {{ unit: object }}
 */
export async function setUnitVisibility(unitId, isVisible) {
  return updateUnit(unitId, { is_visible: isVisible });
}

/**
 * Delete a unit. (Teacher only)
 * @param {string} unitId
 * @returns {{ message: string }}
 */
export async function deleteUnit(unitId) {
  const res = await api.delete(`/api/units/${unitId}`);
  return res.data;
}

export async function reorderUnits(order) {
  const { data } = await api.patch('/api/units/reorder', { order });
  return data;
}
