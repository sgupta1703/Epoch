import { useNavigate } from 'react-router-dom';
import './UnitCard.css';

/**
 * UnitCard — displayed in classroom views for both teacher and student.
 *
 * Props:
 *   unit        – unit object { id, title, context, is_visible, due_date, classroom_id }
 *   role        – 'teacher' | 'student'
 *   onToggleVis – (unit) => void  — teacher: toggle visibility
 *   onDelete    – (unit) => void  — teacher: delete unit
 *   completion  – optional object { notes: bool, personas: bool, quiz: bool } for student progress
 */
export default function UnitCard({ unit, role, onToggleVis, onDelete, completion }) {
  const navigate = useNavigate();
  const isTeacher = role === 'teacher';
  const previewText = isTeacher
    ? unit.context
    : 'Open this unit to review the materials and complete the assigned activities.';

  const basePath = isTeacher
    ? `/teacher/classroom/${unit.classroom_id}/unit/${unit.id}`
    : `/student/classroom/${unit.classroom_id}/unit/${unit.id}`;

  function formatDate(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const dueDate = formatDate(unit.due_date);
  const isPastDue = unit.due_date && new Date(unit.due_date) < new Date();

  // Student completion dots
  const sections = [
    { key: 'notes',    label: 'Notes' },
    { key: 'personas', label: 'Personas' },
    { key: 'quiz',     label: 'Quiz' },
  ];

  return (
    <article className={`unit-card ${!unit.is_visible ? 'unit-card--hidden' : ''}`}>

      {/* Top bar */}
      <div className="unit-card-topbar">
        <span className={`unit-card-vis ${unit.is_visible ? 'unit-card-vis--on' : 'unit-card-vis--off'}`}>
          {unit.is_visible ? 'Visible' : 'Hidden'}
        </span>
        {dueDate && (
          <span className={`unit-card-due ${isPastDue ? 'unit-card-due--late' : ''}`}>
            {isPastDue ? 'Past due · ' : 'Due · '}{dueDate}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="unit-card-title" onClick={() => navigate(basePath)}>
        {unit.title}
      </h3>

      {/* Context preview */}
      {previewText && (
        <p className="unit-card-context">{previewText}</p>
      )}

      {/* Student progress dots */}
      {!isTeacher && completion && (
        <div className="unit-card-progress">
          {sections.map(({ key, label }) => (
            <div key={key} className="unit-card-progress-item">
              <span className={`unit-card-progress-dot ${completion[key] ? 'unit-card-progress-dot--done' : ''}`} />
              <span className="unit-card-progress-label">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="unit-card-footer">
        <button className="unit-card-btn unit-card-btn--primary" onClick={() => navigate(basePath)}>
          {isTeacher ? 'Manage →' : 'Open →'}
        </button>

        {isTeacher && (
          <div className="unit-card-teacher-actions">
            <button
              className="unit-card-btn unit-card-btn--ghost"
              onClick={() => onToggleVis?.(unit)}
              title={unit.is_visible ? 'Hide from students' : 'Make visible'}
            >
              {unit.is_visible ? 'Hide' : 'Publish'}
            </button>
            <button
              className="unit-card-btn unit-card-btn--danger"
              onClick={() => onDelete?.(unit)}
              title="Delete unit"
            >
              Delete
            </button>
          </div>
        )}
      </div>

    </article>
  );
}
