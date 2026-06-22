import React, { useRef, useState } from 'react';
import { Upload, FileText } from 'lucide-react';

export default function FileDropzone({ 
  onFilesSelected, 
  accept = '*/*', 
  multiple = false, 
  title = "Pilih atau Seret File Ke Sini",
  subtitle = "Mendukung berbagai macam file"
}) {
  const [isActive, setIsActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsActive(true);
  };

  const handleDragLeave = () => {
    setIsActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onFilesSelected(multiple ? files : [files[0]]);
    }
  };

  const handleSelectClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFilesSelected(multiple ? files : [files[0]]);
      e.target.value = '';
    }
  };

  return (
    <div 
      className={`dropzone ${isActive ? 'active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleSelectClick}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        accept={accept}
        multiple={multiple}
        style={{ display: 'none' }}
      />
      <div className="flex flex-col items-center gap-3">
        <div style={{
          background: 'rgba(139, 92, 246, 0.1)',
          padding: '16px',
          borderRadius: '50%',
          color: '#8b5cf6',
          marginBottom: '8px',
          display: 'inline-flex'
        }}>
          <Upload size={32} />
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{title}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{subtitle}</p>
      </div>
    </div>
  );
}
