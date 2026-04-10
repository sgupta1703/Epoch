import { useEffect, useRef, useState } from 'react';
import './HighlightPopup.css';

export default function HighlightPopup({
  term, position, loading, loadingAction, contextInfo,
  onLookup, onSave, onAddToGlossary, onClose, isSaved, isAdded, addError,
}) {
  const popupRef = useRef(null);
  const [adjustedPos, setAdjustedPos] = useState(position);

  // Recompute position whenever content changes height
  useEffect(() => {
    if (!popupRef.current) return;
    const rect = popupRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MARGIN = 10;
    const POPUP_W = 288;

    let { top, left } = position;

    // Clamp horizontal within viewport
    if (left + POPUP_W + MARGIN > vw) left = vw - POPUP_W - MARGIN;
    if (left < MARGIN) left = MARGIN;

    // Flip above selection if popup clips bottom
    if (top + rect.height + MARGIN > vh) {
      top = position.selectionTop - rect.height - MARGIN;
    }

    setAdjustedPos({ top, left });
  }, [position, contextInfo, loading]);

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const displayTerm = term.length > 40 ? term.slice(0, 40) + '…' : term;
  const hasContext = !!contextInfo;

  return (
    <div
      ref={popupRef}
      className="highlight-popup"
      style={{ top: adjustedPos.top, left: adjustedPos.left }}
    >
      {/* Header */}
      <div className="highlight-popup-header">
        <div>
          <div className="highlight-popup-label">Selection</div>
          <div className="highlight-popup-term-text">{displayTerm}</div>
        </div>
        <button className="highlight-popup-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="highlight-popup-divider" />

      {/* Loading */}
      {loading && (
        <div className="highlight-popup-loading">
          <span className="highlight-popup-spinner" />
          {loadingAction === 'add' ? 'Adding to Glossary…' : 'Looking this up…'}
        </div>
      )}

      {/* Added confirmation */}
      {!loading && isAdded && (
        <div className="highlight-popup-added">
          <span className="highlight-popup-added-check">✓</span>
          Added to Glossary
        </div>
      )}

      {/* Add error */}
      {!loading && addError && (
        <div className="highlight-popup-actions">
          <span className="highlight-popup-error">Could not save — try again.</span>
        </div>
      )}

      {/* Context body (after Look up) */}
      {!loading && !isAdded && !addError && hasContext && (
        <div className="highlight-popup-body">
          <p className="highlight-popup-context">{contextInfo}</p>
        </div>
      )}

      {/* Actions */}
      {!loading && !isAdded && !addError && (
        <div className="highlight-popup-actions">
          {hasContext ? (
            <button
              className={`highlight-popup-btn ${isSaved ? 'highlight-popup-btn--saved' : 'highlight-popup-btn--primary'}`}
              onClick={onSave}
              disabled={isSaved}
            >
              {isSaved ? '✓ Saved to Glossary' : '+ Save to Glossary'}
            </button>
          ) : (
            <>
              <button className="highlight-popup-btn highlight-popup-btn--ghost" onClick={onLookup}>
                Look up
              </button>
              <button className="highlight-popup-btn highlight-popup-btn--primary" onClick={onAddToGlossary}>
                + Add to Glossary
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
