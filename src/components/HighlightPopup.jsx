import { useEffect, useRef, useState } from 'react';
import './HighlightPopup.css';

export default function HighlightPopup({ term, position, loading, contextInfo, onLookup, onSave, onClose, isSaved }) {
  const popupRef = useRef(null);
  const [adjustedPos, setAdjustedPos] = useState(position);

  // Adjust position so popup stays within viewport
  useEffect(() => {
    if (!popupRef.current) return;
    const rect = popupRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MARGIN = 8;
    const POPUP_W = 300;

    let { top, left } = position;

    if (left + POPUP_W + MARGIN > vw) left = vw - POPUP_W - MARGIN;
    if (left < MARGIN) left = MARGIN;

    if (top + rect.height + MARGIN > vh) {
      top = position.selectionTop - rect.height - MARGIN;
    }

    setAdjustedPos({ top, left });
  }, [position, contextInfo, loading]);

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const hasContext = !!contextInfo;

  return (
    <div
      ref={popupRef}
      className="highlight-popup"
      style={{ top: adjustedPos.top, left: adjustedPos.left }}
    >
      <div className="highlight-popup-term">
        <span className="highlight-popup-term-icon">✦</span>
        <span className="highlight-popup-term-text">{term}</span>
        <button className="highlight-popup-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {loading ? (
        <div className="highlight-popup-body">
          <div className="highlight-popup-loading">
            <span className="highlight-popup-spinner" />
            <span>Looking this up…</span>
          </div>
        </div>
      ) : hasContext ? (
        <>
          <div className="highlight-popup-body">
            <p className="highlight-popup-context">{contextInfo}</p>
          </div>
          <div className="highlight-popup-footer">
            <button
              className={`highlight-popup-save${isSaved ? ' highlight-popup-save--saved' : ''}`}
              onClick={onSave}
              disabled={isSaved}
            >
              {isSaved ? '✓ Saved to Glossary' : '+ Save to Glossary'}
            </button>
          </div>
        </>
      ) : (
        <div className="highlight-popup-footer">
          <button className="highlight-popup-lookup" onClick={onLookup}>
            Look up &ldquo;{term.length > 24 ? term.slice(0, 24) + '…' : term}&rdquo;
          </button>
        </div>
      )}
    </div>
  );
}
