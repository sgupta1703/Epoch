import { useEffect, useRef } from 'react';
import './Modal.css';

/**
 * General-purpose modal dialog.
 *
 * Props:
 *   isOpen    – boolean
 *   onClose   – () => void
 *   title     – string
 *   size      – 'sm' | 'md' | 'lg'  (default 'md')
 *   children  – modal body content
 *   footer    – optional JSX for a sticky footer (e.g. action buttons)
 */
export default function Modal({ isOpen, onClose, title, size = 'md', children, footer }) {
  const overlayRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className={`modal modal--${size}`} role="dialog" aria-modal="true">

        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}

      </div>
    </div>
  );
}

/**
 * Convenience sub-component for consistent modal action buttons.
 *
 * Props:
 *   onCancel   – () => void
 *   onConfirm  – () => void
 *   confirmLabel  – string (default 'Confirm')
 *   cancelLabel   – string (default 'Cancel')
 *   danger     – boolean — makes confirm button red
 *   loading    – boolean — disables both buttons, shows spinner text
 */
export function ModalActions({
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
}) {
  return (
    <div className="modal-actions">
      <button
        className="modal-btn modal-btn--ghost"
        onClick={onCancel}
        disabled={loading}
      >
        {cancelLabel}
      </button>
      <button
        className={`modal-btn ${danger ? 'modal-btn--danger' : 'modal-btn--primary'}`}
        onClick={onConfirm}
        disabled={loading}
      >
        {loading ? 'Working…' : confirmLabel}
      </button>
    </div>
  );
}