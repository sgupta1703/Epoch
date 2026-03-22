import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getClassrooms, joinClassroom } from '../../api/classrooms';
import '../../styles/pages.css';
import './Student.css';

export default function StudentDashboard({ user }) {
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  useEffect(() => {
    fetchClassrooms();
  }, []);

  function normalizeJoinedClassroom(classroom) {
    return {
      ...classroom,
      joined_at: classroom?.joined_at || new Date().toISOString(),
    };
  }

  function formatJoinedDate(value) {
    const date = new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) {
      return new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  async function fetchClassrooms() {
    setLoading(true);
    try {
      const { classrooms } = await getClassrooms();
      setClassrooms((classrooms || []).map(normalizeJoinedClassroom));
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinError('');
    setJoinSuccess('');
    setJoining(true);
    try {
      const { classroom } = await joinClassroom({ join_code: joinCode.trim() });
      const normalizedClassroom = normalizeJoinedClassroom(classroom);
      setClassrooms(c => [...c, normalizedClassroom]);
      setJoinCode('');
      setJoinSuccess(`Joined "${normalizedClassroom.name}" successfully!`);
      setTimeout(() => setJoinSuccess(''), 3000);
    } catch (err) {
      setJoinError(err.response?.data?.error || 'Invalid join code. Check with your teacher.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <>
      <Navbar user={user} />
      <div className="app-shell">
        <Sidebar classrooms={classrooms} role="student" loading={loading} />

        <main className="page-main">
          <div className="page-header">
            <div className="page-header-left">
              <p className="page-eyebrow">Student Portal</p>
              <h1 className="page-title">My Classes</h1>
              <p className="page-subtitle">Enter a join code from your teacher to enroll in a class.</p>
            </div>
          </div>

          {/* Join classroom */}
          <div className="panel" style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
              Join a Class
            </p>
            {joinError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{joinError}</div>}
            {joinSuccess && <div className="alert alert-success" style={{ marginBottom: 12 }}>{joinSuccess}</div>}
            <form className="join-form" onSubmit={handleJoin}>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="XXXXXX"
                maxLength={6}
              />
              <button className="btn btn-primary" type="submit" disabled={joining || !joinCode.trim()}>
                {joining ? 'Joining…' : 'Join'}
              </button>
            </form>
          </div>

          {loading ? (
            <LoadingSpinner fullPage label="Loading classes…" />
          ) : classrooms.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📚</div>
              <h3>No classes yet</h3>
              <p>Enter a join code from your teacher above to get started.</p>
            </div>
          ) : (
            <div className="cards-grid">
              {classrooms.map(c => (
                <div
                  key={c.id}
                  className="student-classroom-card"
                  onClick={() => navigate(`/student/classroom/${c.id}`)}
                >
                  <h2 className="student-classroom-card-name">{c.name}</h2>
                  <p className="student-classroom-card-meta">
                    Joined {formatJoinedDate(c.joined_at)}
                  </p>
                  <button
                    className="btn btn-dark"
                    style={{ marginTop: 8, alignSelf: 'flex-start' }}
                    onClick={e => { e.stopPropagation(); navigate(`/student/classroom/${c.id}`); }}
                  >
                    View Units →
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
