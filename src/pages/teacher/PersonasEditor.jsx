import { useState, useEffect } from 'react';
import AppDatePicker from '../../components/AppDatePicker';
import Modal, { ModalActions } from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getPersonas, createPersona, updatePersona, deletePersona, generateMissions } from '../../api/personas';
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
  mode: 'free',
  missions: [],
};

const MODE_OPTIONS = [
  {
    value: 'free',
    label: 'Free Conversation',
    icon: '💬',
    desc: 'Open-ended chat. Students learn by exploring at their own pace.',
  },
  {
    value: 'missions',
    label: 'Mission-Based',
    icon: '🎯',
    desc: 'Students work through specific objectives during the conversation.',
  },
  {
    value: 'quiz',
    label: 'Quiz After Chat',
    icon: '📝',
    desc: 'A personalized quiz is generated from the student\'s conversation once they finish.',
  },
];

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

  const [generatingMissions, setGeneratingMissions] = useState(false);
  const [newMissionText, setNewMissionText] = useState('');

  useEffect(() => {
    if (!unit?.id) return;
    fetchPersonas();
  }, [unit?.id]);

  useEffect(() => {
    if (!unit?.id) return;
    function handlePersonasChanged() { fetchPersonas(); }
    window.addEventListener('epoch:personas-changed', handlePersonasChanged);
    return () => window.removeEventListener('epoch:personas-changed', handlePersonasChanged);
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
    setNewMissionText('');
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
      mode:        persona.mode       || 'free',
      missions:    persona.missions   || [],
    });
    setFormError('');
    setNewMissionText('');
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim())   { setFormError('Name is required.');            return; }
    if (!form.year_start)    { setFormError('Start year is required.');       return; }
    if (form.year_end && Number(form.year_end) < Number(form.year_start)) {
      setFormError('End year must be after start year.');
      return;
    }
    if (form.mode === 'missions' && form.missions.length === 0) {
      setFormError('Add at least one mission, or switch to a different mode.');
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
      mode:        form.mode,
      missions:    form.missions,
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

  async function handleGenerateMissions() {
    if (!form.name.trim() || !form.description.trim()) {
      setFormError('Fill in the persona name and background description before generating missions.');
      return;
    }
    setFormError('');
    setGeneratingMissions(true);
    try {
      // If editing an existing persona, generate from saved persona ID
      if (editTarget) {
        const { missions } = await generateMissions(editTarget.id);
        setForm(f => ({ ...f, missions }));
      } else {
        // Need to create a temporary approach: generate missions using the unit context + form data
        // We'll call it by saving a temp persona first, or better: just save first then generate
        // For a new (unsaved) persona, we need a different approach.
        // Best approach: ask backend to generate from form data inline
        // We'll just build a simple client-side call using the form data
        setFormError('Save the persona first, then use "Generate Missions" to get AI suggestions.');
      }
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to generate missions.');
    } finally {
      setGeneratingMissions(false);
    }
  }

  function addMission() {
    const text = newMissionText.trim();
    if (!text) return;
    const id = `m${Date.now()}`;
    setForm(f => ({ ...f, missions: [...f.missions, { id, text }] }));
    setNewMissionText('');
  }

  function removeMission(id) {
    setForm(f => ({ ...f, missions: f.missions.filter(m => m.id !== id) }));
  }

  function updateMissionText(id, text) {
    setForm(f => ({ ...f, missions: f.missions.map(m => m.id === id ? { ...m, text } : m) }));
  }

  function field(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }));
  }

  function formatContextBadge(p) {
    const parts = [];
    if (p.year_start) parts.push(p.year_end ? `${p.year_start}–${p.year_end}` : String(p.year_start));
    if (p.location)   parts.push(p.location);
    return parts.join(' · ');
  }

  function modeLabel(mode) {
    const opt = MODE_OPTIONS.find(o => o.value === mode);
    return opt ? `${opt.icon} ${opt.label}` : 'Free Conversation';
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
                  {' · '}{modeLabel(p.mode || 'free')}
                  {p.mode === 'missions' && p.missions?.length > 0 && ` (${p.missions.length} mission${p.missions.length !== 1 ? 's' : ''})`}
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
            <AppDatePicker value={form.due_date} onChange={val => setForm(f => ({ ...f, due_date: val }))} />
          </div>
        </div>

        {/* ── Conversation Mode ── */}
        <div className="persona-context-section" style={{ marginTop: 20 }}>
          <div className="persona-context-label">Conversation Mode</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MODE_OPTIONS.map(opt => (
              <label
                key={opt.value}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: `2px solid ${form.mode === opt.value ? 'var(--rust)' : 'var(--border)'}`,
                  background: form.mode === opt.value ? 'rgba(181,69,27,0.05)' : '#fff',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <input
                  type="radio"
                  name="persona-mode"
                  value={opt.value}
                  checked={form.mode === opt.value}
                  onChange={() => setForm(f => ({ ...f, mode: opt.value }))}
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
                    {opt.icon} {opt.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.5 }}>
                    {opt.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ── Missions Editor (only shown when mode === 'missions') ── */}
        {form.mode === 'missions' && (
          <div className="persona-context-section" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="persona-context-label" style={{ marginBottom: 0 }}>Missions</div>
              {editTarget && (
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 12, padding: '4px 12px' }}
                  onClick={handleGenerateMissions}
                  disabled={generatingMissions}
                >
                  {generatingMissions ? 'Generating…' : '✨ Generate with AI'}
                </button>
              )}
              {!editTarget && (
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Save persona first to use AI generation
                </span>
              )}
            </div>

            {form.missions.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                No missions yet. Add missions below or use AI generation after saving.
              </p>
            )}

            {form.missions.map((m, i) => (
              <div key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', paddingTop: 10, minWidth: 20 }}>{i + 1}.</span>
                <textarea
                  rows={2}
                  value={m.text}
                  onChange={e => updateMissionText(m.id, e.target.value)}
                  style={{ flex: 1, fontSize: 13, resize: 'vertical' }}
                  placeholder="Describe the mission objective…"
                />
                <button
                  className="btn btn-ghost"
                  style={{ padding: '6px 10px', fontSize: 13, flexShrink: 0, marginTop: 2 }}
                  onClick={() => removeMission(m.id)}
                >
                  ✕
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                type="text"
                value={newMissionText}
                onChange={e => setNewMissionText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMission(); } }}
                placeholder="Add a new mission…"
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-dark"
                style={{ flexShrink: 0 }}
                onClick={addMission}
                disabled={!newMissionText.trim()}
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* ── Quiz mode info ── */}
        {form.mode === 'quiz' && (
          <div style={{
            marginTop: 16,
            padding: '12px 14px',
            borderRadius: 8,
            background: 'rgba(181,69,27,0.05)',
            border: '1px solid rgba(181,69,27,0.2)',
            fontSize: 13,
            color: 'var(--ink)',
            lineHeight: 1.6,
          }}>
            <strong>How quiz mode works:</strong>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: 18 }}>
              <li>Students chat normally until they reach the minimum exchanges.</li>
              <li>A quiz is automatically generated based on <em>what the student discussed</em> — unique to each student.</li>
              <li>Once the quiz starts, the conversation is locked (students can't go back to chat).</li>
              <li>Scores appear on the results page alongside other assignments.</li>
            </ul>
          </div>
        )}
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
