import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
  // Close on Escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Lock background scroll
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass-card modal-content" 
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        style={{ position: 'relative', border: '1px solid rgba(255, 255, 255, 0.15)' }}
      >
        <div className="flex justify-between align-center" style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600' }}>{title}</h2>
          <button 
            onClick={onClose} 
            className="glass-btn icon-only"
            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', background: 'rgba(255, 255, 255, 0.05)', border: 'none' }}
          >
            <X size={18} />
          </button>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}
