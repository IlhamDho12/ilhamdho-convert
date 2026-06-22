import React from 'react';

export default function Loader({ message = "Sedang memproses..." }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      gap: '20px',
      width: '100%',
      animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{
        position: 'relative',
        width: '64px',
        height: '64px'
      }}>
        {/* Animated Spinners */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          border: '4px solid rgba(139, 92, 246, 0.1)',
          borderTop: '4px solid var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{
          position: 'absolute',
          width: '80%',
          height: '80%',
          top: '10%',
          left: '10%',
          border: '4px solid rgba(236, 72, 153, 0.1)',
          borderTop: '4px solid var(--secondary)',
          borderRadius: '50%',
          animation: 'spin 0.75s linear infinite reverse'
        }} />
      </div>
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: '1rem',
        fontWeight: 500,
        textAlign: 'center'
      }}>{message}</p>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
