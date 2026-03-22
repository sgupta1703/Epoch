import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getClassrooms } from '../../api/classrooms';
import { getUnit } from '../../api/units';
import '../../styles/pages.css';
import './Student.css';

const ACTIVITIES = [
  {
    key: 'notes',
    icon: '📄',
    label: 'Notes',
    description: 'Read the curated notes for this unit.',
    path: 'notes',
  },
  {
    key: 'personas',
    icon: '🎭',
    label: 'Personas',
    description: 'Have a conversation with historical figures from this period.',
    path: 'personas',
  },
  {
    key: 'quiz',
    icon: '📝',
    label: 'Quiz',
    description: 'Test your knowledge with a quiz on this unit.',
    path: 'quiz',
  },
  {
    key: 'assignment',
    icon: '📋',
    label: 'Assignment',
    description: 'Read primary and secondary sources and answer questions.',
    path: 'assignment',
  },
];

export default function StudentUnit({ user }) {
  const { classroomId, unitId } = useParams();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const studentSubtitle = 'Work through the activities below to complete this unit.';

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [{ classrooms }, { unit }] = await Promise.all([
          getClassrooms(),
          getUnit(unitId),
        ]);
        setClassrooms(classrooms);
        setUnit(unit);
      } catch {
        navigate(`/student/classroom/${classroomId}`);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [unitId]);

  if (loading) return (
    <>
      <Navbar user={user} />
      <div className="app-shell">
        <Sidebar classrooms={[]} activeId={classroomId} role="student" loading={loading} />
        <main className="page-main"><LoadingSpinner fullPage /></main>
      </div>
    </>
  );

  return (
    <>
      <Navbar user={user} />
      <div className="app-shell">
        <Sidebar classrooms={classrooms} activeId={classroomId} role="student" loading={loading} />

        <main className="page-main">
          <p
            className="page-eyebrow"
            style={{ marginBottom: 8, cursor: 'pointer' }}
            onClick={() => navigate(`/student/classroom/${classroomId}`)}
          >
            ← Back to Courses
          </p>

          <div className="page-header">
            <div className="page-header-left">
              <h1 className="page-title">{unit?.title}</h1>
              <p className="page-subtitle">{studentSubtitle}</p>
            </div>
          </div>

          {unit?.due_date && (
            <div className="alert" style={{ background: 'var(--cream)', border: '1px solid var(--border)', color: 'var(--muted)', marginBottom: 28 }}>
              Unit due: <strong style={{ color: 'var(--ink)' }}>
                {new Date(unit.due_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </strong>
            </div>
          )}

          <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {ACTIVITIES.map(activity => (
              <button
                key={activity.key}
                onClick={() => navigate(`/student/classroom/${classroomId}/unit/${unitId}/${activity.path}`)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 10,
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '28px 24px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.09)'; e.currentTarget.style.borderColor = 'var(--rust)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <span style={{ fontSize: 32 }}>{activity.icon}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                    {activity.label}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                    {activity.description}
                  </div>
                </div>
                <span style={{ marginTop: 'auto', fontSize: 13, color: 'var(--rust)', fontWeight: 500 }}>
                  Open →
                </span>
              </button>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
