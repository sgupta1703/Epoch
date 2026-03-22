import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import UnitCard from '../../components/UnitCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getClassrooms, getClassroom } from '../../api/classrooms';
import { getUnits } from '../../api/units';
import '../../styles/pages.css';
import './Student.css';

export default function StudentClassroom({ user }) {
  const { classroomId } = useParams();
  const [classrooms, setClassrooms] = useState([]);
  const [classroom, setClassroom] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAll();
  }, [classroomId]);

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const [{ classrooms }, { classroom }, { units }] = await Promise.all([
        getClassrooms(),
        getClassroom(classroomId),
        getUnits(classroomId),
      ]);
      setClassrooms(classrooms);
      setClassroom(classroom);
      setUnits(units);
    } catch {
      setError('Failed to load classroom.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <>
      <Navbar user={user} />
      <div className="app-shell">
        <Sidebar classrooms={[]} activeId={classroomId} role="student" loading={loading} />
        <main className="page-main"><LoadingSpinner fullPage label="Loading…" /></main>
      </div>
    </>
  );

  return (
    <>
      <Navbar user={user} />
      <div className="app-shell">
        <Sidebar classrooms={classrooms} activeId={classroomId} role="student" loading={loading} />

        <main className="page-main">
          <div className="page-header">
            <div className="page-header-left">
              <p className="page-eyebrow">Class</p>
              <h1 className="page-title">{classroom?.name}</h1>
              <p className="page-subtitle">{units.length} unit{units.length !== 1 ? 's' : ''} available</p>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {units.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"></div>
              <h3>No units yet</h3>
              <p>Your teacher hasn't published any units yet. Check back soon.</p>
            </div>
          ) : (
            <div className="cards-grid">
              {units.map(unit => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  role="student"
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
