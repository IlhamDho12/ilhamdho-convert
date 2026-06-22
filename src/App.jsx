import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import JpgToPdf from './components/JpgToPdf';
import PdfToJpg from './components/PdfToJpg';
import MergePdf from './components/MergePdf';
import SplitPdf from './components/SplitPdf';
import CompressPdf from './components/CompressPdf';
import SignPdf from './components/SignPdf';
import EditPdf from './components/EditPdf';
import WordToPdf from './components/WordToPdf';
import PdfToWord from './components/PdfToWord';
import Toast from './components/Shared/Toast';
import { ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTool, setActiveTool] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Sync state with browser back button / history gestures
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.tool) {
        setActiveTool(event.state.tool);
      } else {
        setActiveTool(null);
      }
    };
    
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setActiveTool(hash);
      window.history.replaceState({ tool: hash }, '', `#${hash}`);
    } else {
      window.history.replaceState({ tool: null }, '', ' ');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const selectTool = (toolId) => {
    setActiveTool(toolId);
    if (toolId) {
      window.history.pushState({ tool: toolId }, '', `#${toolId}`);
    } else {
      window.history.pushState({ tool: null }, '', ' ');
    }
  };

  const addToast = (type, message) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const renderActiveTool = () => {
    switch (activeTool) {
      case 'jpg2pdf':
        return <JpgToPdf onBack={() => selectTool(null)} addToast={addToast} />;
      case 'pdf2jpg':
        return <PdfToJpg onBack={() => selectTool(null)} addToast={addToast} />;
      case 'merge':
        return <MergePdf onBack={() => selectTool(null)} addToast={addToast} />;
      case 'split':
        return <SplitPdf onBack={() => selectTool(null)} addToast={addToast} />;
      case 'compress':
        return <CompressPdf onBack={() => selectTool(null)} addToast={addToast} />;
      case 'sign':
        return <SignPdf onBack={() => selectTool(null)} addToast={addToast} />;
      case 'edit':
        return <EditPdf onBack={() => selectTool(null)} addToast={addToast} />;
      case 'word2pdf':
        return <WordToPdf onBack={() => selectTool(null)} addToast={addToast} />;
      case 'pdf2word':
        return <PdfToWord onBack={() => selectTool(null)} addToast={addToast} />;
      default:
        return <Dashboard onSelectTool={selectTool} />;
    }
  };

  return (
    <div className="app-container">
      {/* Top Header Bar */}
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => selectTool(null)}>
          <span style={{
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            color: 'white',
            fontWeight: 800,
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '1rem',
            boxShadow: '0 4px 10px rgba(139,92,246,0.3)'
          }}>IC</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            ilhamdho <span className="text-gradient">convert</span>
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--accent-emerald)',
          background: 'rgba(16, 185, 129, 0.06)',
          border: '1px solid rgba(16, 185, 129, 0.15)',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '0.8rem',
          fontWeight: 600
        }}>
          <ShieldCheck size={16} /> 100% Pemrosesan Lokal (Aman)
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {renderActiveTool()}
      </main>

      {/* Modern Premium Footer */}
      <footer style={{
        marginTop: '64px',
        paddingTop: '24px',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.82rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <p>© 2026 ilhamdho convert • Dibuat dengan performa tinggi & keamanan maksimal.</p>
        <p style={{ fontSize: '0.78rem' }}>Semua dokumen diproses langsung di memori browser Anda. File tidak akan pernah dikirim ke server mana pun.</p>
      </footer>

      {/* Toast Notifications Portal */}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast 
            key={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
}
