import { useState, useEffect, useCallback } from 'react';
import { getClassroom } from '../api/classrooms';
import { getUnits, setUnitVisibility, deleteUnit } from '../api/units';

/**
 * useClassroom — fetches and manages state for a single classroom and its units.
 *
 * @param {string} classroomId
 *
 * Returns:
 *   classroom       – classroom object | null
 *   units           – unit array
 *   loading         – boolean
 *   error           – string
 *   refresh         – () => Promise<void>   — re-fetch everything
 *   toggleVisibility – (unit) => Promise<void>
 *   removeUnit      – (unitId) => Promise<void>
 *   updateUnitInList – (updatedUnit) => void — optimistically update a unit in local state
 *
 * Usage:
 *   const { classroom, units, loading, toggleVisibility } = useClassroom(classroomId);
 */
export function useClassroom(classroomId) {
  const [classroom, setClassroom] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    if (!classroomId) return;
    setLoading(true);
    setError('');
    try {
      const [{ classroom }, { units }] = await Promise.all([
        getClassroom(classroomId),
        getUnits(classroomId),
      ]);
      setClassroom(classroom);
      setUnits(units);
    } catch {
      setError('Failed to load classroom.');
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  /**
   * Toggle a unit's is_visible flag on the server and update local state.
   */
  const toggleVisibility = useCallback(async (unit) => {
    try {
      const { unit: updated } = await setUnitVisibility(unit.id, !unit.is_visible);
      setUnits(prev => prev.map(u => u.id === updated.id ? updated : u));
    } catch {
      // Caller can handle re-fetching if needed
    }
  }, []);

  /**
   * Delete a unit on the server and remove it from local state.
   */
  const removeUnit = useCallback(async (unitId) => {
    try {
      await deleteUnit(unitId);
      setUnits(prev => prev.filter(u => u.id !== unitId));
    } catch {
      throw new Error('Failed to delete unit.');
    }
  }, []);

  /**
   * Optimistically patch a unit in the local list (e.g. after an updateUnit call).
   */
  const updateUnitInList = useCallback((updatedUnit) => {
    setUnits(prev => prev.map(u => u.id === updatedUnit.id ? updatedUnit : u));
  }, []);

  return {
    classroom,
    units,
    loading,
    error,
    refresh: fetch,
    toggleVisibility,
    removeUnit,
    updateUnitInList,
  };
}