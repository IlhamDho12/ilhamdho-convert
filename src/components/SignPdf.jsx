import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Check, FileDown, Trash2, Edit3, Image as ImageIcon } from 'lucide-react';
import FileDropzone from './Shared/FileDropzone';
import Loader from './Shared/Loader';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import confetti from 'canvas-confetti';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function SignPdf({ onBack, addToast }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfDocInstance, setPdfDocInstance] = useState(null);
  
  // Navigation & Viewer states
  const [currentPage, setCurrentPage] = useState(1);
  const [pagesCount, setPagesCount] = useState(0);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const [pagePreviewUrl, setPagePreviewUrl] = useState('');
  
  // Signature pad states
  const [signatureMode, setSignatureMode] = useState(null); // 'draw', 'upload', or null
  const [signatureImage, setSignatureImage] = useState(null); // Base64 dataURL of signature
  const [placedSignatures, setPlacedSignatures] = useState([]); // List of { id, pageNum, x, y, width, height }
  const [selectedSigId, setSelectedSigId] = useState(null);

  const drawCanvasRef = useRef(null);
  const pdfViewContainerRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Load PDF when selected
  const handlePdfSelected = async (files) => {
    const file = files[0];
    setPdfFile(file);
    setIsProcessing(true);
    setPlacedSignatures([]);
    setCurrentPage(1);

    try {
      const fileBytes = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(fileBytes) }).promise;
      setPagesCount(pdf.numPages);
      setPdfDocInstance(pdf);
      await loadPagePreview(pdf, 1);
    } catch (e) {
      console.error(e);
      addToast('error', 'Gagal memuat dokumen PDF.');
      setPdfFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Render a specific page to viewer
  const loadPagePreview = async (pdfDoc, pageNum) => {
    if (!pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 }); // 1.5x scale for rendering
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      
      setPageDimensions({ width: viewport.width, height: viewport.height });
      setPagePreviewUrl(canvas.toDataURL('image/png'));
    } catch (err) {
      console.error(err);
      addToast('error', `Gagal memuat halaman ${pageNum}.`);
    }
  };

  const changePage = async (direction) => {
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= pagesCount) {
      setIsProcessing(true);
      setCurrentPage(newPage);
      await loadPagePreview(pdfDocInstance, newPage);
      setIsProcessing(false);
    }
  };

  // Drawing signature pad operations
  useEffect(() => {
    if (signatureMode === 'draw' && drawCanvasRef.current) {
      const canvas = drawCanvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [signatureMode]);

  const startDrawing = (e) => {
    if (!drawCanvasRef.current) return;
    isDrawingRef.current = true;
    const canvas = drawCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Get mouse/touch coordinates relative to canvas
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawingRef.current || !drawCanvasRef.current) return;
    e.preventDefault();
    const canvas = drawCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearSignaturePad = () => {
    if (!drawCanvasRef.current) return;
    const canvas = drawCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveDrawnSignature = () => {
    if (!drawCanvasRef.current) return;
    
    // Check if canvas is empty
    const canvas = drawCanvasRef.current;
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      addToast('error', 'Silakan gambar tanda tangan terlebih dahulu.');
      return;
    }

    setSignatureImage(canvas.toDataURL('image/png'));
    setSignatureMode(null);
    addToast('success', 'Tanda tangan disimpan. Klik pada halaman PDF untuk meletakkannya.');
  };

  const handleSignatureUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setSignatureImage(event.target.result);
        setSignatureMode(null);
        addToast('success', 'Tanda tangan diunggah. Klik pada halaman PDF untuk meletakkannya.');
      };
      reader.readAsDataURL(file);
    }
  };

  // Place signature on PDF viewer
  const handlePageClick = (e) => {
    if (!signatureImage || !pdfViewContainerRef.current) return;
    
    // Only allow adding signature if clicking directly on the page image
    if (!e.target.classList.contains('pdf-page-image')) {
      return;
    }
    
    const pageImg = pdfViewContainerRef.current.querySelector('.pdf-page-image');
    if (!pageImg) return;
    
    const rect = pageImg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Boundary check to keep signature inside page
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      const defaultWidth = 120;
      const defaultHeight = 60;
      
      const newSig = {
        id: Math.random().toString(36).substr(2, 9),
        pageNum: currentPage,
        x: x - defaultWidth / 2,
        y: y - defaultHeight / 2,
        width: defaultWidth,
        height: defaultHeight,
      };

      setPlacedSignatures(prev => [...prev, newSig]);
      setSelectedSigId(newSig.id);
      addToast('info', 'Tanda tangan diletakkan. Anda dapat menggeser atau menghapusnya.');
    }
  };

  const removePlacedSignature = (id, e) => {
    e.stopPropagation();
    e.preventDefault();
    setPlacedSignatures(prev => prev.filter(sig => sig.id !== id));
    setSelectedSigId(null);
  };

  // Simple drag signature logic
  const handleSigMouseDown = (id, e) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedSigId(id);
    const startX = e.clientX;
    const startY = e.clientY;
    
    const sigIndex = placedSignatures.findIndex(sig => sig.id === id);
    if (sigIndex === -1) return;
    
    const originalX = placedSignatures[sigIndex].x;
    const originalY = placedSignatures[sigIndex].y;
    
    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      
      setPlacedSignatures(prev => prev.map(sig => {
        if (sig.id === id) {
          return {
            ...sig,
            x: originalX + dx,
            y: originalY + dy
          };
        }
        return sig;
      }));
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const savePdfWithSignatures = async () => {
    if (placedSignatures.length === 0) {
      addToast('error', 'Silakan letakkan tanda tangan pada PDF terlebih dahulu.');
      return;
    }
    
    setIsProcessing(true);
    addToast('info', 'Sedang menanamkan tanda tangan ke PDF...');

    try {
      const fileBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBytes);
      
      // We need signature bytes. Since signatureImage is a Base64 dataURL, extract it
      const response = await fetch(signatureImage);
      const signatureBytes = await response.arrayBuffer();
      
      // Embed the signature PNG
      const embeddedSig = await pdfDoc.embedPng(signatureBytes);

      // Get PDF page instances
      const pages = pdfDoc.getPages();

      // Get rendering scale ratios
      const pageImg = pdfViewContainerRef.current.querySelector('.pdf-page-image');
      const htmlWidth = pageImg.clientWidth;
      const htmlHeight = pageImg.clientHeight;

      for (const sig of placedSignatures) {
        const targetPage = pages[sig.pageNum - 1];
        const pdfWidth = targetPage.getWidth();
        const pdfHeight = targetPage.getHeight();

        // Ratios
        const ratioX = pdfWidth / htmlWidth;
        const ratioY = pdfHeight / htmlHeight;

        // Convert coordinates from HTML top-left to PDF bottom-left
        const x = sig.x * ratioX;
        // sig.y is from top-left, we need y from bottom-left
        const y = (htmlHeight - sig.y - sig.height) * ratioY;
        const width = sig.width * ratioX;
        const height = sig.height * ratioY;

        targetPage.drawImage(embeddedSig, {
          x,
          y,
          width,
          height
        });
      }

      const signedBytes = await pdfDoc.save();
      const blob = new Blob([signedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `ilhamdho-signed-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast('success', 'PDF berhasil ditandatangani!');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error(error);
      addToast('error', 'Gagal menanamkan tanda tangan pada PDF.');
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
        <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Tanda Tangani PDF</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Gambar atau unggah tanda tangan Anda, lalu tempelkan secara tepat di halaman dokumen PDF mana pun.
        </p>

        {!pdfFile && !isProcessing ? (
          <FileDropzone 
            onFilesSelected={handlePdfSelected} 
            accept="application/pdf" 
            multiple={false}
            title="Pilih atau Seret File PDF Ke Sini"
            subtitle="Mendukung semua jenis PDF"
          />
        ) : isProcessing && !pdfDocInstance ? (
          <Loader message="Sedang memuat dokumen PDF..." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px', minHeight: '55vh' }}>
            {/* Viewer Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.02)',
                padding: '12px 20px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{pdfFile.name}</span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => changePage(-1)}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.85rem' }}
                  >
                    Sebelumnya
                  </button>
                  <span style={{ fontSize: '0.85rem' }}>Hal. {currentPage} dari {pagesCount}</span>
                  <button 
                    disabled={currentPage === pagesCount}
                    onClick={() => changePage(1)}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.85rem' }}
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>

              <div 
                ref={pdfViewContainerRef}
                onClick={handlePageClick}
                style={{
                  position: 'relative',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  background: '#141419',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '24px',
                  minHeight: '500px',
                  cursor: signatureImage ? 'crosshair' : 'default'
                }}
              >
                {isProcessing ? (
                  <Loader message="Memuat halaman..." />
                ) : (
                  <div className="canvas-wrapper" style={{ position: 'relative' }}>
                    <img 
                      src={pagePreviewUrl} 
                      alt="PDF Page" 
                      className="pdf-page-image"
                      style={{ 
                        display: 'block', 
                        maxWidth: '100%', 
                        height: 'auto',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.6)'
                      }}
                    />

                    {/* Render placed signatures for this page */}
                    {placedSignatures
                      .filter(sig => sig.pageNum === currentPage)
                      .map((sig) => (
                        <div
                          key={sig.id}
                          onMouseDown={(e) => handleSigMouseDown(sig.id, e)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            left: sig.x,
                            top: sig.y,
                            width: sig.width,
                            height: sig.height,
                            border: selectedSigId === sig.id ? '1px dashed var(--primary)' : '1px transparent solid',
                            background: 'rgba(139, 92, 246, 0.05)',
                            cursor: 'move',
                            userSelect: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box'
                          }}
                        >
                          <img 
                            src={signatureImage} 
                            alt="Signature overlay" 
                            style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
                          />
                          
                          {/* Close button on signature */}
                          {selectedSigId === sig.id && (
                            <button
                              onClick={(e) => removePlacedSignature(sig.id, e)}
                              style={{
                                position: 'absolute',
                                top: '-10px',
                                right: '-10px',
                                background: 'rgba(244, 63, 94, 0.9)',
                                color: 'white',
                                border: 'none',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              ✕
                            </button>
                          )}

                          {/* Resize drag handles (simple width/height adjustments) */}
                          {selectedSigId === sig.id && (
                            <div 
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                const startX = e.clientX;
                                const startWidth = sig.width;
                                const startHeight = sig.height;
                                
                                const handleResizeMove = (moveEvent) => {
                                  const dx = moveEvent.clientX - startX;
                                  const newWidth = Math.max(50, startWidth + dx);
                                  const newHeight = newWidth / 2; // maintain 2:1 ratio
                                  setPlacedSignatures(prev => prev.map(s => s.id === sig.id ? { ...s, width: newWidth, height: newHeight } : s));
                                };
                                
                                const handleResizeUp = () => {
                                  document.removeEventListener('mousemove', handleResizeMove);
                                  document.removeEventListener('mouseup', handleResizeUp);
                                };
                                
                                document.addEventListener('mousemove', handleResizeMove);
                                document.addEventListener('mouseup', handleResizeUp);
                              }}
                              style={{
                                position: 'absolute',
                                right: '-4px',
                                bottom: '-4px',
                                width: '8px',
                                height: '8px',
                                background: 'var(--primary)',
                                borderRadius: '50%',
                                cursor: 'se-resize'
                              }}
                            />
                          )}
                        </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Signature Control Panel Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Menu Tanda Tangan</h4>
                
                {signatureImage ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{
                      background: 'white',
                      borderRadius: '8px',
                      padding: '8px',
                      height: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-color)'
                    }}>
                      <img src={signatureImage} alt="Current signature" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                    </div>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => {
                        setSignatureImage(null);
                        setPlacedSignatures([]);
                      }}
                      style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    >
                      <Trash2 size={14} /> Ganti Tanda Tangan
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button className="btn btn-secondary" onClick={() => setSignatureMode('draw')}>
                      <Edit3 size={16} /> Gambar Tanda Tangan
                    </button>
                    
                    <button className="btn btn-secondary" onClick={() => document.getElementById('sig-image-file').click()}>
                      <ImageIcon size={16} /> Unggah Gambar
                    </button>
                    <input 
                      type="file" 
                      id="sig-image-file" 
                      accept="image/png, image/jpeg" 
                      onChange={handleSignatureUpload} 
                      style={{ display: 'none' }} 
                    />
                  </div>
                )}

                {placedSignatures.length > 0 && (
                  <button 
                    className="btn btn-primary" 
                    onClick={savePdfWithSignatures}
                    style={{ marginTop: '12px' }}
                  >
                    <FileDown size={18} /> Simpan & Unduh PDF
                  </button>
                )}
              </div>

              {/* Signature board modal drawing area */}
              {signatureMode === 'draw' && (
                <div style={{
                  position: 'fixed',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.8)',
                  zIndex: 2000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px'
                }}>
                  <div className="glass" style={{
                    background: '#1c1c24',
                    width: '100%',
                    maxWidth: '450px',
                    padding: '24px',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Gambar Tanda Tangan Anda</h3>
                    
                    <canvas
                      ref={drawCanvasRef}
                      width={400}
                      height={200}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      style={{
                        background: 'white',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        cursor: 'crosshair',
                        width: '100%'
                      }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                      <button className="btn btn-secondary" onClick={() => setSignatureMode(null)}>
                        Batal
                      </button>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={clearSignaturePad}>
                          Bersihkan
                        </button>
                        <button className="btn btn-primary" onClick={saveDrawnSignature}>
                          <Check size={16} /> Simpan
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
