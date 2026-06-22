import React, { useEffect } from 'react';

export default function Comments({ pageId, pageTitle }) {
  useEffect(() => {
    // If window.CUSDIS exists, reinitialize the widget
    if (window.CUSDIS) {
      window.CUSDIS.initial();
      return;
    }

    // Load Cusdis script dynamically
    const script = document.createElement('script');
    script.src = 'https://cusdis.com/js/cusdis.es.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script if component unmounts (optional, but keep it for cleanliness)
      const existingScript = document.querySelector(`script[src="https://cusdis.com/js/cusdis.es.js"]`);
      if (existingScript && !window.CUSDIS) {
        document.body.removeChild(existingScript);
      }
    };
  }, [pageId]);

  return (
    <div className="glass" style={{ 
      marginTop: '48px', 
      padding: '32px', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '16px',
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-color)',
      animation: 'fadeIn 0.5s ease'
    }}>
      <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>
        Diskusi & Komentar
      </h3>
      
      {/* Cusdis Thread Container */}
      <div 
        id="cusdis_thread"
        data-host="https://cusdis.com"
        // Replace this ID with your actual App ID in Cusdis
        data-app-id="cce58b60-b771-4960-ae6e-232f0dbddb04"
        data-page-id={pageId}
        data-page-url={window.location.href}
        data-page-title={pageTitle}
        style={{ 
          width: '100%', 
          minHeight: '220px',
          colorScheme: 'dark' // Tells Cusdis iframe to use dark styling if supported
        }}
      />
      
      {/* Dark theme stylesheet overlay for Cusdis iframe integration */}
      <style>{`
        #cusdis_thread iframe {
          color-scheme: dark !important;
          filter: invert(0.9) hue-rotate(180deg); /* Simple elegant trick to force dark mode on Cusdis iframe */
          background: transparent !important;
        }
      `}</style>
    </div>
  );
}
