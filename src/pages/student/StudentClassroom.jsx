import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import UnitCard from '../../components/UnitCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getClassrooms, getClassroom, getStudentPerformance } from '../../api/classrooms';
import { getUnits } from '../../api/units';
import '../../styles/pages.css';
import './Student.css';

function averageScore(values) {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export default function StudentClassroom({ user }) {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [classroom, setClassroom] = useState(null);
  const [units, setUnits] = useState([]);
  const [performanceUnits, setPerformanceUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAll();
  }, [classroomId, user?.id]);

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const performanceRequest = user?.id
        ? getStudentPerformance(classroomId, user.id).catch(() => ({ performance: { units: [] } }))
        : Promise.resolve({ performance: { units: [] } });

      const [{ classrooms }, { classroom }, { units }, performanceResponse] = await Promise.all([
        getClassrooms(),
        getClassroom(classroomId),
        getUnits(classroomId),
        performanceRequest,
      ]);
      setClassrooms(classrooms);
      setClassroom(classroom);
      setUnits(units);
      setPerformanceUnits(performanceResponse?.performance?.units || []);
    } catch {
      setError('Failed to load classroom.');
    } finally {
      setLoading(false);
    }
  }

  const performanceMap = new Map(performanceUnits.map(unit => [unit.unit_id, unit]));
  const unitsWithProgress = units.map(unit => {
    const perf = performanceMap.get(unit.id);
    const assessments = [perf?.quiz, perf?.assignment].filter(Boolean);
    const gradedScores = assessments
      .map(item => item?.score)
      .filter(score => score !== null && score !== undefined);

    return {
      ...unit,
      completedAssessments: assessments.length,
      averageScore: averageScore(gradedScores),
    };
  });

  const totalAssessments = unitsWithProgress.reduce((sum, unit) => sum + unit.completedAssessments, 0);
  const scoredAssessments = unitsWithProgress
    .map(unit => unit.averageScore)
    .filter(score => score !== null && score !== undefined);
  const classroomAverage = averageScore(scoredAssessments);
  const nextDueUnit = [...unitsWithProgress]
    .filter(unit => unit.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0] || null;
  const activeUnits = unitsWithProgress.filter(unit => unit.completedAssessments > 0).length;

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
          <button onClick={() => navigate('/student')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, fontSize: 13, fontFamily: 'var(--font-body)', marginBottom: 18 }}>
            ← All Classes
          </button>

          <div className="classroom-hero">
            <div className="page-header-left classroom-hero-copy">
              <p className="page-eyebrow">Class</p>
              <h1 className="page-title">{classroom?.name}</h1>
              <p className="page-subtitle">
                {units.length} unit{units.length !== 1 ? 's' : ''} available
                {nextDueUnit?.due_date ? ` · Next due ${new Date(nextDueUnit.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
              </p>
            </div>
            <div className="classroom-hero-actions">
              {nextDueUnit && (
                <button className="btn btn-primary" onClick={() => navigate(`/student/classroom/${classroomId}/unit/${nextDueUnit.id}`)}>
                  Continue Learning
                </button>
              )}

            </div>
          </div>

          <div className="classroom-summary-grid">
            <div className="classroom-summary-card">
              <span className="classroom-summary-label">Units</span>
              <strong className="classroom-summary-value">{units.length}</strong>
              <span className="classroom-summary-copy">available in this class</span>
            </div>
            <div className="classroom-summary-card classroom-summary-card--warm">
              <span className="classroom-summary-label">Started</span>
              <strong className="classroom-summary-value">{activeUnits}</strong>
              <span className="classroom-summary-copy">units with submitted work</span>
            </div>
            <div className="classroom-summary-card classroom-summary-card--cool">
              <span className="classroom-summary-label">Assessments</span>
              <strong className="classroom-summary-value">{totalAssessments}</strong>
              <span className="classroom-summary-copy">quizzes and assignments completed</span>
            </div>
            <div className="classroom-summary-card classroom-summary-card--success">
              <span className="classroom-summary-label">Avg Score</span>
              <strong className="classroom-summary-value">{classroomAverage !== null ? `${classroomAverage}%` : '—'}</strong>
              <span className="classroom-summary-copy">graded work in this class</span>
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
            <div className="classroom-units-shell">
              <div className="classroom-units-header">
                <div>
                  <p className="page-eyebrow" style={{ marginBottom: 6 }}>Course Overview</p>
                  <h2 className="classroom-units-title">Explore your units</h2>
                </div>
              </div>
              <div className="cards-grid">
                {unitsWithProgress.map(unit => (
                  <UnitCard
                    key={unit.id}
                    unit={unit}
                    role="student"
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
