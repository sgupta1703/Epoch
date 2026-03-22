import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getClassrooms } from '../../api/classrooms';
import { getUnit } from '../../api/units';
import { getNotes } from '../../api/notes';
import { getFiles } from '../../api/files';
import { renderMarkdown } from '../../utils/renderMarkdown';
import '../../styles/pages.css';
import './Student.css';

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

function canPreview(mimeType) {
  if (!mimeType) return false;
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
}

function FileViewer({ file, onClose }) {
  const isImage = file.mime_type?.startsWith('image/');
  const isPdf   = file.mime_type === 'application/pdf';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Header */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 980,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', marginBottom: 8,
        }}
      >
        <span style={{
          color: '#fff', fontSize: 14, fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {file.name}
        </span>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <a
            href={file.url}
            download={file.name}
            style={{
              fontSize: 12, padding: '5px 12px', borderRadius: 4,
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              textDecoration: 'none', border: '1px solid rgba(255,255,255,0.25)',
            }}
          >
            ↓ Download
          </a>
          <button
            onClick={onClose}
            style={{
              fontSize: 18, lineHeight: 1, padding: '3px 10px', borderRadius: 4,
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 980,
          height: 'calc(100vh - 110px)',
          borderRadius: 8, overflow: 'hidden',
          background: '#111',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {isImage && (
          <img
            src={file.url}
            alt={file.name}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        )}
        {isPdf && (
          <iframe
            src={file.url}
            title={file.name}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        )}
      </div>
    </div>
  );
}

export default function NotesView({ user }) {
  const { classroomId, unitId } = useParams();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [unit, setUnit] = useState(null);
  const [notes, setNotes] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingFile, setViewingFile] = useState(null);

  useEffect(() => {
    fetchAll();
  }, [unitId]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setViewingFile(null); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const [{ classrooms }, { unit }, { notes }, { files }] = await Promise.all([
        getClassrooms(),
        getUnit(unitId),
        getNotes(unitId),
        getFiles(unitId),
      ]);
      setClassrooms(classrooms);
      setUnit(unit);
      setNotes(notes);
      setFiles(files || []);
    } catch {
      setError('Failed to load notes.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <>
      <Navbar user={user} />
      <div className="app-shell">
        <Sidebar classrooms={[]} activeId={classroomId} role="student" loading={loading} />
        <main className="page-main"><LoadingSpinner fullPage label="Loading notes…" /></main>
      </div>
    </>
  );

  return (
    <>
      <Navbar user={user} />
      <div className="app-shell">
        <Sidebar classrooms={classrooms} activeId={classroomId} role="student" loading={loading} />

        <main className="page-main">
          <p
            className="page-eyebrow"
            style={{ marginBottom: 8, cursor: 'pointer' }}
            onClick={() => navigate(`/student/classroom/${classroomId}/unit/${unitId}`)}
          >
            ← Back to Unit
          </p>

          <div className="page-header">
            <div className="page-header-left">
              <h1 className="page-title">📄 Notes</h1>
              <p className="page-subtitle">{unit?.title}</p>
            </div>
            {notes?.due_date && (
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                Due {new Date(notes.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {!notes && files.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📄</div>
              <h3>Notes not yet available</h3>
              <p>Your teacher hasn't published notes for this unit yet.</p>
            </div>
          ) : (
            <>
              {notes && (
                <div
                  className="notes-content"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(notes.content) }}
                />
              )}

              {files.length > 0 && (
                <div style={{ marginTop: notes ? 36 : 0 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--ink)', marginBottom: 12 }}>
                    Attachments
                  </h3>
                  <div className="file-list">
                    {files.map(f => (
                      <div key={f.id} className="file-item">
                        <span className="file-item-icon">{fileIcon(f.mime_type)}</span>
                        <div className="file-item-info">
                          <span className="file-item-name">{f.name}</span>
                          <span className="file-item-size">{formatBytes(f.size)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {canPreview(f.mime_type) && (
                            <button
                              onClick={() => setViewingFile(f)}
                              className="btn btn-ghost"
                              style={{ padding: '4px 12px', fontSize: 12 }}
                            >
                              View
                            </button>
                          )}
                          <a
                            href={f.url}
                            download={f.name}
                            className="btn btn-ghost"
                            style={{ padding: '4px 12px', fontSize: 12 }}
                          >
                            ↓ Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {viewingFile && (
        <FileViewer file={viewingFile} onClose={() => setViewingFile(null)} />
      )}
    </>
  );
}
