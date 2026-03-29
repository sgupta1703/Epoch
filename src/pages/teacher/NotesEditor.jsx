import { useState, useEffect, useRef } from 'react';
import AppDatePicker from '../../components/AppDatePicker';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getNotes, generateNotes, saveNotes } from '../../api/notes';
import { getFiles, uploadFile, deleteFile } from '../../api/files';
import '../../styles/pages.css';
import './Teacher.css';

function fileIcon(mimeType) {
  if (!mimeType) return '📎';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📕';
  if (mimeType.includes('word')) return '📘';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📗';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📙';
  return '📎';
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NotesEditor({ unit }) {
  const [notes, setNotes] = useState(null);
  const [content, setContent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Files
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!unit?.id) return;
    fetchAll();
  }, [unit?.id]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [{ notes }, { files }] = await Promise.all([
        getNotes(unit.id),
        getFiles(unit.id, 'notes_attachment'),
      ]);
      if (notes) {
        setNotes(notes);
        setContent(notes.content || '');
        setDueDate(notes.due_date?.slice(0, 10) || '');
      }
      setFiles(files || []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!unit?.context) {
      setError('This unit has no context set. Edit the unit to add context before generating notes.');
      return;
    }
    setError('');
    setGenerating(true);
    try {
      const { notes } = await generateNotes(unit.id);
      setNotes(notes);
      setContent(notes.content || '');
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed. Try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!content.trim()) { setError('Notes cannot be empty.'); return; }
    setError('');
    setSaving(true);
    try {
      const { notes } = await saveNotes(unit.id, { content, due_date: dueDate || null });
      setNotes(notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Failed to save notes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file) {
    if (!file) return;
    setUploadError('');
    setUploading(true);
    setUploadProgress(0);
    try {
      const { file: uploaded } = await uploadFile(unit.id, file, pct => setUploadProgress(pct), 'notes_attachment');
      setFiles(f => [uploaded, ...f]);
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed. Try again.');
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(fileId) {
    try {
      await deleteFile(unit.id, fileId);
      setFiles(f => f.filter(x => x.id !== fileId));
    } catch { /* silent */ }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  if (loading) return <LoadingSpinner fullPage label="Loading notes…" />;

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}
      {saved && <div className="alert alert-success">Notes saved successfully.</div>}

      {/* ── Notes toolbar ── */}
      <div className="notes-editor-toolbar">
        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generating || saving}
        >
          {generating ? <><LoadingSpinner size="sm" /> Generating…</> : '✨ Generate with AI'}
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="field" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ margin: 0, whiteSpace: 'nowrap' }}>Due Date</label>
            <AppDatePicker value={dueDate} onChange={val => setDueDate(val)} />
          </div>
          <button
            className="btn btn-dark"
            onClick={handleSave}
            disabled={saving || generating}
          >
            {saving ? 'Saving…' : 'Save Notes'}
          </button>
        </div>
      </div>

      {/* ── Notes textarea ── */}
      <textarea
        className="notes-editor-textarea"
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={
          unit?.context
            ? 'Click "Generate with AI" to auto-generate notes, or type your own here…'
            : 'Add a unit context first, then generate notes with AI, or type them manually here…'
        }
      />

      {notes?.generated_at && (
        <p className="notes-generated-at">
          Last generated: {new Date(notes.generated_at).toLocaleString()}
        </p>
      )}

      {/* ── Attachments section ── */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--ink)', margin: 0 }}>
            Attachments
          </h3>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 13 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            + Upload File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv"
            onChange={e => handleUpload(e.target.files?.[0])}
          />
        </div>

        {uploadError && <div className="alert alert-error" style={{ marginBottom: 10 }}>{uploadError}</div>}

        {/* Drop zone */}
        <div
          className={`file-drop-zone ${dragging ? 'file-drop-zone--active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <LoadingSpinner size="sm" />
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Uploading… {uploadProgress}%</span>
              <div style={{ width: 160, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--rust)', borderRadius: 2, transition: 'width 0.2s' }} />
              </div>
            </div>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              {dragging ? 'Drop to upload' : 'Drag & drop a file here, or click to browse'}
            </span>
          )}
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="file-list">
            {files.map(f => (
              <div key={f.id} className="file-item">
                <span className="file-item-icon">{fileIcon(f.mime_type)}</span>
                <div className="file-item-info">
                  <span className="file-item-name">{f.name}</span>
                  <span className="file-item-size">{formatBytes(f.size)}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                  >
                    View
                  </a>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => handleDelete(f.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {files.length === 0 && !uploading && (
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>
            No attachments yet. Upload PDFs, images, Word docs, and more for students to download.
          </p>
        )}
      </div>
    </div>
  );
}
