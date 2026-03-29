import { useState, useEffect, useRef } from 'react';
import AppDatePicker from '../../components/AppDatePicker';
import Modal, { ModalActions } from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  getAssignments, createAssignment, deleteAssignment,
  getAssignment, generateAssignment, saveAssignment, getAllAssignmentResults,
} from '../../api/assignments';
import { uploadFile } from '../../api/files';
import { renderMarkdown } from '../../utils/renderMarkdown';
import '../../styles/pages.css';
import './Teacher.css';

function scoreColor(score) {
  if (score === null || score === undefined) return 'var(--muted)';
  if (score >= 70) return '#2a7a2a';
  if (score >= 40) return '#b8860b';
  return '#c0392b';
}

function scoreBg(score) {
  if (score === null || score === undefined) return 'var(--cream)';
  if (score >= 70) return '#eaf6ea';
  if (score >= 40) return '#fdf8ec';
  return '#fdecea';
}

function typeLabel(type) {
  if (type === 'multiple_choice') return 'Multiple Choice';
  if (type === 'essay') return 'Essay';
  return 'Short Answer';
}

function typeBadgeClass(type) {
  if (type === 'multiple_choice') return 'quiz-question-type--mc';
  if (type === 'essay') return 'quiz-question-type--essay';
  return 'quiz-question-type--sa';
}

function normalizeMcAnswer(answer) {
  return String(answer || '').trim().replace(/^[A-Z]\)\s*/i, '').replace(/^[A-Z][.: -]+\s*/i, '').replace(/\s+/g, ' ').toLowerCase();
}

function isMatchingMcAnswer(studentAnswer, correctAnswer) {
  return normalizeMcAnswer(studentAnswer) !== '' && normalizeMcAnswer(studentAnswer) === normalizeMcAnswer(correctAnswer);
}

const BLANK_SOURCE   = { title: '', content: '', source_type: 'primary', format: 'real', image_url: null };
const BLANK_QUESTION = { question_text: '', type: 'short_answer', options: ['', '', '', ''], correct_answer: '', image_url: null };

// ─── IMAGE UPLOAD ─────────────────────────────────────────────────────────────

