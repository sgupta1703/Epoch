import { useNavigate } from 'react-router-dom';
import './UnitCard.css';

export default function UnitCard({ unit, role, onToggleVis, onDelete, completion, accentVariant }) {
  const navigate = useNavigate();
  const isTeacher = role === 'teacher';

  const basePath = isTeacher
    ? `/teacher/classroom/${unit.classroom_id}/unit/${unit.id}`
    : `/student/classroom/${unit.classroom_id}/unit/${unit.id}`;

  function formatDate(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const dueDate = formatDate(unit.due_date);
  const now = new Date();
  const dueDateObj = unit.due_date ? new Date(unit.due_date) : null;
  const isPastDue = dueDateObj && dueDateObj < now;
  const isDueSoon = !isPastDue && dueDateObj && (dueDateObj - now) <= 3 * 24 * 60 * 60 * 1000;

  const sections = [
    { key: 'notes',    label: 'Notes' },
    { key: 'personas', label: 'Personas' },
    { key: 'quiz',     label: 'Quiz' },
  ];

  const accentClass = accentVariant === undefined || accentVariant === null
    ? ''
    : ` unit-card--accent-${accentVariant}`;

  return (
    <article className={`unit-card${accentClass} ${!unit.is_visible ? 'unit-card--hidden' : ''}`}>

      {/* Status row */}
      <div className="unit-card-topbar">
        {isTeacher ? (
          <span className={`unit-card-vis ${unit.is_visible ? 'unit-card-vis--on' : 'unit-card-vis--off'}`}>
            {unit.is_visible ? '● Published' : '○ Hidden'}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, letterSpacing: '0.04em' }}>Unit</span>
        )}
        {dueDate && (
          <span className={`unit-card-due ${isPastDue ? 'unit-card-due--late' : isDueSoon ? 'unit-card-due--soon' : ''}`}>
            {isPastDue ? '⚠ ' : isDueSoon ? '⏰ ' : ''}{isPastDue ? 'Past due' : 'Due'} {dueDate}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="unit-card-title" onClick={() => navigate(basePath)}>
        {unit.title}
      </h3>

      {/* Context preview */}
      {unit.context ? (
        <p className="unit-card-context">{unit.context}</p>
      ) : isTeacher ? (
        <p className="unit-card-context unit-card-context--empty">No context set — add context to enable AI features.</p>
      ) : null}

      {/* Student progress */}
      {!isTeacher && completion && (
        <div className="unit-card-progress">
          {sections.map(({ key, label }) => (
            <div key={key} className={`unit-card-progress-item ${completion[key] ? 'unit-card-progress-item--done' : ''}`}>
              <span className={`unit-card-progress-dot ${completion[key] ? 'unit-card-progress-dot--done' : ''}`} />
              <span className="unit-card-progress-label">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="unit-card-footer">
        {isTeacher ? (
          <>
            <div className="unit-card-teacher-actions">
              <button
                className="unit-card-btn unit-card-btn--ghost"
                onClick={() => onToggleVis?.(unit)}
              >
                {unit.is_visible ? 'Hide' : 'Publish'}
              </button>
              <button
                className="unit-card-btn unit-card-btn--danger"
                onClick={() => onDelete?.(unit)}
              >
                Delete
              </button>
            </div>
            <button className="unit-card-btn unit-card-btn--primary" onClick={() => navigate(basePath)}>
              Manage →
            </button>
          </>
        ) : unit.has_content === false ? (
          <span className="unit-card-empty-label">Nothing here yet</span>
        ) : (
          <button className="unit-card-btn unit-card-btn--primary" onClick={() => navigate(basePath)}>
            Open →
          </button>
        )}
      </div>

    </article>
  );
}
