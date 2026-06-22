import React, { useState, useRef } from 'react';
import { ArrowLeft, FileDown, Type, Trash2, Edit } from 'lucide-react';
import FileDropzone from './Shared/FileDropzone';
import Loader from './Shared/Loader';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import confetti from 'canvas-confetti';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function EditPdf({ onBack, addToast }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfDocInstance, setPdfDocInstance] = useState(null);
  
  // Navigation & Viewer states
  const [currentPage, setCurrentPage] = useState(1);
  const [pagesCount, setPagesCount] = useState(0);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const [pagePreviewUrl, setPagePreviewUrl] = useState('');
  
  // Custom annotation states (adding brand-new text box)
  const [customTexts, setCustomTexts] = useState([]); // List of { id, pageNum, text, x, y }
  const [newTextVal, setNewTextVal] = useState('');
  const [textInputPos, setTextInputPos] = useState(null); // { x, y } when editing
  const [activeTextId, setActiveTextId] = useState(null);

  // Original text editing states
  const [originalTexts, setOriginalTexts] = useState([]); // List of { id, pageNum, text, originalText, xPercent, yPercent, widthPercent, heightPercent, fontSize, pdfX, pdfY, pdfWidth, pdfHeight, isEdited, isDeleted }
  const [editingTextItem, setEditingTextItem] = useState(null); // The original text item being edited
  const [editTextVal, setEditTextVal] = useState('');

  const pdfViewContainerRef = useRef(null);

  const handlePdfSelected = async (files) => {
    const file = files[0];
    setPdfFile(file);
    setIsProcessing(true);
    setCustomTexts([]);
    setOriginalTexts([]);
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

  const loadPagePreview = async (pdfDoc, pageNum) => {
    if (!pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 }); // 1.5x scale for editor canvas
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      
      setPageDimensions({ width: viewport.width, height: viewport.height });
      setPagePreviewUrl(canvas.toDataURL('image/png'));

      // Extract text content of page to allow editing original text
      const textContent = await page.getTextContent();
      
      // Map text items to viewport percentage coordinates
      const mappedTexts = textContent.items.map((item, index) => {
        const tx = item.transform[4];
        const ty = item.transform[5];
        const fontSize = item.transform[3]; // Vertical scale = font size
        
        // Convert bottom-left coordinates to viewport coordinates (top-left system)
        const [vx, vy] = viewport.convertToViewportPoint(tx, ty);
        
        // Estimate width & height based on viewport scale
        const height = fontSize * 1.5;
        const width = item.width * 1.5;
        
        // The convertToViewportPoint returns baseline. The top of the text box is vy - height
        const x = vx;
        const y = vy - height;

        return {
          id: `orig-${pageNum}-${index}-${Math.random().toString(36).substr(2, 5)}`,
          pageNum,
          text: item.str,
          originalText: item.str,
          xPercent: (x / viewport.width) * 100,
          yPercent: (y / viewport.height) * 100,
          widthPercent: (width / viewport.width) * 100,
          heightPercent: (height / viewport.height) * 100,
          fontSize,
          pdfX: tx,
          pdfY: ty,
          pdfWidth: item.width,
          pdfHeight: fontSize,
          isEdited: false,
          isDeleted: false
        };
      });

      // Filter out empty items
      const validMappedTexts = mappedTexts.filter(t => t.text.trim().length > 0);

      // Save to state (merge with existing page edits if already present)
      setOriginalTexts(prev => {
        const filtered = prev.filter(t => t.pageNum !== pageNum);
        return [...filtered, ...validMappedTexts];
      });

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
      setTextInputPos(null);
      setEditingTextItem(null);
    }
  };

  // Click on PDF page
  const handlePageClick = (e) => {
    if (!pdfViewContainerRef.current) return;
    
    // Only allow click annotation on empty space (direct click on the page image)
    if (!e.target.classList.contains('pdf-page-image')) {
      return;
    }

    const pageImg = pdfViewContainerRef.current.querySelector('.pdf-page-image');
    if (!pageImg) return;

    const rect = pageImg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      setTextInputPos({ x, y });
      setNewTextVal('');
      setActiveTextId(null);
      setEditingTextItem(null);
    }
  };

  // Click on original PDF text item to edit it
  const handleOriginalTextClick = (item, e) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingTextItem(item);
    setEditTextVal(item.text);
    setTextInputPos(null);
    setActiveTextId(null);
  };

  // Add brand-new text box annotation
  const addCustomText = () => {
    if (!newTextVal.trim() || !textInputPos) return;
    
    const newText = {
      id: Math.random().toString(36).substr(2, 9),
      pageNum: currentPage,
      text: newTextVal,
      x: textInputPos.x,
      y: textInputPos.y - 10,
    };

    setCustomTexts(prev => [...prev, newText]);
    setTextInputPos(null);
    setNewTextVal('');
    addToast('success', 'Teks kustom ditambahkan.');
  };

  const removeCustomText = (id, e) => {
    e.stopPropagation();
    setCustomTexts(prev => prev.filter(t => t.id !== id));
    setActiveTextId(null);
  };

  // Save edit of original text
  const handleSaveOriginalText = () => {
    if (!editingTextItem) return;
    
    setOriginalTexts(prev => prev.map(t => {
      if (t.id === editingTextItem.id) {
        return {
          ...t,
          text: editTextVal,
          isEdited: editTextVal !== t.originalText,
          isDeleted: editTextVal.trim() === ''
        };
      }
      return t;
    }));
    
    setEditingTextItem(null);
    addToast('success', 'Perubahan teks disimpan.');
  };

  // Delete original text
  const handleDeleteOriginalText = () => {
    if (!editingTextItem) return;

    setOriginalTexts(prev => prev.map(t => {
      if (t.id === editingTextItem.id) {
        return {
          ...t,
          text: '',
          isEdited: false,
          isDeleted: true
        };
      }
      return t;
    }));

    setEditingTextItem(null);
    addToast('success', 'Teks asli dihapus.');
  };

  const handleCustomTextDrag = (id, e) => {
    e.stopPropagation();
    setActiveTextId(id);
    const startX = e.clientX;
    const startY = e.clientY;

    const txtIndex = customTexts.findIndex(t => t.id === id);
    if (txtIndex === -1) return;

    const originalX = customTexts[txtIndex].x;
    const originalY = customTexts[txtIndex].y;

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      setCustomTexts(prev => prev.map(t => {
        if (t.id === id) {
          return { ...t, x: originalX + dx, y: originalY + dy };
        }
        return t;
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const saveEditedPdf = async () => {
    const hasOriginalEdits = originalTexts.some(t => t.isEdited || t.isDeleted);
    const hasCustomAnnotations = customTexts.length > 0;
    
    if (!hasOriginalEdits && !hasCustomAnnotations) {
      addToast('error', 'Belum ada perubahan teks yang ditambahkan.');
      return;
    }

    setIsProcessing(true);
    addToast('info', 'Sedang memproses penyimpanan file PDF...');

    try {
      const fileBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      
      const pageImg = pdfViewContainerRef.current.querySelector('.pdf-page-image');
      const htmlWidth = pageImg.clientWidth;
      const htmlHeight = pageImg.clientHeight;

      // 1. Process original text edits and deletions (using white masking)
      const modifiedOriginals = originalTexts.filter(t => t.isEdited || t.isDeleted);
      for (const item of modifiedOriginals) {
        const targetPage = pages[item.pageNum - 1];
        
        // Draw white rectangle to mask/hide original text
        targetPage.drawRectangle({
          x: item.pdfX - 1,
          y: item.pdfY - 1,
          width: item.pdfWidth + 3,
          height: item.pdfHeight + 3,
          color: rgb(1, 1, 1), // white rectangle
        });

        // Write the edited text on top of the mask
        if (item.isEdited && !item.isDeleted) {
          targetPage.drawText(item.text, {
            x: item.pdfX,
            y: item.pdfY,
            size: item.pdfHeight,
            font,
            color: rgb(0.08, 0.08, 0.08),
          });
        }
      }

      // 2. Process custom added text annotations
      for (const item of customTexts) {
        const targetPage = pages[item.pageNum - 1];
        const pdfWidth = targetPage.getWidth();
        const pdfHeight = targetPage.getHeight();

        const ratioX = pdfWidth / htmlWidth;
        const ratioY = pdfHeight / htmlHeight;

        const x = item.x * ratioX;
        const y = (htmlHeight - item.y) * ratioY - 10; // y-axis mapping

        targetPage.drawText(item.text, {
          x,
          y,
          size: 14 * ratioY,
          font,
          color: rgb(0.08, 0.08, 0.08),
        });
      }

      const editedBytes = await pdfDoc.save();
      const blob = new Blob([editedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `ilhamdho-edited-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast('success', 'PDF berhasil disimpan!');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error(error);
      addToast('error', 'Gagal memproses penyimpanan PDF.');
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
        <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Edit PDF</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Klik **langsung pada teks asli** dokumen untuk mengubah atau menghapusnya. Klik di area kosong untuk menambahkan teks baru.
        </p>

        {!pdfFile && !isProcessing ? (
          <FileDropzone 
            onFilesSelected={handlePdfSelected} 
            accept="application/pdf" 
            multiple={false}
            title="Pilih atau Seret File PDF Ke Sini"
            subtitle="Mendukung penulisan & penghapusan teks asli PDF"
          />
        ) : isProcessing && !pdfDocInstance ? (
          <Loader message="Sedang memuat dokumen PDF..." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px', minHeight: '55vh' }}>
            {/* PDF Viewer column */}
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

              {/* PDF Display Container (Full height & responsive, no max-height scrollbar restriction) */}
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
                  minHeight: '500px', // Expand to show document full height
                  cursor: 'text'
                }}
              >
                {isProcessing ? (
                  <Loader message="Memuat halaman..." />
                ) : (
                  <div className="canvas-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
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

                    {/* Masking overlay for deleted or edited text items (using percentage coords) */}
                    {originalTexts
                      .filter(txt => txt.pageNum === currentPage && (txt.isEdited || txt.isDeleted))
                      .map(txt => (
                        <div
                          key={`mask-${txt.id}`}
                          style={{
                            position: 'absolute',
                            left: `${txt.xPercent}%`,
                            top: `${txt.yPercent}%`,
                            width: `${txt.widthPercent}%`,
                            height: `${txt.heightPercent}%`,
                            background: 'white', // Masks/covers original document text
                            pointerEvents: 'none',
                            zIndex: 1
                          }}
                        />
                    ))}

                    {/* Interactive Text Overlay Blocks (Original Text - using percentage coords) */}
                    {originalTexts
                      .filter(t => t.pageNum === currentPage)
                      .map((t) => (
                        <div
                          key={t.id}
                          onClick={(e) => handleOriginalTextClick(t, e)}
                          style={{
                            position: 'absolute',
                            left: `${t.xPercent}%`,
                            top: `${t.yPercent}%`,
                            width: `${t.widthPercent}%`,
                            height: `${t.heightPercent}%`,
                            border: editingTextItem?.id === t.id ? '1px dashed var(--primary)' : '1px transparent solid',
                            background: t.isDeleted ? 'rgba(244, 63, 94, 0.08)' : (t.isEdited ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255, 255, 255, 0.01)'),
                            cursor: 'pointer',
                            zIndex: 2,
                            display: 'flex',
                            alignItems: 'center',
                            boxSizing: 'border-box',
                            overflow: 'hidden'
                          }}
                          onMouseEnter={(e) => {
                            if (!editingTextItem) {
                              e.currentTarget.style.border = '1px solid var(--primary)';
                              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (editingTextItem?.id !== t.id) {
                              e.currentTarget.style.border = '1px transparent solid';
                              e.currentTarget.style.background = t.isDeleted ? 'rgba(244, 63, 94, 0.08)' : (t.isEdited ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255, 255, 255, 0.01)');
                            }
                          }}
                          title="Klik untuk mengedit/menghapus teks ini"
                        >
                          {/* Render edited text overlays */}
                          {t.isEdited && !t.isDeleted && (
                            <span style={{ 
                              fontSize: '85%', // Fits perfectly within the overlay container
                              fontFamily: 'Arial, sans-serif', 
                              color: '#000000', 
                              whiteSpace: 'nowrap',
                              lineHeight: '1.0'
                            }}>
                              {t.text}
                            </span>
                          )}
                          {t.isDeleted && (
                            <span style={{ fontSize: '9px', color: 'red', textDecoration: 'line-through', padding: '2px' }}>
                              Dihapus
                            </span>
                          )}
                        </div>
                    ))}

                    {/* Custom added text boxes */}
                    {customTexts
                      .filter(t => t.pageNum === currentPage)
                      .map((t) => (
                        <div
                          key={t.id}
                          onMouseDown={(e) => handleCustomTextDrag(t.id, e)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            left: t.x,
                            top: t.y,
                            border: activeTextId === t.id ? '1px dashed var(--primary)' : '1px transparent solid',
                            background: 'rgba(139, 92, 246, 0.1)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            color: '#111827',
                            fontWeight: 500,
                            fontSize: '14px',
                            cursor: 'move',
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            zIndex: 3
                          }}
                        >
                          <span>{t.text}</span>
                          {activeTextId === t.id && (
                            <button
                              onClick={(e) => removeCustomText(t.id, e)}
                              style={{
                                background: 'rgba(244, 63, 94, 0.9)',
                                color: 'white',
                                border: 'none',
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '0.65rem'
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                    ))}

                    {/* Text input editor box (Adding new custom text) */}
                    {textInputPos && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          left: textInputPos.x,
                          top: textInputPos.y,
                          zIndex: 100,
                          background: '#1f1f2e',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '8px',
                          display: 'flex',
                          gap: '8px',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                        }}
                      >
                        <input 
                          type="text" 
                          autoFocus
                          placeholder="Teks baru..."
                          value={newTextVal}
                          onChange={(e) => setNewTextVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addCustomText();
                            if (e.key === 'Escape') setTextInputPos(null);
                          }}
                          style={{
                            background: '#09090b',
                            border: '1px solid var(--border-color)',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            outline: 'none'
                          }}
                        />
                        <button className="btn btn-primary" onClick={addCustomText} style={{ padding: '4px 8px', fontSize: '0.85rem' }}>
                          Ok
                        </button>
                        <button className="btn btn-secondary" onClick={() => setTextInputPos(null)} style={{ padding: '4px 8px', fontSize: '0.85rem' }}>
                          Batal
                        </button>
                      </div>
                    )}

                    {/* Original Text Editor Inline Box */}
                    {editingTextItem && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          left: `${editingTextItem.xPercent}%`,
                          top: `calc(${editingTextItem.yPercent}% + ${editingTextItem.heightPercent}% + 10px)`,
                          zIndex: 100,
                          background: '#1f1f2e',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                          width: '260px'
                        }}
                      >
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          Edit Teks Dokumen Asli:
                        </label>
                        <input 
                          type="text" 
                          autoFocus
                          value={editTextVal}
                          onChange={(e) => setEditTextVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveOriginalText();
                            if (e.key === 'Escape') setEditingTextItem(null);
                          }}
                          style={{
                            background: '#09090b',
                            border: '1px solid var(--border-color)',
                            color: 'white',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            outline: 'none'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn" 
                            onClick={handleDeleteOriginalText}
                            style={{ 
                              padding: '4px 10px', 
                              fontSize: '0.78rem', 
                              background: 'rgba(244, 63, 94, 0.1)', 
                              color: 'var(--accent-rose)',
                              border: 'none',
                              borderRadius: '4px'
                            }}
                          >
                            Hapus
                          </button>
                          <button 
                            className="btn btn-primary" 
                            onClick={handleSaveOriginalText} 
                            style={{ padding: '4px 10px', fontSize: '0.78rem', borderRadius: '4px' }}
                          >
                            Simpan
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            onClick={() => setEditingTextItem(null)} 
                            style={{ padding: '4px 10px', fontSize: '0.78rem', borderRadius: '4px' }}
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right column instructions and Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Menu Edit PDF</h4>
                
                <div style={{
                  background: 'rgba(255,255,255,0.01)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    <strong>Petunjuk Edit Teks Asli:</strong><br />
                    1. Arahkan kursor dan klik pada teks dokumen asli yang ingin Anda ubah.<br />
                    2. Masukkan teks baru atau pilih **Hapus** untuk menghapus teks tersebut.<br />
                    3. Tekan **Simpan** untuk menyimpan perubahan.<br /><br />
                    <strong>Menambah Teks Baru:</strong><br />
                    Klik di bagian halaman yang kosong untuk menambahkan teks kustom baru.
                  </p>
                </div>

                {(originalTexts.some(t => t.isEdited || t.isDeleted) || customTexts.length > 0) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Telah melakukan perubahan teks.
                    </div>
                    <button className="btn btn-primary" onClick={saveEditedPdf}>
                      <FileDown size={18} /> Simpan & Unduh PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
