import React, { useState } from 'react';
import { ArrowLeft, Trash2, Layers, Plus, FileDown } from 'lucide-react';
import FileDropzone from './Shared/FileDropzone';
import Loader from './Shared/Loader';
import { PDFDocument } from 'pdf-lib';
import confetti from 'canvas-confetti';

export default function MergePdf({ onBack, addToast }) {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesSelected = (newFiles) => {
    const updatedFiles = newFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
    }));
    setPdfFiles(prev => [...prev, ...updatedFiles]);
    addToast('success', `${newFiles.length} file PDF ditambahkan.`);
  };

  const removeFile = (id) => {
    setPdfFiles(prev => prev.filter(f => f.id !== id));
  };

  const moveFile = (index, direction) => {
    const updatedFiles = [...pdfFiles];
    const targetIndex = index + direction;
    if (targetIndex >= 0 && targetIndex < updatedFiles.length) {
      const temp = updatedFiles[index];
      updatedFiles[index] = updatedFiles[targetIndex];
      updatedFiles[targetIndex] = temp;
      setPdfFiles(updatedFiles);
    }
  };

  const mergePdfs = async () => {
    if (pdfFiles.length < 2) {
      addToast('error', 'Silakan tambahkan minimal 2 file PDF untuk digabungkan.');
      return;
    }
    
    setIsProcessing(true);
    addToast('info', 'Sedang menggabungkan PDF...');

    try {
      const mergedPdf = await PDFDocument.create();

      for (const fileObj of pdfFiles) {
        const fileBytes = await fileObj.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(fileBytes);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `ilhamdho-merged-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast('success', 'PDF berhasil digabungkan!');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error(error);
      addToast('error', 'Gagal menggabungkan PDF. Pastikan file PDF tidak terenkripsi.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="tool-container">
      <div className="back-btn" onClick={onBack}>
        <ArrowLeft size={20} /> Kembali ke Beranda
      </div>

      <div className="glass" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Gabungkan PDF</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Gabungkan dua atau lebih dokumen PDF menjadi satu file secara cepat dan berurutan.
        </p>

        {pdfFiles.length === 0 ? (
          <FileDropzone 
            onFilesSelected={handleFilesSelected} 
            accept="application/pdf" 
            multiple={true}
            title="Pilih atau Seret Beberapa File PDF Ke Sini"
            subtitle="Mendukung unggahan sekaligus"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
             <div className="tool-action-header">
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Daftar Dokumen ({pdfFiles.length} file)</h4>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => document.getElementById('add-more-pdf-input').click()}
                  style={{ padding: '8px 16px' }}
                >
                  <Plus size={16} /> Tambah PDF
                </button>
                <input 
                  type="file" 
                  id="add-more-pdf-input"
                  multiple 
                  accept="application/pdf"
                  onChange={(e) => {
                    if (e.target.files.length > 0) {
                      handleFilesSelected(Array.from(e.target.files));
                    }
                  }}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {isProcessing ? (
              <Loader message="Sedang menggabungkan dokumen PDF..." />
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pdfFiles.map((fileObj, idx) => (
                    <div key={fileObj.id} className="glass file-list-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{
                          background: 'rgba(139, 92, 246, 0.1)',
                          color: 'var(--primary)',
                          fontWeight: 700,
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem'
                        }}>
                          {idx + 1}
                        </span>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.95rem', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {fileObj.name}
                          </p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fileObj.size}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button 
                            disabled={idx === 0}
                            onClick={() => moveFile(idx, -1)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            &uarr;
                          </button>
                          <button 
                            disabled={idx === pdfFiles.length - 1}
                            onClick={() => moveFile(idx, 1)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            &darr;
                          </button>
                        </div>

                        <button 
                          onClick={() => removeFile(fileObj.id)}
                          style={{
                            background: 'rgba(244, 63, 94, 0.1)',
                            border: 'none',
                            color: 'var(--accent-rose)',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(244, 63, 94, 0.2)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(244, 63, 94, 0.1)'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  className="btn btn-primary" 
                  disabled={pdfFiles.length < 2}
                  onClick={mergePdfs}
                  style={{ alignSelf: 'flex-end', marginTop: '16px' }}
                >
                  <Layers size={18} /> Gabungkan Semua PDF
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
