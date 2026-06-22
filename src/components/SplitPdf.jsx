import React, { useState } from 'react';
import { ArrowLeft, Scissors, Download } from 'lucide-react';
import FileDropzone from './Shared/FileDropzone';
import Loader from './Shared/Loader';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import confetti from 'canvas-confetti';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function SplitPdf({ onBack, addToast }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pages, setPages] = useState([]); // Array of { index: number, previewUrl: string, selected: boolean }
  const [pagesCount, setPagesCount] = useState(0);
  const [splitMode, setSplitMode] = useState('select'); // 'select', 'range'
  const [pageRange, setPageRange] = useState('');

  const handlePdfSelected = async (files) => {
    const file = files[0];
    setPdfFile(file);
    setIsProcessing(true);
    setPages([]);

    try {
      const fileReader = new FileReader();
      fileReader.onload = async function() {
        try {
          const typedarray = new Uint8Array(this.result);
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          setPagesCount(pdf.numPages);
          
          const renderedPages = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.5 }); // smaller scale for thumbnails
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            renderedPages.push({ index: i, previewUrl: dataUrl, selected: false });
          }
          setPages(renderedPages);
          addToast('success', `PDF berhasil dimuat. Total ${pdf.numPages} halaman.`);
        } catch (e) {
          console.error(e);
          addToast('error', 'Gagal memproses file PDF.');
          setPdfFile(null);
        } finally {
          setIsProcessing(false);
        }
      };
      fileReader.readAsArrayBuffer(file);
    } catch (error) {
      console.error(error);
      addToast('error', 'Gagal membaca file PDF.');
      setIsProcessing(false);
    }
  };

  const togglePageSelection = (index) => {
    setPages(prev => prev.map(p => p.index === index ? { ...p, selected: !p.selected } : p));
  };

  const selectAll = () => {
    setPages(prev => prev.map(p => ({ ...p, selected: true })));
  };

  const deselectAll = () => {
    setPages(prev => prev.map(p => ({ ...p, selected: false })));
  };

  // Helper to parse page range (e.g. "1-3, 5")
  const parsePageRange = (rangeStr) => {
    const pagesToExtract = new Set();
    const parts = rangeStr.split(',');
    
    for (let part of parts) {
      part = part.trim();
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (start && end && start <= end) {
          for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= pagesCount) pagesToExtract.add(i);
          }
        }
      } else {
        const pageNum = Number(part);
        if (pageNum && pageNum >= 1 && pageNum <= pagesCount) {
          pagesToExtract.add(pageNum);
        }
      }
    }
    return Array.from(pagesToExtract).sort((a, b) => a - b);
  };

  const handleSplit = async () => {
    let targetPages = [];

    if (splitMode === 'select') {
      targetPages = pages.filter(p => p.selected).map(p => p.index);
    } else {
      targetPages = parsePageRange(pageRange);
    }

    if (targetPages.length === 0) {
      addToast('error', 'Silakan pilih halaman yang ingin dipisahkan.');
      return;
    }

    setIsProcessing(true);
    addToast('info', 'Sedang memproses pemisahan PDF...');

    try {
      const fileBytes = await pdfFile.arrayBuffer();
      const originalDoc = await PDFDocument.load(fileBytes);
      const newDoc = await PDFDocument.create();

      // pdf-lib copyPages is 0-indexed, whereas our indices are 1-indexed
      const zeroIndexedPages = targetPages.map(idx => idx - 1);
      const copiedPages = await newDoc.copyPages(originalDoc, zeroIndexedPages);
      
      copiedPages.forEach(page => newDoc.addPage(page));

      const splitPdfBytes = await newDoc.save();
      const blob = new Blob([splitPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `ilhamdho-split-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast('success', 'Halaman PDF berhasil dipisahkan!');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error(error);
      addToast('error', 'Gagal memisahkan PDF.');
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
        <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Pisahkan PDF</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Ekstrak halaman tertentu dari file PDF Anda secara visual atau dengan menentukan rentang halaman.
        </p>

        {!pdfFile && !isProcessing ? (
          <FileDropzone 
            onFilesSelected={handlePdfSelected} 
            accept="application/pdf" 
            multiple={false}
            title="Pilih atau Seret File PDF Ke Sini"
            subtitle="Mendukung semua jenis PDF"
          />
        ) : isProcessing ? (
          <Loader message={pdfFile ? "Sedang merender halaman PDF..." : "Sedang memuat dokumen..."} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '16px',
              gap: '16px'
            }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{pdfFile.name}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {(pdfFile.size / 1024 / 1024).toFixed(2)} MB • {pagesCount} Halaman
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  display: 'flex',
                  padding: '4px'
                }}>
                  <button 
                    onClick={() => setSplitMode('select')}
                    style={{
                      background: splitMode === 'select' ? 'var(--primary)' : 'none',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      transition: 'background 0.2s'
                    }}
                  >
                    Pilih Visual
                  </button>
                  <button 
                    onClick={() => setSplitMode('range')}
                    style={{
                      background: splitMode === 'range' ? 'var(--primary)' : 'none',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      transition: 'background 0.2s'
                    }}
                  >
                    Rentang Teks
                  </button>
                </div>

                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setPdfFile(null);
                    setPages([]);
                  }}
                  style={{ padding: '8px 16px' }}
                >
                  Ganti PDF
                </button>
              </div>
            </div>

            {splitMode === 'range' ? (
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                padding: '24px',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <label style={{ fontSize: '0.95rem', fontWeight: 600 }}>Masukkan Rentang Halaman:</label>
                <input 
                  type="text" 
                  placeholder="Contoh: 1-3, 5, 8-10 (Halaman 1, 2, 3, 5, 8, 9, 10)"
                  value={pageRange}
                  onChange={(e) => setPageRange(e.target.value)}
                  style={{
                    background: '#14141a',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: 'white',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Gunakan tanda hubung (-) untuk rentang, dan koma (,) untuk memisahkan halaman atau rentang berbeda. Batas halaman maksimum adalah {pagesCount}.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={selectAll} 
                    className="btn btn-secondary" 
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    Pilih Semua
                  </button>
                  <button 
                    onClick={deselectAll} 
                    className="btn btn-secondary" 
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    Batal Semua
                  </button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '20px',
                  maxHeight: '45vh',
                  overflowY: 'auto',
                  padding: '8px'
                }}>
                  {pages.map((page) => (
                    <div 
                      key={page.index} 
                      onClick={() => togglePageSelection(page.index)}
                      style={{
                        position: 'relative',
                        border: page.selected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        aspectRatio: '3/4',
                        background: 'rgba(0,0,0,0.2)',
                        boxShadow: page.selected ? '0 0 12px rgba(139, 92, 246, 0.4)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <img 
                        src={page.previewUrl} 
                        alt={`Hal. ${page.index}`} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        background: page.selected ? 'var(--primary)' : 'rgba(0,0,0,0.7)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        Hal. {page.index}
                      </div>

                      {page.selected && (
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          background: 'var(--primary)',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}>
                          ✓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button 
              className="btn btn-primary" 
              onClick={handleSplit}
              style={{ alignSelf: 'flex-end', marginTop: '16px' }}
            >
              <Scissors size={18} /> Pisahkan Halaman Terpilih
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