function QuestionImageUpload({ unitId, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const dragDepthRef = useRef(0);

  async function uploadImage(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    setError('');
    setUploading(true);
    try {
      const { file: uploaded } = await uploadFile(unitId, file, null, 'assignment_asset');
      onUploaded(uploaded.url);
    } catch {
      setError('Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    await uploadImage(file);
    e.target.value = '';
  }

  function handleDragEnter(e) {
    e.preventDefault();
    if (uploading) return;
    dragDepthRef.current += 1;
    setIsDragActive(true);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDragLeave(e) {
    e.preventDefault();
    if (uploading) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragActive(false);
  }

  async function handleDrop(e) {
    e.preventDefault();
    if (uploading) return;
    dragDepthRef.current = 0;
    setIsDragActive(false);
    await uploadImage(e.dataTransfer?.files?.[0]);
  }

  return (
    <div>
      <label
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          minHeight: 108,
          padding: '18px 16px',
          border: `1px dashed ${isDragActive ? 'var(--ink)' : 'var(--border)'}`,
          borderRadius: 10,
          cursor: uploading ? 'default' : 'pointer',
          fontSize: 13,
          color: 'var(--muted)',
          background: isDragActive ? '#f3f0e8' : '#fafaf8',
          textAlign: 'center',
          transition: 'background 0.15s ease, border-color 0.15s ease',
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
          {uploading ? 'Uploading...' : 'Drag and drop an image here'}
        </span>
        {!uploading && <span>or click to upload</span>}
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
      </label>
      {error && <p style={{ fontSize: 12, color: '#c0392b', marginTop: 6 }}>{error}</p>}
    </div>
  );
}

// ─── ASSIGNMENT LIST VIEW ────────────────────────────────────────────────────

function AssignmentListView({ unit, onSelectAssignment }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [creating, setCreating]       = useState(false);
  const [deleting, setDeleting]       = useState(null);
  const [error, setError]             = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName]         = useState('');
  const [createDueDate, setCreateDueDate]   = useState('');
  const [createError, setCreateError]       = useState('');

  useEffect(() => { if (unit?.id) fetchAssignments(); }, [unit?.id]);

  async function fetchAssignments() {
    setLoading(true);
    try {
      const { assignments } = await getAssignments(unit.id);
      setAssignments(assignments || []);
    } catch { setError('Failed to load assignments.'); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!createName.trim()) { setCreateError('Assignment name is required.'); return; }
    setCreating(true); setCreateError('');
    try {
      const { assignment } = await createAssignment(unit.id, { name: createName.trim(), due_date: createDueDate || null });
      setAssignments(a => [...a, { ...assignment, question_count: 0, source_count: 0 }]);
      setShowCreateForm(false);
      setCreateName('');
      setCreateDueDate('');
      onSelectAssignment(assignment);
    } catch { setCreateError('Failed to create assignment. Try again.'); }
    finally { setCreating(false); }
  }

  async function handleDelete(e, assignmentId) {
    e.stopPropagation();
    if (!window.confirm('Delete this assignment and all its submissions?')) return;
    setDeleting(assignmentId);
    try {
      await deleteAssignment(unit.id, assignmentId);
      setAssignments(a => a.filter(x => x.id !== assignmentId));
    } catch { setError('Failed to delete assignment.'); }
    finally { setDeleting(null); }
  }

  if (loading) return <LoadingSpinner fullPage label="Loading assignments…" />;

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)', margin: 0 }}>Assignments</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
            {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} for this unit
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowCreateForm(true); setCreateError(''); setCreateName(''); setCreateDueDate(''); }}>
          + New Assignment
        </button>
      </div>

      {showCreateForm && (
        <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px', marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 12px', fontFamily: 'var(--font-display)', fontSize: 15 }}>New Assignment</h4>
          {createError && <div className="alert alert-error" style={{ marginBottom: 10 }}>{createError}</div>}
          <div className="field">
            <label>Name</label>
            <input type="text" value={createName} onChange={e => setCreateName(e.target.value)}
              placeholder="e.g. Document Analysis — Reconstruction Era" autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Due Date (optional)</label>
            <AppDatePicker value={createDueDate} onChange={val => setCreateDueDate(val)} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setShowCreateForm(false)}>Cancel</button>
            <button className="btn btn-dark" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating…' : 'Create Assignment'}
            </button>
          </div>
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <h3>No assignments yet</h3>
          <p>Create an assignment to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {assignments.map(a => (
            <div key={a.id}
              style={{
                border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px',
                background: '#fff', display: 'flex', alignItems: 'center', gap: 16,
                cursor: 'pointer', transition: 'box-shadow 0.15s',
              }}
              onClick={() => onSelectAssignment(a)}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(46,34,25,0.09)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--ink)', marginBottom: 5 }}>
                  {a.name}
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
                  <span style={{ background: 'var(--cream)', padding: '2px 9px', borderRadius: 999, fontWeight: 600, color: 'var(--ink)' }}>
                    {a.source_count} source{a.source_count !== 1 ? 's' : ''}
                  </span>
                  <span style={{ background: 'var(--cream)', padding: '2px 9px', borderRadius: 999, fontWeight: 600, color: 'var(--ink)' }}>
                    {a.question_count} question{a.question_count !== 1 ? 's' : ''}
                  </span>
                  {a.due_date && (
                    <span>Due {new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={e => { e.stopPropagation(); onSelectAssignment(a); }}>Edit</button>
                <button className="btn btn-danger" style={{ fontSize: 13 }} onClick={e => handleDelete(e, a.id)} disabled={deleting === a.id}>
                  {deleting === a.id ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ASSIGNMENT EDITOR (single assignment) ────────────────────────────────────

function AssignmentEditorInner({ unit, assignment: initialAssignment, students = [], onBack }) {
  const [assignment, setAssignment] = useState(initialAssignment);
  const [sources, setSources]       = useState([]);
  const [questions, setQuestions]   = useState([]);
  const [dueDate, setDueDate]       = useState('');
  const [essayGuideEnabled, setEssayGuideEnabled] = useState(true);

  const [loading, setLoading]       = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState('');

  const [genSources, setGenSources]     = useState(2);
  const [genQuestions, setGenQuestions] = useState(4);

  const [activeTab, setActiveTab] = useState('content');

  const [sourceModal, setSourceModal]           = useState(false);
  const [editSourceIdx, setEditSourceIdx]       = useState(null);
  const [sourceForm, setSourceForm]             = useState({ ...BLANK_SOURCE });
  const [sourceFormError, setSourceFormError]   = useState('');

  const [questionModal, setQuestionModal]         = useState(false);
  const [editQuestionIdx, setEditQuestionIdx]     = useState(null);
  const [qForm, setQForm]                         = useState({ ...BLANK_QUESTION, options: ['', '', '', ''] });
  const [qFormError, setQFormError]               = useState('');

  const [submissions, setSubmissions]                 = useState([]);
  const [submissionsLoading, setSubmissionsLoading]   = useState(false);
  const [selectedSubmission, setSelectedSubmission]   = useState(null);

  const hasEssayQuestions = questions.some(q => q.type === 'essay');

  useEffect(() => { fetchAssignment(); }, [assignment.id]);
  useEffect(() => { if (activeTab === 'students') fetchSubmissions(); }, [activeTab]);

  async function fetchAssignment() {
    setLoading(true);
    try {
      const { assignment: fresh } = await getAssignment(unit.id, assignment.id);
      if (fresh) {
        setAssignment(fresh);
        setSources(fresh.sources || []);
        setQuestions(fresh.questions || []);
        setDueDate(fresh.due_date?.slice(0, 10) || '');
        setEssayGuideEnabled(fresh.essay_guide_enabled ?? true);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }

  async function fetchSubmissions() {
    setSubmissionsLoading(true);
    try {
      const { submissions } = await getAllAssignmentResults(unit.id, assignment.id);
      const enrolledIds = new Set(students.map(s => s.id));
      setSubmissions((submissions || []).filter(s => enrolledIds.has(s.student_id)));
    } catch { /* silent */ } finally { setSubmissionsLoading(false); }
  }

  async function handleGenerate() {
    if (!unit?.context) { setError('This unit has no context. Edit the unit to add context before generating.'); return; }
    setError(''); setGenerating(true);
    try {
      const { assignment: updated } = await generateAssignment(unit.id, assignment.id, { source_count: genSources, question_count: genQuestions });
      setAssignment(updated); setSources(updated.sources || []); setQuestions(updated.questions || []);
    } catch (err) { setError(err.response?.data?.error || 'Generation failed. Try again.'); }
    finally { setGenerating(false); }
  }

  async function handleSave() {
    if (sources.length === 0 && questions.length === 0) { setError('Add at least one source or question before saving.'); return; }
    setError(''); setSaving(true);
    try {
      const { assignment: updated } = await saveAssignment(unit.id, assignment.id, {
        sources, questions, due_date: dueDate || null, essay_guide_enabled: essayGuideEnabled,
      });
      setAssignment(updated); setSources(updated.sources || []); setQuestions(updated.questions || []);
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch { setError('Failed to save assignment.'); }
    finally { setSaving(false); }
  }

  function openAddSource() { setEditSourceIdx(null); setSourceForm({ ...BLANK_SOURCE }); setSourceFormError(''); setSourceModal(true); }
  function openEditSource(idx) { setEditSourceIdx(idx); setSourceForm({ ...sources[idx], image_url: sources[idx].image_url || null }); setSourceFormError(''); setSourceModal(true); }

  function handleSourceSubmit() {
    if (!sourceForm.title.trim()) { setSourceFormError('Title is required.'); return; }
    if (!sourceForm.content.trim() && !sourceForm.image_url) { setSourceFormError('Content or an image is required.'); return; }
    const built = { ...sourceForm, title: sourceForm.title.trim(), content: sourceForm.content.trim(), order_index: editSourceIdx !== null ? editSourceIdx : sources.length, image_url: sourceForm.image_url || null };
    if (editSourceIdx !== null) { setSources(s => s.map((x, i) => i === editSourceIdx ? built : x)); }
    else { setSources(s => [...s, built]); }
    setSourceModal(false);
  }

  function removeSource(idx) { setSources(s => s.filter((_, i) => i !== idx).map((x, i) => ({ ...x, order_index: i }))); }

  function openAddQuestion() { setEditQuestionIdx(null); setQForm({ ...BLANK_QUESTION, options: ['', '', '', ''] }); setQFormError(''); setQuestionModal(true); }
  function openEditQuestion(idx) {
    const q = questions[idx]; setEditQuestionIdx(idx);
    setQForm({ question_text: q.question_text, type: q.type, options: q.options ? [...q.options] : ['', '', '', ''], correct_answer: q.correct_answer, image_url: q.image_url || null });
    setQFormError(''); setQuestionModal(true);
  }

  function handleQuestionSubmit() {
    if (!qForm.question_text.trim()) { setQFormError('Question text is required.'); return; }
    if (!qForm.correct_answer.trim()) { setQFormError(qForm.type === 'essay' ? 'Grading prompt is required.' : 'Correct answer is required.'); return; }
    if (qForm.type === 'multiple_choice' && qForm.options.filter(o => o.trim()).length < 2) { setQFormError('Add at least 2 options.'); return; }
    const built = {
      question_text: qForm.question_text.trim(), type: qForm.type,
      options: qForm.type === 'multiple_choice' ? qForm.options.filter(o => o.trim()) : null,
      correct_answer: qForm.correct_answer.trim(),
      order_index: editQuestionIdx !== null ? editQuestionIdx : questions.length,
      image_url: qForm.image_url || null,
    };
    if (editQuestionIdx !== null) { setQuestions(qs => qs.map((q, i) => i === editQuestionIdx ? built : q)); }
    else { setQuestions(qs => [...qs, built]); }
    setQuestionModal(false);
  }

  function removeQuestion(idx) { setQuestions(qs => qs.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order_index: i }))); }

  if (loading) return <LoadingSpinner fullPage label="Loading assignment…" />;

  return (
    <div>
      {/* Back nav */}
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, fontSize: 13, fontFamily: 'var(--font-body)', marginBottom: 18 }}>
        ← All Assignments
      </button>

      <div className="quiz-tab-bar">
        <button className={`quiz-tab ${activeTab === 'content' ? 'quiz-tab--active' : ''}`} onClick={() => setActiveTab('content')}>
          Content {(sources.length > 0 || questions.length > 0) && <span className="quiz-tab-badge">{sources.length + questions.length}</span>}
        </button>
        <button className={`quiz-tab ${activeTab === 'students' ? 'quiz-tab--active' : ''}`} onClick={() => setActiveTab('students')}>
          Student Results {submissions.length > 0 && <span className="quiz-tab-badge">{submissions.length}</span>}
        </button>
      </div>

      {/* ══════════ CONTENT TAB ══════════ */}
      {activeTab === 'content' && (
        <>
          {error && <div className="alert alert-error">{error}</div>}
          {saved && <div className="alert alert-success">Assignment saved successfully.</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={generating || saving}>
                {generating ? <><LoadingSpinner size="sm" /> Generating…</> : '✨ Generate with AI'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="number" min={1} max={6} value={genSources} onChange={e => setGenSources(Number(e.target.value))}
                  style={{ width: 48, padding: '8px 8px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 13 }} title="Number of sources" />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>sources</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="number" min={1} max={20} value={genQuestions} onChange={e => setGenQuestions(Number(e.target.value))}
                  style={{ width: 48, padding: '8px 8px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 13 }} title="Number of questions" />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>questions</span>
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Due Date</span>
                <AppDatePicker value={dueDate} onChange={val => setDueDate(val)} />
              </div>
              <button className="btn btn-ghost" onClick={openAddSource}>+ Source</button>
              <button className="btn btn-ghost" onClick={openAddQuestion}>+ Question</button>
              <button className="btn btn-dark" onClick={handleSave} disabled={saving || generating}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>

          {hasEssayQuestions && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', marginBottom: 16,
              background: essayGuideEnabled ? '#fef3cd' : 'var(--cream)',
              border: `1px solid ${essayGuideEnabled ? '#f0c040' : 'var(--border)'}`,
              borderRadius: 6,
            }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>✍️ Essay Guide</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>
                  {essayGuideEnabled ? 'Students can open the AI essay planning guide on essay questions' : 'Essay guide is hidden from students'}
                </span>
              </div>
              <button
                onClick={() => setEssayGuideEnabled(v => !v)}
                style={{
                  padding: '5px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                  border: '1px solid var(--border)', cursor: 'pointer',
                  background: essayGuideEnabled ? 'var(--rust)' : '#fff',
                  color: essayGuideEnabled ? '#fff' : 'var(--muted)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {essayGuideEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          )}

          {sources.length === 0 && questions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"></div>
              <h3>No content yet</h3>
              <p>Generate sources and questions with AI, or add them manually.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {sources.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 className="assignment-section-heading">Sources<span className="assignment-section-count">{sources.length}</span></h3>
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 12px' }} onClick={openAddSource}>+ Add</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {sources.map((s, i) => (
                      <div key={i} className="assignment-source-card">
                        <div className="assignment-source-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                            <span className={`assignment-source-badge assignment-source-badge--${s.source_type}`}>{s.source_type === 'primary' ? 'Primary' : 'Secondary'}</span>
                            {s.format === 'ai_generated' && <span className="assignment-source-badge assignment-source-badge--ai">AI</span>}
                            <span className="assignment-source-title">{s.title}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => openEditSource(i)}>Edit</button>
                            <button className="btn btn-danger" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => removeSource(i)}>Remove</button>
                          </div>
                        </div>
                        {s.image_url && <img src={s.image_url} alt="Source" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, border: '1px solid var(--border)', objectFit: 'contain', marginBottom: 8, display: 'block' }} />}
                        <p className="assignment-source-preview">{s.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {questions.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 className="assignment-section-heading">Questions<span className="assignment-section-count">{questions.length}</span></h3>
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 12px' }} onClick={openAddQuestion}>+ Add</button>
                  </div>
                  <div className="quiz-question-list">
                    {questions.map((q, i) => (
                      <div key={i} className="quiz-question-item">
                        <div className="quiz-question-header">
                          <span className="quiz-question-num">Question {i + 1}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className={`quiz-question-type ${typeBadgeClass(q.type)}`}>{typeLabel(q.type)}</span>
                            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => openEditQuestion(i)}>Edit</button>
                            <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => removeQuestion(i)}>Remove</button>
                          </div>
                        </div>
                        <div className="quiz-question-text quiz-question-text--markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(q.question_text) }} />
                        {q.image_url && <img src={q.image_url} alt="Question" style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 6, border: '1px solid var(--border)', objectFit: 'contain', marginBottom: 8 }} />}
                        {q.type === 'multiple_choice' && q.options && (
                          <div className="quiz-question-options">
                            {q.options.map((opt, oi) => (
                              <div key={oi} className={`quiz-option ${opt === q.correct_answer ? 'quiz-option--correct' : ''}`}>
                                <span className="quiz-option-bullet">{opt === q.correct_answer ? '✓' : '○'}</span>{opt}
                              </div>
                            ))}
                          </div>
                        )}
                        {q.type === 'short_answer' && <div className="quiz-question-answer">Model answer: {q.correct_answer}</div>}
                        {q.type === 'essay' && (
                          <div className="quiz-question-essay-prompt">
                            <span className="quiz-question-essay-prompt-label">Grading prompt:</span>{q.correct_answer}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════ STUDENT RESULTS TAB ══════════ */}
      {activeTab === 'students' && (
        <>
          {submissionsLoading ? (
            <LoadingSpinner fullPage label="Loading results…" />
          ) : submissions.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"></div><h3>No submissions yet</h3><p>Students haven't submitted yet.</p></div>
          ) : (
            <div className="quiz-results-layout">
              <div className="quiz-results-list">
                <div className="quiz-results-list-header">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</div>
                {submissions.map(sub => (
                  <button key={sub.id}
                    className={`quiz-results-student-row ${selectedSubmission?.id === sub.id ? 'quiz-results-student-row--active' : ''}`}
                    onClick={() => setSelectedSubmission(sub)}>
                    <div className="quiz-results-student-name">{sub.profiles?.display_name || 'Unknown Student'}</div>
                    <div className="quiz-results-student-score" style={{ color: scoreColor(sub.score), background: scoreBg(sub.score) }}>
                      {sub.score !== null ? `${sub.score}%` : '—'}
                    </div>
                  </button>
                ))}
              </div>

              <div className="quiz-results-detail">
                {!selectedSubmission ? (
                  <div className="quiz-results-empty"><p style={{ color: 'var(--muted)', fontSize: 14 }}>Select a student to view their results</p></div>
                ) : (
                  <>
                    <div className="quiz-results-detail-header">
                      <div>
                        <div className="quiz-results-detail-name">{selectedSubmission.profiles?.display_name || 'Unknown Student'}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          Submitted {new Date(selectedSubmission.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="quiz-results-detail-score" style={{ color: scoreColor(selectedSubmission.score) }}>
                        {selectedSubmission.score !== null ? `${selectedSubmission.score}%` : '—'}
                      </div>
                    </div>

                    <div className="divider" style={{ margin: '16px 0' }} />
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 14, color: 'var(--ink)' }}>Full Submission</h3>

                    {questions.map((q, i) => {
                      const studentAnswer = selectedSubmission.answers?.find(a => a.question_id === q.id);
                      const saResult      = selectedSubmission.sa_feedback?.find(r => r.question_id === q.id);
                      const essayResult   = selectedSubmission.essay_feedback?.find(r => r.question_id === q.id);
                      const isMC    = q.type === 'multiple_choice';
                      const isEssay = q.type === 'essay';
                      const isCorrect = isMC && isMatchingMcAnswer(studentAnswer?.answer, q.correct_answer);

                      return (
                        <div key={q.id || i} className="quiz-results-question-item">
                          <div className="quiz-results-question-meta">
                            <span>Q{i + 1} · {typeLabel(q.type)}</span>
                            {isMC && <span style={{ fontSize: 11, fontWeight: 600, color: isCorrect ? '#2a7a2a' : '#c0392b' }}>{isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>}
                            {!isMC && !isEssay && saResult?.score !== null && saResult?.score !== undefined && <span style={{ fontSize: 12, fontWeight: 600, color: scoreColor(saResult.score) }}>{saResult.score}%</span>}
                            {isEssay && essayResult?.score !== null && essayResult?.score !== undefined && <span style={{ fontSize: 12, fontWeight: 600, color: scoreColor(essayResult.score) }}>{essayResult.score}%</span>}
                          </div>
                          <div className="quiz-question-text quiz-question-text--markdown" style={{ fontSize: 14, marginBottom: 8 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(q.question_text) }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--cream)', padding: '6px 10px', borderRadius: 4 }}>
                              <strong>Student:</strong> {studentAnswer?.answer || '—'}
                            </div>
                            {isMC && !isCorrect && <div style={{ fontSize: 12, color: '#2a7a2a', background: '#eaf6ea', padding: '6px 10px', borderRadius: 4 }}><strong>Correct:</strong> {q.correct_answer}</div>}
                            {!isMC && !isEssay && saResult?.feedback && <div style={{ fontSize: 12, color: 'var(--ink)', padding: '6px 10px', background: '#fff', border: '1px solid var(--border)', borderLeft: `3px solid ${scoreColor(saResult.score ?? 0)}`, borderRadius: '0 4px 4px 0', lineHeight: 1.6 }}>💬 {saResult.feedback}</div>}
                            {isEssay && essayResult && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {essayResult.breakdown && (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                                    {Object.entries(essayResult.breakdown).map(([key, val]) => (
                                      <div key={key} className="essay-breakdown-cell">
                                        <div className="essay-breakdown-label">{key}</div>
                                        <div className="essay-breakdown-score" style={{ color: scoreColor(val * 4) }}>{val}<span className="essay-breakdown-denom">/25</span></div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {essayResult.feedback && <div style={{ fontSize: 12, color: 'var(--ink)', padding: '8px 12px', background: '#fff', border: '1px solid var(--border)', borderLeft: `3px solid ${scoreColor(essayResult.score ?? 0)}`, borderRadius: '0 4px 4px 0', lineHeight: 1.6 }}>💬 {essayResult.feedback}</div>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Source Modal */}
      <Modal isOpen={sourceModal} onClose={() => setSourceModal(false)} title={editSourceIdx !== null ? 'Edit Source' : 'Add Source'} size="lg"
        footer={<ModalActions onCancel={() => setSourceModal(false)} onConfirm={handleSourceSubmit} confirmLabel={editSourceIdx !== null ? 'Save' : 'Add'} />}>
        {sourceFormError && <div className="alert alert-error">{sourceFormError}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Source Type</label>
            <select value={sourceForm.source_type} onChange={e => setSourceForm(f => ({ ...f, source_type: e.target.value }))}>
              <option value="primary">Primary Source</option>
              <option value="secondary">Secondary Source</option>
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Format</label>
            <select value={sourceForm.format} onChange={e => setSourceForm(f => ({ ...f, format: e.target.value }))}>
              <option value="real">Real / Authentic</option>
              <option value="ai_generated">AI Generated</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Title</label>
          <input type="text" value={sourceForm.title} onChange={e => setSourceForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Letter from Abraham Lincoln to Horace Greeley, 1862" autoFocus />
        </div>
        <div className="field">
          <label>Image <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
          {sourceForm.image_url ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <img src={sourceForm.image_url} alt="Source" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 6, border: '1px solid var(--border)', objectFit: 'contain' }} />
              <button type="button" className="btn btn-danger" style={{ alignSelf: 'flex-start', padding: '4px 12px', fontSize: 12 }} onClick={() => setSourceForm(f => ({ ...f, image_url: null }))}>Remove Image</button>
            </div>
          ) : (
            <QuestionImageUpload unitId={unit?.id} onUploaded={url => setSourceForm(f => ({ ...f, image_url: url }))} />
          )}
        </div>
        <div className="field">
          <label>Content <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional if image is provided)</span></label>
          <textarea rows={10} value={sourceForm.content} onChange={e => setSourceForm(f => ({ ...f, content: e.target.value }))} placeholder="Paste or type the full text of the document or reading…" style={{ fontFamily: 'var(--font-body)', lineHeight: 1.7 }} />
        </div>
      </Modal>

      {/* Question Modal */}
      <Modal isOpen={questionModal} onClose={() => setQuestionModal(false)} title={editQuestionIdx !== null ? 'Edit Question' : 'Add Question'} size="md"
        footer={<ModalActions onCancel={() => setQuestionModal(false)} onConfirm={handleQuestionSubmit} confirmLabel={editQuestionIdx !== null ? 'Save' : 'Add'} />}>
        {qFormError && <div className="alert alert-error">{qFormError}</div>}
        <div className="field">
          <label>Question Type</label>
          <select value={qForm.type} onChange={e => setQForm(f => ({ ...f, type: e.target.value, correct_answer: '' }))}>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="short_answer">Short Answer</option>
            <option value="essay">Essay</option>
          </select>
        </div>
        <div className="field">
          <label>Question Text</label>
          <textarea rows={3} value={qForm.question_text} onChange={e => setQForm(f => ({ ...f, question_text: e.target.value }))} placeholder="Enter your question…" autoFocus />
        </div>
        {qForm.image_url && (
          <div className="field">
            <label>Image</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <img src={qForm.image_url} alt="Question" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 6, border: '1px solid var(--border)', objectFit: 'contain' }} />
              <button type="button" className="btn btn-danger" style={{ alignSelf: 'flex-start', padding: '4px 12px', fontSize: 12 }} onClick={() => setQForm(f => ({ ...f, image_url: null }))}>Remove Image</button>
            </div>
          </div>
        )}
        {qForm.type === 'multiple_choice' && (
          <div className="field">
            <label>Answer Options</label>
            {qForm.options.map((opt, i) => (
              <input key={i} type="text" value={opt}
                onChange={e => { const next = [...qForm.options]; next[i] = e.target.value; setQForm(f => ({ ...f, options: next })); }}
                placeholder={`Option ${i + 1}`} style={{ marginBottom: 8 }} />
            ))}
          </div>
        )}
        <div className="field">
          {qForm.type === 'multiple_choice' && (
            <>
              <label>Correct Answer</label>
              <select value={qForm.correct_answer} onChange={e => setQForm(f => ({ ...f, correct_answer: e.target.value }))}>
                <option value="">Select the correct option…</option>
                {qForm.options.filter(o => o.trim()).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
              </select>
            </>
          )}
          {qForm.type === 'short_answer' && (
            <>
              <label>Model Answer</label>
              <input type="text" value={qForm.correct_answer} onChange={e => setQForm(f => ({ ...f, correct_answer: e.target.value }))} placeholder="Model answer for this question…" />
            </>
          )}
          {qForm.type === 'essay' && (
            <>
              <label>Grading Prompt</label>
              <textarea rows={4} value={qForm.correct_answer} onChange={e => setQForm(f => ({ ...f, correct_answer: e.target.value }))}
                placeholder="Describe what a strong response should include — thesis, evidence to cite from the sources, analysis depth, whether a counterclaim is required…" />
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>Not shown to students. Used by the AI grader.</p>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ─── ROOT EXPORT ──────────────────────────────────────────────────────────────

export default function AssignmentEditor({ unit, students = [] }) {
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  if (selectedAssignment) {
    return (
      <AssignmentEditorInner
        unit={unit}
        assignment={selectedAssignment}
        students={students}
        onBack={() => setSelectedAssignment(null)}
      />
    );
  }

  return (
    <AssignmentListView
      unit={unit}
      onSelectAssignment={setSelectedAssignment}
    />
  );
}
