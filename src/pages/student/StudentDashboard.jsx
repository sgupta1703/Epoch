import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getClassrooms, joinClassroom } from '../../api/classrooms';
import { getStudentDashboard, getStudentDashboardPriorities } from '../../api/student';
import '../../styles/pages.css';
import './Student.css';

function buildStudentUnitItemPath(item) {
  const basePath = `/student/classroom/${item.classroom_id}/unit/${item.unit_id}`;
  if (item.type === 'quiz') return `${basePath}/quiz?quizId=${item.id}`;
  return `${basePath}/assignment?assignmentId=${item.id}`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function dueDaysFromNow(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / 86400000);
}

function formatDueLabel(dateStr) {
  const d = dueDaysFromNow(dateStr);
  if (d === null) return null;
  if (d < 0)  return `${Math.abs(d)}d overdue`;
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  if (d <= 7)  return `Due in ${d}d`;
  return `Due ${new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function scoreGrade(score) {
  if (score === null || score === undefined) return null;
  if (score >= 90) return { letter: 'A', color: '#1e7a3a' };
  if (score >= 80) return { letter: 'B', color: '#2563eb' };
  if (score >= 70) return { letter: 'C', color: '#b8860b' };
  if (score >= 60) return { letter: 'D', color: '#c05500' };
  return { letter: 'F', color: '#c0392b' };
}

function DashboardMetric({ label, value, hint, tone = 'default' }) {
  return (
    <div className={`db-metric db-metric--${tone}`}>
      <span className="db-metric-label">{label}</span>
      <strong className="db-metric-value">{value}</strong>
      {hint && <span className="db-metric-hint">{hint}</span>}
    </div>
  );
}

function DashboardPrioritiesPanel({ priorities, loading, fallback, onRefresh }) {
  return (
    <section className="db-ai-panel">
      <div className="db-ai-panel-top">
        <div>
          <span className="db-ai-label">AI Priorities</span>
          <h2 className="db-ai-title">
            {loading && !priorities ? 'Building your study brief...' : priorities?.focus_title || 'Your next best move'}
          </h2>
        </div>
        <button type="button" className="db-ai-refresh" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading && !priorities ? (
        <p className="db-ai-copy">
          Pulling together your classes, due dates, and recent work to figure out what matters most next.
        </p>
      ) : priorities ? (
        <>
          <p className="db-ai-headline">{priorities.headline}</p>
          <p className="db-ai-copy">{priorities.focus_reason}</p>

          <div className="db-ai-priority-list">
            {(priorities.priority_items || []).map((item, index) => (
              <div key={`${item.title}-${index}`} className="db-ai-priority-item">
                <span className="db-ai-priority-index">{index + 1}</span>
                <div>
                  <div className="db-ai-priority-title">{item.title}</div>
                  <div className="db-ai-priority-detail">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>

          {priorities.watch_out && (
            <div className="db-ai-watchout">
              <span className="db-ai-watchout-label">Watch out</span>
              <p>{priorities.watch_out}</p>
            </div>
          )}

          {fallback && (
            <p className="db-ai-fallback">
              Showing a quick fallback briefing right now.
            </p>
          )}
        </>
      ) : (
        <p className="db-ai-copy">
          Your AI priorities are not available right now, but your work queue is still up to date below.
        </p>
      )}
    </section>
  );
}

// ── WorkCard ─────────────────────────────────────────────────────────────────

function WorkCard({ item }) {
  const navigate = useNavigate();
  const days = dueDaysFromNow(item.due_date);
  const dueLabel = formatDueLabel(item.due_date);
  const isOverdue = days !== null && days < 0 && !item.submitted;
  const isDueToday = days === 0 && !item.submitted;
  const isDueSoon = days !== null && days > 0 && days <= 3 && !item.submitted;
  const grade = scoreGrade(item.score);

  const isQuiz = item.type === 'quiz';

  function handleClick() {
    navigate(buildStudentUnitItemPath(item));
  }

  return (
    <div
      className={`wc${isOverdue ? ' wc--overdue' : isDueToday ? ' wc--today' : ''}`}
      onClick={handleClick}
    >
      {/* Left accent bar */}
      <div className={`wc-bar wc-bar--${isQuiz ? 'quiz' : 'assignment'}`} />

      <div className="wc-body">
        {/* Top row */}
        <div className="wc-top">
          <span className={`wc-type-badge wc-type-badge--${isQuiz ? 'quiz' : 'assignment'}`}>
            {isQuiz ? 'Quiz' : 'Assignment'}
          </span>

          {item.submitted ? (
            <span className="wc-status wc-status--done">
              {grade ? (
                <>
                  {isQuiz && <span className="wc-grade" style={{ color: grade.color }}>{grade.letter}</span>}
                  <span className="wc-score">{item.score}%</span>
                </>
              ) : (
                'Submitted'
              )}
            </span>
          ) : isOverdue ? (
            <span className="wc-status wc-status--overdue">{dueLabel}</span>
          ) : isDueToday ? (
            <span className="wc-status wc-status--today">{dueLabel}</span>
          ) : isDueSoon ? (
            <span className="wc-status wc-status--soon">{dueLabel}</span>
          ) : dueLabel ? (
            <span className="wc-status wc-status--upcoming">{dueLabel}</span>
          ) : null}
        </div>

        {/* Title */}
        <h3 className="wc-title">{item.name}</h3>

        {/* Meta row */}
        <div className="wc-meta">
          <span className="wc-meta-class">{item.classroom_name}</span>
          <span className="wc-meta-sep">·</span>
          <span className="wc-meta-unit">{item.unit_title}</span>
        </div>

        {/* Bottom row */}
        <div className="wc-footer">
          {item.due_date && (
            <span className="wc-date">{formatFullDate(item.due_date)}</span>
          )}
          <span className="wc-action">
            {item.submitted ? 'View results →' : 'Start →'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── SectionGroup ─────────────────────────────────────────────────────────────

function SectionGroup({ label, count, items, defaultOpen = true, urgent }) {
  const [open, setOpen] = useState(defaultOpen);
  if (items.length === 0) return null;
  return (
    <div className="sg">
      <button className={`sg-header${urgent ? ' sg-header--urgent' : ''}`} onClick={() => setOpen(o => !o)}>
        <span className="sg-label">{label}</span>
        <span className="sg-count">{count}</span>
        <span className="sg-chevron" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>›</span>
      </button>
      {open && (
        <div className="sg-grid">
          {items.map(item => <WorkCard key={`${item.type}-${item.id}`} item={item} />)}
        </div>
      )}
    </div>
  );
}

function SubmittedTypeSection({ type, items }) {
  if (items.length === 0) return null;

  const isQuiz = type === 'quiz';
  const label = isQuiz ? 'Submitted Quizzes' : 'Submitted Assignments';

  return (
    <section className={`submitted-group submitted-group--${type}`}>
      <div className="submitted-group-header">
        <div className="submitted-group-heading">
          <span className={`submitted-group-badge submitted-group-badge--${type}`}>
            {isQuiz ? 'Quiz' : 'Assignment'}
          </span>
          <h3 className="submitted-group-title">{label}</h3>
        </div>
        <span className="submitted-group-count">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="sg-grid submitted-group-grid">
        {items.map(item => <WorkCard key={`${item.type}-${item.id}`} item={item} />)}
      </div>
    </section>
  );
}

// ── RightPanel ────────────────────────────────────────────────────────────────

function RightPanel({ items, classrooms, joinCode, setJoinCode, onJoin, joining, joinError, joinSuccess }) {
  const navigate = useNavigate();
  const thisWeek = items.filter(i => {
    if (i.submitted) return false;
    if (!i.due_date) return false;
    const d = dueDaysFromNow(i.due_date);
    return d !== null && d >= 0 && d <= 7;
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  return (
    <aside className="db-panel">

      {/* Stats */}
      {false && <div className="db-stats">
        <div className="db-stat">
          <span className="db-stat-value" style={overdueCount > 0 ? { color: 'var(--rust)' } : undefined}>
            {pending.length}
          </span>
          <span className="db-stat-label">Pending</span>
        </div>
        <div className="db-stat-div" />
        <div className="db-stat">
          <span className="db-stat-value" style={overdueCount > 0 ? { color: 'var(--rust)' } : undefined}>
            {overdueCount}
          </span>
          <span className="db-stat-label">Overdue</span>
        </div>
        <div className="db-stat-div" />
        <div className="db-stat">
          <span className="db-stat-value" style={avgGrade ? { color: avgGrade.color } : undefined}>
            {avgScore !== null ? `${avgScore}%` : '—'}
          </span>
          <span className="db-stat-label">Avg Score</span>
        </div>
      </div>}

      {/* This Week */}
      {thisWeek.length > 0 && (
        <div className="db-panel-section">
          <p className="db-panel-label">Due This Week</p>
          <div className="db-week-list">
            {thisWeek.map(item => {
              const d = dueDaysFromNow(item.due_date);
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="db-week-item"
                  onClick={() => navigate(buildStudentUnitItemPath(item))}
                >
                  <div className={`db-week-dot db-week-dot--${item.type}`} />
                  <div className="db-week-info">
                    <span className="db-week-name">{item.name}</span>
                    <span className="db-week-class">{item.classroom_name}</span>
                  </div>
                  <span className={`db-week-days${d === 0 ? ' db-week-days--today' : d <= 2 ? ' db-week-days--soon' : ''}`}>
                    {d === 0 ? 'Today' : `${d}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My Classes */}
      <div className="db-panel-section">
        <p className="db-panel-label">My Classes</p>
        {classrooms.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>No classes yet.</p>
        ) : (
          <div className="db-class-list">
            {classrooms.map(c => {
              const cItems = items.filter(i => i.classroom_id === c.id);
              const cPending = cItems.filter(i => !i.submitted).length;
              return (
                <div
                  key={c.id}
                  className="db-class-item"
                  onClick={() => navigate(`/student/classroom/${c.id}`)}
                >
                  <div className="db-class-dot" />
                  <div className="db-class-info">
                    <span className="db-class-name">{c.name}</span>
                    <span className="db-class-meta">{cPending} pending</span>
                  </div>
                  <span className="db-class-arrow">›</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Join Class */}
      <div className="db-panel-section">
        <p className="db-panel-label">Join a Class</p>
        {joinError   && <div className="alert alert-error"   style={{ marginBottom: 8, fontSize: 12 }}>{joinError}</div>}
        {joinSuccess && <div className="alert alert-success" style={{ marginBottom: 8, fontSize: 12 }}>{joinSuccess}</div>}
        <form className="db-join-form" onSubmit={onJoin}>
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter code…"
            maxLength={6}
          />
          <button className="btn btn-primary" type="submit" disabled={joining || !joinCode.trim()}>
            {joining ? '…' : 'Join'}
          </button>
        </form>
      </div>

    </aside>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function StudentDashboard({ user }) {
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [joinCode, setJoinCode]     = useState('');
  const [joining, setJoining]       = useState(false);
  const [joinError, setJoinError]   = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [activeTab, setActiveTab]   = useState('todo'); // 'todo' | 'done'
  const [priorities, setPriorities] = useState(null);
  const [prioritiesLoading, setPrioritiesLoading] = useState(true);
  const [prioritiesFallback, setPrioritiesFallback] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [{ classrooms: cls }, { items: its }] = await Promise.all([
        getClassrooms(),
        getStudentDashboard(),
      ]);
      setClassrooms((cls || []).map(c => ({
        ...c,
        joined_at: c.joined_at || new Date().toISOString(),
      })));
      setItems(its || []);
      void loadPriorities();
    } catch {
      setPriorities(null);
      setPrioritiesFallback(false);
      setPrioritiesLoading(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadPriorities() {
    setPrioritiesLoading(true);
    try {
      const { priorities: nextPriorities, fallback } = await getStudentDashboardPriorities();
      setPriorities(nextPriorities || null);
      setPrioritiesFallback(!!fallback);
    } catch {
      setPriorities(null);
      setPrioritiesFallback(false);
    } finally {
      setPrioritiesLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinError(''); setJoinSuccess(''); setJoining(true);
    try {
      const { classroom } = await joinClassroom({ join_code: joinCode.trim() });
      const norm = { ...classroom, joined_at: classroom?.joined_at || new Date().toISOString() };
      setClassrooms(c => [...c, norm]);
      setJoinCode('');
      setJoinSuccess(`Joined "${norm.name}"!`);
      fetchAll();
      setTimeout(() => setJoinSuccess(''), 3000);
    } catch (err) {
      setJoinError(err.response?.data?.error || 'Invalid join code.');
    } finally { setJoining(false); }
  }

  const now = new Date();
  const firstName = user?.display_name?.split(' ')[0] || 'there';

  // Partition items
  const todoItems = items.filter(i => !i.submitted);
  const doneItems = items.filter(i =>  i.submitted)
    .sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0));
  const doneQuizItems = doneItems.filter(i => i.type === 'quiz');
  const doneAssignmentItems = doneItems.filter(i => i.type === 'assignment');

  // todo sub-groups
  const overdueItems  = todoItems.filter(i => i.due_date && new Date(i.due_date) < now)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const dueSoonItems  = todoItems.filter(i => {
    if (!i.due_date) return false;
    const d = dueDaysFromNow(i.due_date);
    return d !== null && d >= 0 && d <= 7;
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const upcomingItems = todoItems.filter(i => {
    if (!i.due_date) return false;
    const d = dueDaysFromNow(i.due_date);
    return d !== null && d > 7;
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const undatedItems  = todoItems.filter(i => !i.due_date);

  const getHour = () => new Date().getHours();
  const greeting = getHour() < 12 ? 'Good morning' : getHour() < 17 ? 'Good afternoon' : 'Good evening';

  const pendingCount = todoItems.length;
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const dueThisWeekCount = todoItems.filter(i => {
    const d = dueDaysFromNow(i.due_date);
    return d !== null && d >= 0 && d <= 7;
  }).length;
  const submittedCount = doneItems.length;
  const scoredDoneItems = doneItems.filter(i => i.score !== null && i.score !== undefined);
  const overallAverage = scoredDoneItems.length
    ? `${Math.round(scoredDoneItems.reduce((sum, item) => sum + item.score, 0) / scoredDoneItems.length)}%`
    : '—';
  const nextItem = [...todoItems]
    .filter(i => i.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0] || todoItems[0] || null;
  return (
    <>
      <Navbar user={user} />
      <div className="app-shell">
        <Sidebar classrooms={classrooms} role="student" loading={loading} />

        <main className="page-main db-main">

          {/* ── Header ── */}
          <div className="db-header">
            <div className="db-header-main">
              <p className="page-eyebrow">{todayStr}</p>
              <h1 className="page-title">{greeting}, {firstName}</h1>
              {!loading && (
                <p className="page-subtitle" style={{ marginTop: 6 }}>
                  {pendingCount === 0
                    ? "You're all caught up — nice work."
                    : `You have ${pendingCount} item${pendingCount !== 1 ? 's' : ''} left to complete.`}
                </p>
              )}
            </div>
            {!loading && (
              <div className="db-metrics-grid">
                <DashboardMetric label="Classes" value={classrooms.length} hint="active classrooms" />
                <DashboardMetric label="Due Soon" value={dueThisWeekCount} hint="within 7 days" tone="warm" />
                <DashboardMetric label="Submitted" value={submittedCount} hint="completed work" tone="cool" />
                <DashboardMetric label="Avg Score" value={overallAverage} hint="graded submissions" tone="success" />
              </div>
            )}
          </div>

          {loading ? (
            <LoadingSpinner fullPage label="Loading your dashboard…" />
          ) : (
            <div className="db-layout">

              {/* ── Main feed ── */}
              <div className="db-feed">
                <div className="db-focus-panel">
                  <div>
                    <span className="db-focus-label">Focus Now</span>
                    <h2 className="db-focus-title">{nextItem ? nextItem.name : 'No urgent work waiting'}</h2>
                    <p className="db-focus-copy">
                      {nextItem
                        ? `${nextItem.classroom_name} · ${nextItem.unit_title}${nextItem.due_date ? ` · ${formatDueLabel(nextItem.due_date)}` : ''}`
                        : 'Your student workspace is clear right now. New notes, conversations, quizzes, and assignments will show up here.'}
                    </p>
                  </div>
                  {nextItem && (
                    <button className="btn btn-primary db-focus-btn" onClick={() => navigate(buildStudentUnitItemPath(nextItem))}>
                      Open This Task
                    </button>
                  )}
                </div>

                {/* Tabs */}
                <div className="db-tabs">
                  <button
                    className={`db-tab${activeTab === 'todo' ? ' db-tab--active' : ''}`}
                    onClick={() => setActiveTab('todo')}
                  >
                    To Do
                    {todoItems.length > 0 && (
                      <span className="db-tab-count">{todoItems.length}</span>
                    )}
                  </button>
                  <button
                    className={`db-tab${activeTab === 'done' ? ' db-tab--active' : ''}`}
                    onClick={() => setActiveTab('done')}
                  >
                    Submitted
                    {doneItems.length > 0 && (
                      <span className="db-tab-count db-tab-count--done">{doneItems.length}</span>
                    )}
                  </button>
                </div>

                {/* To Do tab */}
                {activeTab === 'todo' && (
                  <>
                    {todoItems.length === 0 ? (
                      <div className="db-empty">
                        <div className="db-empty-icon">✓</div>
                        <h3>All caught up!</h3>
                        <p>No pending assignments or quizzes. Check back later.</p>
                      </div>
                    ) : (
                      <>
                        <SectionGroup
                          label="Overdue"
                          count={overdueItems.length}
                          items={overdueItems}
                          urgent
                        />
                        <SectionGroup
                          label="Due This Week"
                          count={dueSoonItems.length}
                          items={dueSoonItems}
                        />
                        <SectionGroup
                          label="Upcoming"
                          count={upcomingItems.length}
                          items={upcomingItems}
                          defaultOpen={overdueItems.length + dueSoonItems.length === 0}
                        />
                        <SectionGroup
                          label="No Due Date"
                          count={undatedItems.length}
                          items={undatedItems}
                          defaultOpen={overdueItems.length + dueSoonItems.length + upcomingItems.length === 0}
                        />
                      </>
                    )}
                  </>
                )}

                {/* Submitted tab */}
                {activeTab === 'done' && (
                  <>
                    {doneItems.length === 0 ? (
                      <div className="db-empty">
                        <div className="db-empty-icon">📋</div>
                        <h3>Nothing submitted yet</h3>
                        <p>Completed assignments and quizzes will appear here.</p>
                      </div>
                    ) : (
                      <div className="submitted-groups">
                        <SubmittedTypeSection type="assignment" items={doneAssignmentItems} />
                        <SubmittedTypeSection type="quiz" items={doneQuizItems} />
                      </div>
                    )}
                  </>
                )}

                <DashboardPrioritiesPanel
                  priorities={priorities}
                  loading={prioritiesLoading}
                  fallback={prioritiesFallback}
                  onRefresh={loadPriorities}
                />
              </div>

              {/* ── Right panel ── */}
              <RightPanel
                items={items}
                classrooms={classrooms}
                joinCode={joinCode}
                setJoinCode={setJoinCode}
                onJoin={handleJoin}
                joining={joining}
                joinError={joinError}
                joinSuccess={joinSuccess}
              />
            </div>
          )}
        </main>
      </div>
    </>
  );
}
