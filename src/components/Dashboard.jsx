import React from 'react';
import { 
  FilePlus, 
  FileMinus, 
  FileSignature, 
  FileText, 
  Image, 
  Layers, 
  Scissors, 
  Minimize2,
  FileSpreadsheet
} from 'lucide-react';

const tools = [
  {
    id: 'jpg2pdf',
    title: 'JPG ke PDF',
    desc: 'Ubah gambar JPG atau PNG menjadi dokumen PDF berkualitas tinggi.',
    icon: Image,
    gradient: 'from-violet-500 to-indigo-500',
    color: '#8b5cf6'
  },
  {
    id: 'pdf2jpg',
    title: 'PDF ke JPG',
    desc: 'Ekstrak semua halaman dari file PDF menjadi gambar JPG.',
    icon: FileText,
    gradient: 'from-cyan-500 to-blue-500',
    color: '#06b6d4'
  },
  {
    id: 'merge',
    title: 'Gabungkan PDF',
    desc: 'Gabungkan beberapa file PDF menjadi satu dokumen tunggal secara instan.',
    icon: Layers,
    gradient: 'from-emerald-500 to-teal-500',
    color: '#10b981'
  },
  {
    id: 'split',
    title: 'Pisahkan PDF',
    desc: 'Pisahkan halaman tertentu dari file PDF Anda menjadi dokumen baru.',
    icon: Scissors,
    gradient: 'from-pink-500 to-rose-500',
    color: '#ec4899'
  },
  {
    id: 'compress',
    title: 'Kompres PDF',
    desc: 'Kurangi ukuran file PDF Anda tanpa mengurangi kualitas secara signifikan.',
    icon: Minimize2,
    gradient: 'from-amber-500 to-orange-500',
    color: '#f59e0b'
  },
  {
    id: 'sign',
    title: 'Tanda Tangani PDF',
    desc: 'Gambar atau unggah tanda tangan dan letakkan di atas dokumen PDF Anda.',
    icon: FileSignature,
    gradient: 'from-purple-500 to-pink-500',
    color: '#a855f7'
  },
  {
    id: 'edit',
    title: 'Edit PDF',
    desc: 'Tambahkan teks, catatan, atau buat coretan langsung di halaman PDF.',
    icon: FilePlus,
    gradient: 'from-blue-500 to-indigo-600',
    color: '#3b82f6'
  },
  {
    id: 'word2pdf',
    title: 'Word ke PDF',
    desc: 'Konversi file Word (.docx) menjadi dokumen PDF dengan tata letak rapi.',
    icon: FileText,
    gradient: 'from-teal-500 to-cyan-500',
    color: '#14b8a6'
  },
  {
    id: 'pdf2word',
    title: 'PDF ke Word',
    desc: 'Ekstrak isi teks dari file PDF dan unduh sebagai file Word (.docx).',
    icon: FileSpreadsheet,
    gradient: 'from-orange-500 to-red-500',
    color: '#f97316'
  }
];

export default function Dashboard({ onSelectTool }) {
  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <h1 style={{ 
          fontSize: '3rem', 
          fontWeight: 800, 
          marginBottom: '16px',
          letterSpacing: '-0.03em',
        }}>
          ilhamdho <span className="text-gradient">convert</span>
        </h1>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '1.1rem', 
          maxWidth: '600px',
          lineHeight: '1.6',
          fontWeight: 400
        }}>
          Alat pengolah dokumen & gambar serbaguna. Berjalan <strong>100% lokal di browser Anda</strong>. 
          Cepat ("ngebut"), tanpa upload ke server, dan sepenuhnya aman.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
        gap: '24px',
        padding: '10px 0'
      }}>
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div 
              key={tool.id} 
              className="glass glass-hover" 
              onClick={() => onSelectTool(tool.id)}
              style={{
                padding: '28px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                borderRadius: '20px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Background glow hover */}
              <div style={{
                position: 'absolute',
                top: '-50px',
                right: '-50px',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: tool.color,
                filter: 'blur(45px)',
                opacity: 0.15,
                pointerEvents: 'none'
              }} />

              <div style={{
                background: `linear-gradient(135deg, ${tool.color}15, ${tool.color}33)`,
                color: tool.color,
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${tool.color}25`
              }}>
                <Icon size={28} />
              </div>

              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', fontWeight: 700 }}>
                  {tool.title}
                </h3>
                <p style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '0.92rem', 
                  lineHeight: '1.5',
                  fontWeight: 400
                }}>
                  {tool.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
