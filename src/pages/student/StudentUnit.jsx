import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getClassrooms } from '../../api/classrooms';
import { getUnit } from '../../api/units';
import NotesView from './NotesView';
import PersonaChat from './PersonaChat';
import QuizView from './QuizView';
import AssignmentView from './AssignmentView';
import '../../styles/pages.css';
import './Student.css';

const TABS = [
  { key: 'notes',      label: 'Notes' },
  { key: 'personas',   label: 'Personas' },
  { key: 'quiz',       label: 'Quizzes' },
  { key: 'assignment', label: 'Assignment' },
];

export default function StudentUnit({ user }) {
  const { classroomId, unitId } = useParams();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notes');

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
          <p className="page-eyebrow" style={{ marginBottom: 8, cursor: 'pointer' }}
            onClick={() => navigate(`/student/classroom/${classroomId}`)}>
            ← Back to Courses
          </p>

          <div className="page-header">
            <div className="page-header-left">
              <h1 className="page-title">{unit?.title}</h1>
              {unit?.context && <p className="page-subtitle">{unit.context}</p>}
            </div>
            {unit?.due_date && (
              <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>
                Due {new Date(unit.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>

          <div className="tabs">
            {TABS.map(t => (
              <button
                key={t.key}
                className={`tab-btn ${activeTab === t.key ? 'tab-btn--active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'notes'      && <NotesView      user={user} unit={unit} embedded />}
          {activeTab === 'personas'   && <PersonaChat    user={user} unit={unit} embedded />}
          {activeTab === 'quiz'       && <QuizView       user={user} unit={unit} embedded />}
          {activeTab === 'assignment' && <AssignmentView user={user} unit={unit} embedded />}
        </main>
      </div>
    </>
  );
}
