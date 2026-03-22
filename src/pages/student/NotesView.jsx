import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getNotes } from '../../api/notes';
import { getFiles } from '../../api/files';
import { renderMarkdown } from '../../utils/renderMarkdown';
import '../../styles/pages.css';
import './Student.css';

// ─── Section definitions ───────────────────────────────────────────────────
const SECTION_DEFINITIONS = [
  { title: 'Overview',              aliases: ['overview'] },
  { title: 'Historical Background', aliases: ['historical background', 'background'] },
  { title: 'Key Figures',           aliases: ['key figures', 'important figures', 'major figures'] },
  { title: 'Timeline of Events',    aliases: ['timeline of events', 'timeline', 'events timeline'] },
  { title: 'Causes & Effects',      aliases: ['causes & effects', 'causes and effects', 'causes', 'effects'] },
  { title: 'Significance & Legacy', aliases: ['significance & legacy', 'significance and legacy', 'legacy', 'significance'] },
];

// ─── Markdown parser ───────────────────────────────────────────────────────
function normalizeTitleLine(line) {
  const cleaned = line
    .trim()
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\d+[\.\)]\s*/, '')
    .replace(/^[•*-]\s*/, '')
    .replace(/\s*[:：]\s*$/, '')
    .trim()
    .toLowerCase();

  for (const section of SECTION_DEFINITIONS) {
    if (section.aliases.includes(cleaned)) return section.title;
  }
  return null;
}

function splitMarkdownIntoSections(markdown) {
  const text = (markdown || '').trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = null;
  let preamble = [];

  for (const line of lines) {
    const sectionTitle = normalizeTitleLine(line);
    if (sectionTitle) {
      if (current) sections.push({ title: current.title, markdown: current.lines.join('\n').trim() });
      current = { title: sectionTitle, lines: [`## ${sectionTitle}`] };
      continue;
    }
    if (current) current.lines.push(line);
    else preamble.push(line);
  }

  if (current) sections.push({ title: current.title, markdown: current.lines.join('\n').trim() });
  if (!sections.length) return [{ title: 'All Notes', markdown: text }];

  const preambleText = preamble.join('\n').trim();
  if (preambleText) sections[0].markdown = `${preambleText}\n\n${sections[0].markdown}`.trim();

  return sections.filter(s => s.markdown.trim());
}

// ─── File helpers ──────────────────────────────────────────────────────────
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

// ─── File lightbox ─────────────────────────────────────────────────────────
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
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 980,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', marginBottom: 8,
        }}
      >
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.name}
        </span>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <a href={file.url} download={file.name}
            style={{ fontSize: 12, padding: '5px 12px', borderRadius: 4, background: 'rgba(255,255,255,0.15)', color: '#fff', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.25)' }}
          >↓ Download</a>
          <button onClick={onClose}
            style={{ fontSize: 18, lineHeight: 1, padding: '3px 10px', borderRadius: 4, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer' }}
          >✕</button>
        </div>
      </div>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 980, height: 'calc(100vh - 110px)',
          borderRadius: 6, overflow: 'hidden', background: '#111',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {isImage && <img src={file.url} alt={file.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
        {isPdf   && <iframe src={file.url} title={file.name} style={{ width: '100%', height: '100%', border: 'none' }} />}
      </div>
    </div>
  );
}

// ─── Rendered markdown ─────────────────────────────────────────────────────
function NotesMarkdown({ markdown }) {
  const html = useMemo(() => renderMarkdown(markdown || ''), [markdown]);
  return <div className="notes-markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}

// ─── Main view ─────────────────────────────────────────────────────────────
export default function NotesView({ user }) {
  const { unitId } = useParams();
  const [notes, setNotes]             = useState(null);
  const [files, setFiles]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [viewingFile, setViewingFile] = useState(null);
  const [activeTab, setActiveTab]     = useState('all');

  useEffect(() => { fetchAll(); }, [unitId]);
  useEffect(() => { setActiveTab('all'); }, [notes?.content]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setViewingFile(null); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function fetchAll() {
    setLoading(true); setError('');
    try {
      const [{ notes }, { files }] = await Promise.all([getNotes(unitId), getFiles(unitId)]);
      setNotes(notes || null);
      setFiles(files || []);
    } catch {
      setError('Failed to load notes.');
    } finally {
      setLoading(false);
    }
  }

  const sections = useMemo(() => {
    if (!notes?.content) return [];
    const parsed = splitMarkdownIntoSections(notes.content);
    return [
      { id: 'all', label: 'All Notes', markdown: notes.content.trim() },
      ...parsed.map((s, i) => ({ id: `section-${i}`, label: s.title, markdown: s.markdown })),
    ];
  }, [notes?.content]);

  const activeSection = useMemo(
    () => sections.find(s => s.id === activeTab) ?? sections[0],
    [activeTab, sections],
  );

  if (loading) return <LoadingSpinner label="Loading notes…" />;

  return (
    <>
      <style>{NOTES_MARKDOWN_CSS}</style>

      {error && <div className="alert alert-error">{error}</div>}

      {!notes && files.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <h3>Notes not yet available</h3>
          <p>Your teacher hasn't published notes for this unit yet.</p>
        </div>
      ) : (
        <>
          {notes && sections.length > 0 && (
            <div
              style={{
                display: 'flex',
                marginBottom: files.length > 0 ? 28 : 0,
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: '#fff',
                overflow: 'hidden',
                minHeight: 420,
              }}
            >
              {/* Vertical tab rail — matches .assignment-sources-panel aesthetic */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flexShrink: 0,
                  width: 172,
                  borderRight: '1px solid var(--border)',
                  background: 'var(--cream)',
                }}
              >
                {/* Rail header — matches .assignment-sources-header */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--border)',
                    fontFamily: 'var(--font-display)',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  Sections
                </div>

                {sections.map(section => {
                  const active = activeTab === section.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveTab(section.id)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '9px 14px',
                        border: 'none',
                        borderLeft: active
                          ? '2px solid var(--rust)'
                          : '2px solid transparent',
                        background: active
                          ? 'rgba(184,76,43,0.06)'
                          : 'transparent',
                        color: active ? 'var(--rust)' : 'var(--muted)',
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        fontFamily: 'var(--font-body)',
                        cursor: 'pointer',
                        transition: 'background 0.12s, color 0.12s, border-color 0.12s',
                        lineHeight: 1.35,
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--ink)'; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--muted)'; }}
                    >
                      {section.label}
                    </button>
                  );
                })}
              </div>

              {/* Content pane */}
              <div style={{ flex: 1, padding: '24px 28px', minWidth: 0 }}>
                <NotesMarkdown markdown={activeSection?.markdown ?? notes.content} />
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div style={{ marginTop: notes ? 24 : 0 }}>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 17,
                  color: 'var(--ink)',
                  marginBottom: 12,
                }}
              >
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
                        <button onClick={() => setViewingFile(f)} className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 12 }}>
                          View
                        </button>
                      )}
                      <a href={f.url} download={f.name} className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 12 }}>
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

      {viewingFile && <FileViewer file={viewingFile} onClose={() => setViewingFile(null)} />}
    </>
  );
}

