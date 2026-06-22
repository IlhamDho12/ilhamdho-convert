import React, { useState } from 'react';
import { ArrowLeft, FileDown, FileText } from 'lucide-react';
import FileDropzone from './Shared/FileDropzone';
import Loader from './Shared/Loader';
import mammoth from 'mammoth';
import confetti from 'canvas-confetti';

export default function WordToPdf({ onBack, addToast }) {
  const [wordFile, setWordFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');

  const handleWordSelected = async (files) => {
    const file = files[0];
    setWordFile(file);
    setIsProcessing(true);
    setHtmlContent('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setHtmlContent(result.value);
      
      if (result.messages && result.messages.length > 0) {
        console.log('Mammoth messages:', result.messages);
      }
      addToast('success', 'Word file berhasil dibaca!');
    } catch (error) {
      console.error(error);
      addToast('error', 'Gagal memproses file Word. Pastikan formatnya .docx');
      setWordFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintToPdf = () => {
    if (!htmlContent) return;

    try {
      // Create a print window
      const printWindow = window.open('', '_blank');
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${wordFile.name.replace(/\.[^/.]+$/, "")}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
              
              body {
                font-family: 'Inter', sans-serif;
                color: #1f2937;
                line-height: 1.6;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
                background: white;
              }
              
              h1, h2, h3, h4, h5, h6 {
                color: #111827;
                margin-top: 1.5em;
                margin-bottom: 0.5em;
                font-weight: 700;
              }
              
              p {
                margin-bottom: 1em;
                text-align: justify;
              }
              
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              
              table, th, td {
                border: 1px solid #e5e7eb;
              }
              
              th, td {
                padding: 10px;
                text-align: left;
              }
              
              th {
                background-color: #f3f4f6;
                font-weight: 600;
              }
              
              img {
                max-width: 100%;
                height: auto;
                display: block;
                margin: 20px auto;
                border-radius: 4px;
              }
              
              ul, ol {
                margin-bottom: 1em;
                padding-left: 20px;
              }
              
              li {
                margin-bottom: 0.25em;
              }
              
              @media print {
                body {
                  padding: 0;
                  font-size: 12pt;
                }
                
                @page {
                  margin: 2cm;
                }
              }
            </style>
          </head>
          <body>
            ${htmlContent}
            <script>
              window.onload = function() {
                // Focus and print
                window.focus();
                window.print();
                // Close window after printing starts
                setTimeout(function() {
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      addToast('success', 'Membuka dialog cetak browser (Simpan sebagai PDF).');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error(err);
      addToast('error', 'Gagal memanggil dialog cetak.');
    }
  };

  return (
    <div className="tool-container">
      <div className="back-btn" onClick={onBack}>
        <ArrowLeft size={20} /> Kembali ke Beranda
      </div>

      <div className="glass" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Word ke PDF</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Ubah dokumen Microsoft Word (.docx) menjadi file PDF menggunakan mesin render asli browser Anda.
        </p>

        {!wordFile && !isProcessing ? (
          <FileDropzone 
            onFilesSelected={handleWordSelected} 
            accept=".docx" 
            multiple={false}
            title="Pilih atau Seret File Word (.docx) Ke Sini"
            subtitle="Mendukung file Microsoft Word modern"
          />
        ) : isProcessing ? (
          <Loader message="Sedang mengonversi dan memformat isi dokumen..." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '16px'
            }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{wordFile.name}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {(wordFile.size / 1024).toFixed(1)} KB • Siap dikonversi
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setWordFile(null);
                    setHtmlContent('');
                  }}
                >
                  Ganti File
                </button>
                <button className="btn btn-primary" onClick={handlePrintToPdf}>
                  <FileDown size={18} /> Simpan sebagai PDF
                </button>
              </div>
            </div>

            {/* Document Preview Box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Pratinjau Dokumen:
              </label>
              
              <div 
                className="glass" 
                style={{
                  background: 'white',
                  color: '#1f2937',
                  padding: '40px',
                  borderRadius: '12px',
                  maxHeight: '50vh',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <div 
                  className="word-html-preview" 
                  dangerouslySetInnerHTML={{ __html: htmlContent }} 
                  style={{
                    lineHeight: '1.6',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Styled class inside container */}
      <style>{`
        .word-html-preview h1, .word-html-preview h2, .word-html-preview h3 {
          color: #111827;
          margin-top: 1.25em;
          margin-bottom: 0.5em;
          font-weight: 700;
        }
        .word-html-preview p {
          margin-bottom: 1em;
          color: #374151;
        }
        .word-html-preview table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }
        .word-html-preview table, .word-html-preview th, .word-html-preview td {
          border: 1px solid #e5e7eb;
        }
        .word-html-preview th, .word-html-preview td {
          padding: 8px 12px;
        }
        .word-html-preview th {
          background-color: #f3f4f6;
        }
        .word-html-preview img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 16px auto;
        }
        .word-html-preview ul, .word-html-preview ol {
          margin-bottom: 1em;
          padding-left: 20px;
        }
      `}</style>
    </div>
  );
}
