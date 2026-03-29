import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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

const TAB_DETAILS = {
  notes: { eyebrow: 'Read', copy: 'Review teacher notes and unit context.' },
  personas: { eyebrow: 'Discuss', copy: 'Talk with historical personas from this unit.' },
  quiz: { eyebrow: 'Check', copy: 'Test your understanding with quizzes.' },
  assignment: { eyebrow: 'Apply', copy: 'Complete the full assignment with sources.' },
};

function getActiveTabFromPath(pathname) {
  const match = pathname.match(/\/unit\/[^/]+(?:\/([^/?#]+))?/);
  const maybeTab = match?.[1];
  return TABS.some(tab => tab.key === maybeTab) ? maybeTab : 'notes';
}

function getTabPath(classroomId, unitId, tabKey) {
  const basePath = `/student/classroom/${classroomId}/unit/${unitId}`;
  return tabKey === 'notes' ? basePath : `${basePath}/${tabKey}`;
}

export default function StudentUnit({ user }) {
  const { classroomId, unitId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [classrooms, setClassrooms] = useState([]);
  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const activeTab = getActiveTabFromPath(location.pathname);

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
  }, [classroomId, navigate, unitId]);

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

          <div className="student-unit-hero">
            <div className="page-header-left student-unit-hero-copy">
              <p className="page-eyebrow">Unit Workspace</p>
              <h1 className="page-title">{unit?.title}</h1>
              {unit?.context && <p className="page-subtitle">{unit.context}</p>}
            </div>
            <div className="student-unit-meta">
              {unit?.due_date && (
                <span className="student-unit-meta-pill student-unit-meta-pill--due">
                  Due {new Date(unit.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>

          <div className="student-unit-quicknav">
            {TABS.map(t => (
              <button
                key={t.key}
                className={`student-unit-quicknav-card ${activeTab === t.key ? 'student-unit-quicknav-card--active' : ''}`}
                onClick={() => navigate(getTabPath(classroomId, unitId, t.key))}
              >
                <span className="student-unit-quicknav-eyebrow">{TAB_DETAILS[t.key].eyebrow}</span>
                <strong className="student-unit-quicknav-title">{t.label}</strong>
                <span className="student-unit-quicknav-copy">{TAB_DETAILS[t.key].copy}</span>
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
