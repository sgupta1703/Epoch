import { useState, useEffect, useRef, useCallback } from 'react';
import { NotebookPen } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getGlossaryTerms, saveGlossaryTerm, updateGlossaryTerm, deleteGlossaryTerm, lookupTerm } from '../../api/glossary';
import './GlossaryPanel.css';

function TermCard({ term, onUpdate, onDelete, onGoToChat }) {
  const [editingTerm, setEditingTerm] = useState(false);
  const [termText, setTermText] = useState(term.term);
  const [notes, setNotes] = useState(term.user_notes || '');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const termInputRef = useRef(null);

  useEffect(() => {
    if (editingTerm) termInputRef.current?.focus();
  }, [editingTerm]);

  async function saveTerm() {
    const trimmed = termText.trim();
    if (!trimmed || trimmed === term.term) {
      setEditingTerm(false);
      return;
    }
    setSaving(true);
    try {
      const { term: updated } = await updateGlossaryTerm(term.id, { term: trimmed });
      onUpdate(updated);
    } finally {
      setSaving(false);
      setEditingTerm(false);
    }
  }

  async function saveNotes() {
    if (notes === (term.user_notes || '')) return;
    setSaving(true);
    try {
      const { term: updated } = await updateGlossaryTerm(term.id, { user_notes: notes });
      onUpdate(updated);
    } finally {
      setSaving(false);
    }
  }

  const personaName = term.personas?.name || null;
  const personaEmoji = term.personas?.emoji || null;
  const hasSource = term.persona_id && personaName;
  const hasMessageLink = hasSource && term.message_index != null;

  return (
    <div className={`gp-card${expanded ? ' gp-card--expanded' : ''}`}>
      {/* Term row */}
      <div className="gp-card-top">
        {editingTerm ? (
          <input
            ref={termInputRef}
            className="gp-term-input"
            value={termText}
            onChange={e => setTermText(e.target.value)}
            onBlur={saveTerm}
            onKeyDown={e => {
              if (e.key === 'Enter') saveTerm();
              if (e.key === 'Escape') {
                setTermText(term.term);
                setEditingTerm(false);
              }
            }}
            disabled={saving}
          />
        ) : (
          <button className="gp-term-name" onClick={() => setExpanded(open => !open)}>
            {termText}
          </button>
        )}

        <div className="gp-card-actions">
          <button
            className="gp-icon-btn"
            title="Edit term"
            onClick={() => setEditingTerm(true)}
          >
            {'\u270E'}
          </button>
          <button
            className="gp-icon-btn gp-icon-btn--danger"
            title="Delete"
            onClick={() => onDelete(term.id)}
          >
            {'\u2715'}
          </button>
        </div>
      </div>

      {/* Source badge */}
      {hasSource && (
        <div className="gp-card-source">
          <span className="gp-source-badge">
            {personaEmoji && <span>{personaEmoji}</span>}
            {personaName}
          </span>
          {hasMessageLink && (
            <button className="gp-goto-btn" onClick={() => onGoToChat(term)}>
              Go to chat {'\u2192'}
            </button>
          )}
        </div>
      )}

      {/* Expanded body */}
      {expanded && (
        <div className="gp-card-body">
          {term.context_info && (
            <div className="gp-context-info">
              <p className="gp-section-label">Context</p>
              <p className="gp-context-text">{term.context_info}</p>
            </div>
          )}

          {term.message_snippet && (
            <div className="gp-snippet">
              <p className="gp-section-label">From conversation</p>
              <blockquote className="gp-snippet-text">"{term.message_snippet}"</blockquote>
            </div>
          )}

          <div className="gp-notes">
            <p className="gp-section-label">My notes</p>
            <textarea
              className="gp-notes-input"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Add your own notes here..."
              disabled={saving}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AddTermForm({ unitId, unit, onSave, onCancel }) {
  const [termText, setTermText] = useState('');
  const [contextInfo, setContextInfo] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleLookup() {
    if (!termText.trim()) return;
    setLookingUp(true);
    try {
      const { context_info } = await lookupTerm({
        term: termText.trim(),
        unit_title: unit?.title,
        unit_context: unit?.context,
      });
      setContextInfo(context_info);
    } catch {
      setContextInfo('');
    } finally {
      setLookingUp(false);
    }
  }

  async function handleSave() {
    if (!termText.trim()) return;
    setSaving(true);
    try {
      const { term: saved } = await saveGlossaryTerm(unitId, {
        term: termText.trim(),
        context_info: contextInfo,
        user_notes: '',
      });
      onSave(saved);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="gp-add-form">
      <p className="gp-section-label" style={{ marginBottom: 6 }}>New term</p>
      <div className="gp-add-row">
        <input
          className="gp-add-input"
          value={termText}
          onChange={e => setTermText(e.target.value)}
          placeholder="Enter a term or name..."
          onKeyDown={e => {
            if (e.key === 'Enter' && !contextInfo) handleLookup();
          }}
          autoFocus
        />
        <button
          className="gp-add-lookup-btn"
          onClick={handleLookup}
          disabled={!termText.trim() || lookingUp}
        >
          {lookingUp ? '...' : 'Look up'}
        </button>
      </div>

      {contextInfo && (
        <textarea
          className="gp-notes-input"
          rows={3}
          value={contextInfo}
          onChange={e => setContextInfo(e.target.value)}
          style={{ marginTop: 8 }}
        />
      )}

      <div className="gp-add-footer">
        <button className="gp-cancel-btn" onClick={onCancel}>Cancel</button>
        <button
          className="gp-save-btn"
          onClick={handleSave}
          disabled={!termText.trim() || saving}
        >
          {saving ? 'Saving...' : 'Save term'}
        </button>
      </div>
    </div>
  );
}

export default function GlossaryPanel({ isOpen, onClose, unit }) {
  const { classroomId, unitId } = useParams();
  const navigate = useNavigate();

  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchTerms = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    try {
      const { terms: loaded } = await getGlossaryTerms(unitId);
      setTerms(loaded);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    if (isOpen) fetchTerms();
  }, [isOpen, fetchTerms]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  function handleUpdate(updated) {
    setTerms(currentTerms => currentTerms.map(term => (
      term.id === updated.id ? { ...term, ...updated } : term
    )));
  }

  async function handleDelete(termId) {
    await deleteGlossaryTerm(termId);
    setTerms(currentTerms => currentTerms.filter(term => term.id !== termId));
  }

  function handleGoToChat(term) {
    onClose();
    navigate(
      `/student/classroom/${classroomId}/unit/${unitId}/personas`,
      { state: { scrollToPersonaId: term.persona_id, scrollToMessageIndex: term.message_index, scrollToTerm: term.term } }
    );
  }

  function handleTermSaved(saved) {
    setTerms(currentTerms => [saved, ...currentTerms]);
    setShowAddForm(false);
  }

  return (
    <>
      <div
        className={`gp-backdrop${isOpen ? ' gp-backdrop--visible' : ''}`}
        onClick={onClose}
      />

      <div className={`gp-panel${isOpen ? ' gp-panel--open' : ''}`}>
        <div className="gp-header">
          <div className="gp-header-left">
            <div>
              <div className="gp-header-title">Glossary</div>
              {terms.length > 0 && (
                <div className="gp-header-count">{terms.length} term{terms.length !== 1 ? 's' : ''}</div>
              )}
            </div>
          </div>
          <div className="gp-header-right">
            <button
              className="gp-add-term-btn"
              onClick={() => setShowAddForm(open => !open)}
            >
              {showAddForm ? 'Cancel' : '+ Add term'}
            </button>
            <button className="gp-close-btn" onClick={onClose} aria-label="Close glossary">
              {'\u2715'}
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="gp-add-form-wrap">
            <AddTermForm
              unitId={unitId}
              unit={unit}
              onSave={handleTermSaved}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        <div className="gp-body">
          {loading ? (
            <div className="gp-loading">
              <span className="gp-spinner" />
              <span>Loading...</span>
            </div>
          ) : terms.length === 0 ? (
            <div className="gp-empty">
              <div className="gp-empty-icon">
                <NotebookPen size={40} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <p className="gp-empty-title">No terms saved yet</p>
              <p className="gp-empty-hint">Highlight any word or phrase in a persona chat and save it here.</p>
            </div>
          ) : (
            <div className="gp-list">
              {terms.map(term => (
                <TermCard
                  key={term.id}
                  term={term}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onGoToChat={handleGoToChat}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
