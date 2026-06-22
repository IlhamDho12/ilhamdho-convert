import React, { useState } from 'react';
import { ArrowLeft, Trash2, FileDown, Plus } from 'lucide-react';
import FileDropzone from './Shared/FileDropzone';
import Loader from './Shared/Loader';
import { PDFDocument } from 'pdf-lib';
import confetti from 'canvas-confetti';

export default function JpgToPdf({ onBack, addToast }) {
  const [images, setImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageSize, setPageSize] = useState('fit'); // 'fit', 'a4'

  const handleImagesSelected = (newFiles) => {
    const newImages = newFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
    addToast('success', `${newFiles.length} Gambar ditambahkan.`);
  };

  const removeImage = (id, preview) => {
    URL.revokeObjectURL(preview);
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const moveImage = (index, direction) => {
    const newImages = [...images];
    const targetIndex = index + direction;
    if (targetIndex >= 0 && targetIndex < newImages.length) {
      const temp = newImages[index];
      newImages[index] = newImages[targetIndex];
      newImages[targetIndex] = temp;
      setImages(newImages);
    }
  };

  // Helper to load image dimensions
  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const convertToPdf = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);

    try {
      const pdfDoc = await PDFDocument.create();

      for (const imgObj of images) {
        // Load image dimension & draw to canvas to get standardized jpeg bytes
        const img = await loadImage(imgObj.preview);
        
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // Convert to jpeg bytes
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const response = await fetch(jpegDataUrl);
        const imageBytes = await response.arrayBuffer();
        
        const embeddedImage = await pdfDoc.embedJpg(imageBytes);
        
        let width, height;
        if (pageSize === 'a4') {
          // A4 dimensions in points: 595.27 x 841.89
          width = 595.27;
          height = 841.89;
        } else {
          // Fit page to image size
          width = embeddedImage.width;
          height = embeddedImage.height;
        }
        
        const page = pdfDoc.addPage([width, height]);
        
        // Calculate fit dimensions maintaining aspect ratio
        let drawWidth = width;
        let drawHeight = height;
        let x = 0;
        let y = 0;
        
        if (pageSize === 'a4') {
          const imgRatio = embeddedImage.width / embeddedImage.height;
          const pageRatio = width / height;
          
          if (imgRatio > pageRatio) {
            drawHeight = width / imgRatio;
            y = (height - drawHeight) / 2;
          } else {
            drawWidth = height * imgRatio;
            x = (width - drawWidth) / 2;
          }
        }
        
        page.drawImage(embeddedImage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `ilhamdho-convert-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast('success', 'PDF berhasil dibuat!');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error(error);
      addToast('error', 'Gagal membuat PDF. Coba format gambar lain.');
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
        <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>JPG ke PDF</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Gabungkan gambar JPG, PNG, atau WebP menjadi file PDF. Susun ulang gambar sesuai urutan halaman.
        </p>

        {images.length === 0 ? (
          <FileDropzone 
            onFilesSelected={handleImagesSelected} 
            accept="image/*" 
            multiple={true}
            title="Pilih atau Seret Gambar Ke Sini"
            subtitle="Mendukung JPG, JPEG, PNG, WebP"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '16px'
            }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Ukuran Halaman:
                </label>
                <select 
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value)}
                  style={{
                    background: '#1f1f2e',
                    color: 'white',
                    border: '1px solid var(--border-color)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="fit">Sesuaikan Ukuran Gambar</option>
                  <option value="a4">Standard A4</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => document.getElementById('add-more-input').click()}
                  style={{ padding: '8px 16px' }}
                >
                  <Plus size={16} /> Tambah Gambar
                </button>
                <input 
                  type="file" 
                  id="add-more-input"
                  multiple 
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files.length > 0) {
                      handleImagesSelected(Array.from(e.target.files));
                    }
                  }}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {isProcessing ? (
              <Loader message="Sedang menyusun PDF..." />
            ) : (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '20px',
                  maxHeight: '50vh',
                  overflowY: 'auto',
                  padding: '8px'
                }}>
                  {images.map((img, idx) => (
                    <div key={img.id} className="glass" style={{
                      position: 'relative',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.2)'
                    }}>
                      <img 
                        src={img.preview} 
                        alt="Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                      <span style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        background: 'rgba(0,0,0,0.7)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        {idx + 1}
                      </span>
                      
                      <button 
                        onClick={() => removeImage(img.id, img.preview)}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(244, 63, 94, 0.9)',
                          border: 'none',
                          color: 'white',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={12} />
                      </button>

                      <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '8px',
                        background: 'rgba(0,0,0,0.7)',
                        padding: '4px 8px',
                        borderRadius: '20px'
                      }}>
                        <button 
                          disabled={idx === 0}
                          onClick={() => moveImage(idx, -1)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: idx === 0 ? '#555' : 'white',
                            cursor: idx === 0 ? 'default' : 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}
                        >
                          &larr;
                        </button>
                        <button 
                          disabled={idx === images.length - 1}
                          onClick={() => moveImage(idx, 1)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: idx === images.length - 1 ? '#555' : 'white',
                            cursor: idx === images.length - 1 ? 'default' : 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}
                        >
                          &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  className="btn btn-primary" 
                  onClick={convertToPdf}
                  style={{ alignSelf: 'flex-end', marginTop: '16px' }}
                >
                  <FileDown size={18} /> Buat PDF Sekarang
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
