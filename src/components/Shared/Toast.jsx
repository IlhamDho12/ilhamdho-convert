import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ type = 'info', message, onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} style={{ color: 'var(--accent-emerald)' }} />;
      case 'error':
        return <AlertCircle size={20} style={{ color: 'var(--accent-rose)' }} />;
      case 'info':
      default:
        return <Info size={20} style={{ color: 'var(--primary)' }} />;
    }
  };

  return (
    <div className={`toast toast-${type} animate-scale-in`}>
      {getIcon()}
      <span style={{ fontSize: '0.9rem', fontWeight: 500, flexGrow: 1 }}>{message}</span>
      <button 
        onClick={onClose} 
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2px',
          borderRadius: '4px',
          transition: 'color 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
        onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
      >
        <X size={16} />
      </button>
    </div>
  );
}
