import React, { useState } from 'react';
import { ArrowLeft, FileImage, Download } from 'lucide-react';
import FileDropzone from './Shared/FileDropzone';
import Loader from './Shared/Loader';
import JSZip from 'jszip';
import confetti from 'canvas-confetti';

// Import pdfjs-dist
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function PdfToJpg({ onBack, addToast }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pagesCount, setPagesCount] = useState(0);
  const [renderedPages, setRenderedPages] = useState([]); // List of image data URLs

  const handlePdfSelected = async (files) => {
    const file = files[0];
    setPdfFile(file);
    setIsProcessing(true);
    setRenderedPages([]);

    try {
      const fileReader = new FileReader();
      fileReader.onload = async function() {
        try {
          const typedarray = new Uint8Array(this.result);
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          setPagesCount(pdf.numPages);
          
          const pages = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for good quality JPG
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            pages.push({ index: i, dataUrl });
          }
          setRenderedPages(pages);
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

  const downloadSinglePage = (dataUrl, index) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `page-${index}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', `Halaman ${index} diunduh.`);
  };

  const downloadAllAsZip = async () => {
    if (renderedPages.length === 0) return;
    setIsProcessing(true);
    addToast('info', 'Sedang membuat file ZIP...');

    try {
      const zip = new JSZip();
      for (const page of renderedPages) {
        // Extract base64 content
        const base64Data = page.dataUrl.split(',')[1];
        zip.file(`page-${page.index}.jpg`, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `ilhamdho-images-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast('success', 'File ZIP berhasil diunduh!');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error(error);
      addToast('error', 'Gagal mengompres gambar ke ZIP.');
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
        <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>PDF ke JPG</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Konversi setiap halaman PDF menjadi file gambar JPG berkualitas tinggi dalam hitungan detik.
        </p>

        {!pdfFile && !isProcessing ? (
          <FileDropzone 
            onFilesSelected={handlePdfSelected} 
            accept="application/pdf" 
            multiple={false}
            title="Pilih atau Seret File PDF Ke Sini"
            subtitle="Mendukung semua jenis dokumen PDF"
          />
        ) : isProcessing ? (
          <Loader message={pdfFile ? "Sedang merender halaman PDF ke JPG..." : "Sedang membaca file PDF..."} />
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
                    setRenderedPages([]);
                  }}
                >
                  Ganti PDF
                </button>
                <button className="btn btn-primary" onClick={downloadAllAsZip}>
                  <Download size={18} /> Unduh Semua (ZIP)
                </button>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '24px',
              maxHeight: '55vh',
              overflowY: 'auto',
              padding: '8px'
            }}>
              {renderedPages.map((page) => (
                <div key={page.index} className="glass" style={{
                  position: 'relative',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'rgba(0,0,0,0.2)'
                }}>
                  <div style={{ 
                    flexGrow: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '8px',
                    aspectRatio: '3/4'
                  }}>
                    <img 
                      src={page.dataUrl} 
                      alt={`Halaman ${page.index}`} 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                      }}
                    />
                  </div>
                  
                  <div style={{
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Hal. {page.index}
                    </span>
                    <button 
                      onClick={() => downloadSinglePage(page.dataUrl, page.index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}
                    >
                      <Download size={14} /> Unduh
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
