import React, { useState } from 'react';
import { ArrowLeft, Minimize2, FileDown } from 'lucide-react';
import FileDropzone from './Shared/FileDropzone';
import Loader from './Shared/Loader';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import confetti from 'canvas-confetti';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function CompressPdf({ onBack, addToast }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pagesCount, setPagesCount] = useState(0);
  const [compressLevel, setCompressLevel] = useState('medium'); // 'low', 'medium', 'high'
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(null);

  const handlePdfSelected = async (files) => {
    const file = files[0];
    setPdfFile(file);
    setOriginalSize((file.size / 1024 / 1024).toFixed(2));
    setCompressedSize(null);
    setIsProcessing(true);

    try {
      const fileReader = new FileReader();
      fileReader.onload = async function() {
        try {
          const typedarray = new Uint8Array(this.result);
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          setPagesCount(pdf.numPages);
          addToast('success', 'PDF berhasil dimuat.');
        } catch (e) {
          console.error(e);
          addToast('error', 'Gagal memuat dokumen PDF.');
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

  const handleCompress = async () => {
    if (!pdfFile) return;
    setIsProcessing(true);
    addToast('info', 'Sedang mengompres PDF. Proses ini memerlukan waktu beberapa saat...');

    try {
      // Define compression parameters
      let scale = 1.3;
      let quality = 0.65;

      if (compressLevel === 'low') {
        scale = 1.8;
        quality = 0.8;
      } else if (compressLevel === 'high') {
        scale = 0.9;
        quality = 0.45;
      }

      const fileBytes = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(fileBytes) }).promise;
      const pdfDoc = await PDFDocument.create();

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render page to canvas
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        // Convert to compressed jpeg image data
        const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
        const response = await fetch(jpegDataUrl);
        const imageBytes = await response.arrayBuffer();

        // Embed in the new PDF
        const embeddedImage = await pdfDoc.embedJpg(imageBytes);
        
        const newPage = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
        newPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: embeddedImage.width,
          height: embeddedImage.height,
        });
      }

      const compressedBytes = await pdfDoc.save();
      const blob = new Blob([compressedBytes], { type: 'application/pdf' });
      
      const newSize = (blob.size / 1024 / 1024).toFixed(2);
      setCompressedSize(newSize);

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ilhamdho-compressed-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast('success', `PDF berhasil dikompres ke ${newSize} MB!`);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error(error);
      addToast('error', 'Gagal mengompres PDF.');
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
        <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Kompres PDF</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Kurangi ukuran file dokumen PDF Anda dengan mendownscale dan mengompresi halaman secara optimal.
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
          <Loader message={pdfFile ? "Sedang melakukan kompresi halaman PDF..." : "Sedang memuat dokumen..."} />
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
                  Ukuran Asli: {originalSize} MB • {pagesCount} Halaman
                </p>
              </div>

              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setPdfFile(null);
                  setCompressedSize(null);
                }}
              >
                Ganti PDF
              </button>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              padding: '24px',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <label style={{ fontSize: '1rem', fontWeight: 600 }}>Pilih Tingkat Kompresi:</label>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                <div 
                  onClick={() => setCompressLevel('low')}
                  style={{
                    border: compressLevel === 'low' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: compressLevel === 'low' ? 'rgba(139, 92, 246, 0.05)' : 'none',
                    padding: '16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <h5 style={{ fontWeight: 700, marginBottom: '4px' }}>Kompresi Rendah</h5>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Kualitas visual sangat baik, ukuran file berkurang sedikit.</p>
                </div>

                <div 
                  onClick={() => setCompressLevel('medium')}
                  style={{
                    border: compressLevel === 'medium' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: compressLevel === 'medium' ? 'rgba(139, 92, 246, 0.05)' : 'none',
                    padding: '16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <h5 style={{ fontWeight: 700, marginBottom: '4px' }}>Kompresi Sedang (Rekomendasi)</h5>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Keseimbangan terbaik antara kualitas gambar dan ukuran file.</p>
                </div>

                <div 
                  onClick={() => setCompressLevel('high')}
                  style={{
                    border: compressLevel === 'high' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: compressLevel === 'high' ? 'rgba(139, 92, 246, 0.05)' : 'none',
                    padding: '16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <h5 style={{ fontWeight: 700, marginBottom: '4px' }}>Kompresi Tinggi</h5>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ukuran file sekecil mungkin, kualitas visual sedikit berkurang.</p>
                </div>
              </div>
            </div>

            {compressedSize && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>Berhasil Dikompres!</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Ukuran Berkurang: {originalSize} MB &rarr; {compressedSize} MB ({((1 - compressedSize / originalSize) * 100).toFixed(0)}% lebih kecil)
                  </p>
                </div>
              </div>
            )}

            <button 
              className="btn btn-primary" 
              onClick={handleCompress}
              style={{ alignSelf: 'flex-end', marginTop: '16px' }}
            >
              <Minimize2 size={18} /> Kompres PDF Sekarang
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