// ─── Scoped markdown prose styles ─────────────────────────────────────────
const NOTES_MARKDOWN_CSS = `
  .notes-markdown {
    font-family: var(--font-body);
    font-size: 15px;
    line-height: 1.9;
    color: var(--ink);
  }

  .notes-markdown > :first-child { margin-top: 0; }
  .notes-markdown > :last-child  { margin-bottom: 0; }

  /* Headings — match .notes-content from Student.css */
  .notes-markdown h1,
  .notes-markdown h2,
  .notes-markdown h3 {
    font-family: var(--font-display);
    color: var(--ink);
    margin: 28px 0 10px;
    line-height: 1.25;
  }
  .notes-markdown h1 { font-size: 22px; }
  .notes-markdown h2 {
    font-size: 18px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--border);
  }
  .notes-markdown h3 { font-size: 15px; }
  .notes-markdown h4 {
    font-family: var(--font-display);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 20px 0 6px;
  }

  /* Body */
  .notes-markdown p { margin-bottom: 14px; }
  .notes-markdown strong { font-weight: 600; }
  .notes-markdown em    { font-style: italic; }
  .notes-markdown a {
    color: var(--rust);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .notes-markdown a:hover { opacity: 0.75; }

  /* Lists — match .notes-content */
  .notes-markdown ul,
  .notes-markdown ol {
    padding-left: 24px;
    margin-bottom: 14px;
  }
  .notes-markdown li { margin-bottom: 4px; }

  /* Blockquote */
  .notes-markdown blockquote {
    margin: 14px 0;
    padding: 10px 16px;
    border-left: 3px solid var(--rust);
    background: rgba(184,76,43,0.04);
    border-radius: 0 4px 4px 0;
    color: var(--muted);
    font-style: italic;
  }
  .notes-markdown blockquote p { margin: 0; }

  /* HR */
  .notes-markdown hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 20px 0;
  }

  /* Code */
  .notes-markdown code {
    font-family: Consolas, 'Courier New', monospace;
    font-size: 12px;
    background: rgba(17,16,9,0.06);
    padding: 1px 5px;
    border-radius: 4px;
  }
  .notes-markdown pre {
    margin: 14px 0;
    padding: 14px 16px;
    overflow-x: auto;
    background: var(--ink);
    color: var(--parchment);
    border-radius: 6px;
  }
  .notes-markdown pre code {
    background: transparent;
    padding: 0;
    color: inherit;
    font-size: 12px;
  }

  /* Table */
  .notes-markdown table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 14px;
    display: block;
    overflow-x: auto;
  }
  .notes-markdown th,
  .notes-markdown td {
    border: 1px solid var(--border);
    padding: 8px 12px;
    text-align: left;
    vertical-align: top;
  }
  .notes-markdown th {
    background: var(--cream);
    font-family: var(--font-display);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .notes-markdown tr:hover td { background: var(--cream); }

  .notes-markdown img {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
  }
`;