import { useState, useEffect } from 'react';
import Modal, { ModalActions } from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getPersonas, createPersona, updatePersona, deletePersona } from '../../api/personas';
import '../../styles/pages.css';
import './Teacher.css';

const PERSONA_EMOJIS = ['👨‍⚖️','👩‍🌾','🪖','👸','🤴','⚔️','🧙','🏛️','✍️','🕊️'];

const BLANK_FORM = {
  name: '',
  description: '',
  min_turns: 5,
  due_date: '',
  year_start: '',
  year_end: '',
  location: '',
};

export default function PersonasEditor({ unit }) {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!unit?.id) return;
    fetchPersonas();
  }, [unit?.id]);

  async function fetchPersonas() {
    setLoading(true);
    try {
      const { personas } = await getPersonas(unit.id);
      setPersonas(personas);
    } catch { setError('Failed to load personas.'); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditTarget(null);
    setForm(BLANK_FORM);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(persona) {
    setEditTarget(persona);
    setForm({
      name:        persona.name,
      description: persona.description || '',
      min_turns:   persona.min_turns,
      due_date:    persona.due_date?.slice(0, 10) || '',
      year_start:  persona.year_start ?? '',
      year_end:    persona.year_end   ?? '',
      location:    persona.location   || '',
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim())   { setFormError('Name is required.');            return; }
    if (!form.year_start)    { setFormError('Start year is required.');       return; }
    if (form.year_end && Number(form.year_end) < Number(form.year_start)) {
      setFormError('End year must be after start year.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    const payload = {
      name:        form.name.trim(),
      description: form.description.trim() || null,
      min_turns:   Number(form.min_turns),
      due_date:    form.due_date    || null,
      year_start:  form.year_start  ? Number(form.year_start) : null,
      year_end:    form.year_end    ? Number(form.year_end)   : null,
      location:    form.location.trim() || null,
    };

    try {
      if (editTarget) {
        const { persona } = await updatePersona(editTarget.id, payload);
        setPersonas(p => p.map(x => x.id === persona.id ? persona : x));
      } else {
        const { persona } = await createPersona(unit.id, payload);
        setPersonas(p => [...p, persona]);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save persona.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePersona(deleteTarget.id);
      setPersonas(p => p.filter(x => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { /* silent */ } finally { setDeleting(false); }
  }

  function field(key, value) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }));
  }

  function formatContextBadge(p) {
    const parts = [];
    if (p.year_start) parts.push(p.year_end ? `${p.year_start}–${p.year_end}` : String(p.year_start));
    if (p.location)   parts.push(p.location);
    return parts.join(' · ');
  }

  if (loading) return <LoadingSpinner fullPage label="Loading personas…" />;

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
          Personas are historical figures students can have conversations with. Each persona uses the unit context to stay accurate.
        </p>
        <button className="btn btn-primary" style={{ marginLeft: 16, flexShrink: 0 }} onClick={openCreate}>
          + Add Persona
        </button>
      </div>

      {personas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <h3>No personas yet</h3>
          <p>Add historical figures for students to converse with. For example: a Union soldier, Abraham Lincoln, or a freed slave.</p>
          <button className="btn btn-primary" onClick={openCreate}>Add First Persona</button>
        </div>
      ) : (
        <div className="persona-list">
          {personas.map((p, i) => (
            <div key={p.id} className="persona-item">
              <div className="persona-item-avatar">
                {PERSONA_EMOJIS[i % PERSONA_EMOJIS.length]}
              </div>
              <div className="persona-item-body">
                <div className="persona-item-name">{p.name}</div>
                {p.description && <div className="persona-item-desc">{p.description}</div>}
                <div className="persona-item-meta">
                  Min. {p.min_turns} exchange{p.min_turns !== 1 ? 's' : ''}
                  {formatContextBadge(p) && ` · ${formatContextBadge(p)}`}
                  {p.due_date && ` · Due ${new Date(p.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </div>
              </div>
              <div className="persona-item-actions">
                <button className="btn btn-ghost" style={{ padding: '6px 12px' }} onClick={() => openEdit(p)}>Edit</button>
                <button className="btn btn-danger" style={{ padding: '6px 12px' }} onClick={() => setDeleteTarget(p)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit Persona' : 'Add Persona'}
        size="md"
        footer={
          <ModalActions
            onCancel={() => setModalOpen(false)}
            onConfirm={handleSubmit}
            confirmLabel={editTarget ? 'Save Changes' : 'Add Persona'}
            loading={submitting}
          />
        }
      >
        {formError && <div className="alert alert-error">{formError}</div>}

        <div className="field">
          <label>Name</label>
          <input
            type="text"
            value={form.name}
            onChange={field('name')}
            placeholder="e.g. Union Soldier, Frederick Douglass"
            autoFocus
          />
        </div>

        <div className="field">
          <label>Background Description</label>
          <textarea
            rows={4}
            value={form.description}
            onChange={field('description')}
            placeholder="Describe this persona's background, perspective, and how they should speak. This becomes the AI system prompt."
          />
        </div>

        {/* Historical Context section */}
        <div className="persona-context-section">
          <div className="persona-context-label">Historical Context</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>
                Year <span style={{ color: 'var(--rust)', fontWeight: 600 }}>*</span>
              </label>
              <input
                type="number"
                value={form.year_start}
                onChange={field('year_start')}
                placeholder="e.g. 1863"
                min={-3000}
                max={2100}
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>
                End Year <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional range)</span>
              </label>
              <input
                type="number"
                value={form.year_end}
                onChange={field('year_end')}
                placeholder="e.g. 1865"
                min={-3000}
                max={2100}
              />
            </div>
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label>
              Location <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <input
              type="text"
              value={form.location}
              onChange={field('location')}
              placeholder="e.g. Richmond, Virginia · The Western Front · Ancient Rome"
            />
          </div>


        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <div className="field">
            <label>Minimum Exchanges</label>
            <input
              type="number"
              min={1}
              max={50}
              value={form.min_turns}
              onChange={field('min_turns')}
            />
          </div>
          <div className="field">
            <label>Due Date (optional)</label>
            <input
              type="date"
              value={form.due_date}
              onChange={field('due_date')}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Persona"
        size="sm"
        footer={
          <ModalActions
            onCancel={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            confirmLabel="Delete"
            danger
            loading={deleting}
          />
        }
      >
        <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>
          Delete <strong>{deleteTarget?.name}</strong>? All student conversations with this persona will also be removed.
        </p>
      </Modal>
    </div>
  );
}