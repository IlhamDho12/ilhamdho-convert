import React, { useState } from 'react';
import { ArrowLeft, FileDown, FileSpreadsheet } from 'lucide-react';
import FileDropzone from './Shared/FileDropzone';
import Loader from './Shared/Loader';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import confetti from 'canvas-confetti';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function PdfToWord({ onBack, addToast }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pagesCount, setPagesCount] = useState(0);
  const [extractedPages, setExtractedPages] = useState([]); // Array of { width, height, items: [{ text, x, y, fontSize }] }

  const handlePdfSelected = async (files) => {
    const file = files[0];
    setPdfFile(file);
    setIsProcessing(true);
    setExtractedPages([]);

    try {
      const fileBytes = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(fileBytes) }).promise;
      setPagesCount(pdf.numPages);
      
      const pagesData = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 }); // Use base PDF points scale
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;
        
        const textContent = await page.getTextContent();
        const pageItems = textContent.items.map(item => {
          const tx = item.transform[4];
          const ty = item.transform[5];
          const fontSize = item.transform[3]; // Vertical scale = font size
          
          return {
            text: item.str,
            x: tx,
            y: pageHeight - ty - fontSize, // Map bottom-left to top-left
            fontSize: fontSize
          };
        });

        pagesData.push({
          width: pageWidth,
          height: pageHeight,
          items: pageItems
        });
      }
      
      setExtractedPages(pagesData);
      addToast('success', `Berhasil mengekstrak tata letak dari ${pdf.numPages} halaman!`);
    } catch (error) {
      console.error(error);
      addToast('error', 'Gagal memproses file PDF.');
      setPdfFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadWord = () => {
    if (extractedPages.length === 0) return;

    try {
      // Create HTML layout compatible with MS Word using absolute positioning
      const htmlHeader = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word' 
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <title>${pdfFile.name.replace(/\.[^/.]+$/, "")}</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>90</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            body {
              margin: 0;
              padding: 0;
              background: white;
            }
            .page {
              position: relative;
              page-break-after: always;
              overflow: hidden;
              background: white;
            }
            .text-item {
              position: absolute;
              white-space: nowrap;
              line-height: 1.0;
              font-family: Arial, sans-serif;
              color: #000000;
            }
          </style>
        </head>
        <body>
      `;

      const htmlContent = extractedPages.map((pageData) => {
        const itemsHtml = pageData.items.map(item => {
          const escapedText = escapeHtml(item.text);
          return `<div class="text-item" style="left:${item.x.toFixed(1)}pt; top:${item.y.toFixed(1)}pt; font-size:${item.fontSize.toFixed(1)}pt;">${escapedText}</div>`;
        }).join('\n');
        
        return `
          <div class="page" style="width:${pageData.width.toFixed(1)}pt; height:${pageData.height.toFixed(1)}pt;">
            ${itemsHtml}
          </div>
        `;
      }).join('\n');

      const htmlFooter = `
        </body>
        </html>
      `;

      const docContent = htmlHeader + htmlContent + htmlFooter;
      // Word document blob
      const blob = new Blob(['\ufeff' + docContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${pdfFile.name.replace(/\.[^/.]+$/, "")}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast('success', 'Dokumen Word (.doc) berhasil diunduh!');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error(err);
      addToast('error', 'Gagal membuat file Word.');
    }
  };

  const escapeHtml = (text) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  return (
    <div className="tool-container">
      <div className="back-btn" onClick={onBack}>
        <ArrowLeft size={20} /> Kembali ke Beranda
      </div>

      <div className="glass" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>PDF ke Word</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Konversi PDF Anda menjadi dokumen Word (.doc) dengan **mempertahankan tata letak asli** posisi teks secara presisi.
        </p>

        {!pdfFile && !isProcessing ? (
          <FileDropzone 
            onFilesSelected={handlePdfSelected} 
            accept="application/pdf" 
            multiple={false}
            title="Pilih atau Seret File PDF Ke Sini"
            subtitle="Mendukung konversi dokumen PDF dengan format terjaga"
          />
        ) : isProcessing ? (
          <Loader message="Sedang mengekstrak tata letak dokumen PDF..." />
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
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{pdfFile.name}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {(pdfFile.size / 1024 / 1024).toFixed(2)} MB • {pagesCount} Halaman
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setPdfFile(null);
                    setExtractedPages([]);
                  }}
                >
                  Ganti PDF
                </button>
                <button className="btn btn-primary" onClick={handleDownloadWord}>
                  <FileDown size={18} /> Unduh File Word (.doc)
                </button>
              </div>
            </div>

            {/* Layout-Preserved Visual Preview Box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Pratinjau Tata Letak Dokumen (Preservasi Layout):
              </label>

              <div style={{
                maxHeight: '55vh',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '24px',
                background: 'rgba(0, 0, 0, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '32px'
              }}>
                {extractedPages.map((pageData, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '100%'
                  }}>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--primary)', 
                      fontWeight: 700, 
                      marginBottom: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Halaman {idx + 1}
                    </div>
                    
                    {/* Render page relative container exactly corresponding to PDF points */}
                    <div className="pdf-page-preview-container" style={{
                      position: 'relative',
                      width: `${pageData.width}pt`,
                      height: `${pageData.height}pt`,
                      background: 'white',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      {pageData.items.map((item, itemIdx) => (
                        <div 
                          key={itemIdx} 
                          className="text-item-preview"
                          style={{
                            position: 'absolute',
                            left: `${item.x}pt`,
                            top: `${item.y}pt`,
                            fontSize: `${item.fontSize}pt`,
                            fontFamily: 'Arial, sans-serif',
                            color: '#111827',
                            whiteSpace: 'nowrap',
                            lineHeight: '1.0'
                          }}
                        >
                          {item.text}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* Responsive scaling for preview document container if viewport is small */
        @media (max-width: 900px) {
          .pdf-page-preview-container {
            transform: scale(0.7);
            transform-origin: top center;
            margin-bottom: -150px; /* offset height shrink */
          }
        }
        @media (max-width: 600px) {
          .pdf-page-preview-container {
            transform: scale(0.5);
            transform-origin: top center;
            margin-bottom: -250px;
          }
        }
      `}</style>
    </div>
  );
}
