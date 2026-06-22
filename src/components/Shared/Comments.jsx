import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, ShieldAlert, Award } from 'lucide-react';

// Ganti URL ini dengan URL Web App Google Apps Script Anda untuk menyimpan secara online
// Contoh: "https://script.google.com/macros/s/AKfycb.../exec"
const GOOGLE_SCRIPT_URL = "";

export default function Comments() {
  const [comments, setComments] = useState([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('bug'); // 'bug', 'suggestion'
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load comments
  const fetchComments = async () => {
    if (GOOGLE_SCRIPT_URL) {
      setIsLoading(true);
      try {
        const res = await fetch(GOOGLE_SCRIPT_URL);
        const data = await res.json();
        setComments(data.reverse()); // Show newest first
      } catch (err) {
        console.error("Gagal memuat dari Google Sheets, menggunakan data lokal:", err);
        loadLocalComments();
      } finally {
        setIsLoading(false);
      }
    } else {
      loadLocalComments();
    }
  };

  const loadLocalComments = () => {
    const local = localStorage.getItem('ilhamdho-convert-comments');
    if (local) {
      setComments(JSON.parse(local).reverse());
    } else {
      // Mock default comment for demo
      const mock = [
        {
          id: 'mock-1',
          name: 'Budi Santoso',
          category: 'bug',
          comment: 'Menu Edit PDF agak berat saat memuat file ukuran >5MB.',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          reply: 'Terima kasih masukannya Budi! Performa pemuatan file besar di Edit PDF sudah kami optimalkan menggunakan dynamic rendering.',
          repliedBy: 'Developer'
        },
        {
          id: 'mock-2',
          name: 'Siti Rahma',
          category: 'suggestion',
          comment: 'Sangat praktis! Desainnya bagus banget, kalau bisa tambahkan opsi kompresi file JPG juga ya.',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          reply: '',
          repliedBy: ''
        }
      ];
      localStorage.setItem('ilhamdho-convert-comments', JSON.stringify(mock));
      setComments(mock);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !commentText.trim()) return;

    setIsSubmitting(true);
    const newComment = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      category: category,
      comment: commentText.trim(),
      timestamp: new Date().toISOString(),
      reply: '',
      repliedBy: ''
    };

    if (GOOGLE_SCRIPT_URL) {
      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors', // standard mode for Google Apps Script execution
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newComment)
        });
        
        // Since no-cors returns opaque response, we assume success
        setName('');
        setCommentText('');
        // Optimistic UI update
        setComments(prev => [newComment, ...prev]);
        addLocalComment(newComment);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Save locally
      const local = localStorage.getItem('ilhamdho-convert-comments');
      const currentLocal = local ? JSON.parse(local) : [];
      const updatedLocal = [...currentLocal, newComment];
      localStorage.setItem('ilhamdho-convert-comments', JSON.stringify(updatedLocal));
      
      setName('');
      setCommentText('');
      setComments(updatedLocal.reverse());
      setIsSubmitting(false);
    }
  };

  const addLocalComment = (comment) => {
    const local = localStorage.getItem('ilhamdho-convert-comments') || "[]";
    const current = JSON.parse(local);
    localStorage.setItem('ilhamdho-convert-comments', JSON.stringify([...current, comment]));
  };

  return (
    <div className="glass" style={{ 
      marginTop: '48px', 
      padding: '32px', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '24px',
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-color)',
      animation: 'fadeIn 0.5s ease'
    }}>
      <div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>
          Apakah Anda menemukan bug?
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          Berikan masukan, saran, kritik, atau laporkan bug yang Anda temui agar web ini semakin "ngebut" dan optimal!
        </p>
      </div>

      {/* Form section (No email field, only name, category, and comment) */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Nama Anda:
            </label>
            <input 
              type="text" 
              placeholder="Masukkan nama..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                background: '#14141a',
                border: '1px solid var(--border-color)',
                color: 'white',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Kategori:
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                background: '#14141a',
                border: '1px solid var(--border-color)',
                color: 'white',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="bug">🐛 Laporan Bug</option>
              <option value="suggestion">💡 Kritik & Saran</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Isi Masukan / Detail Bug:
          </label>
          <textarea 
            placeholder="Tulis kritik, saran, atau langkah mereproduksi bug di sini secara detail..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            required
            rows={4}
            style={{
              background: '#14141a',
              border: '1px solid var(--border-color)',
              color: 'white',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'var(--font-sans)'
            }}
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="btn btn-primary"
          style={{ alignSelf: 'flex-end', padding: '10px 20px', gap: '10px' }}
        >
          {isSubmitting ? (
            'Mengirim...'
          ) : (
            <>
              <Send size={16} /> Kirim Masukan
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border-color)', margin: '12px 0' }} />

      {/* Comments List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={18} /> Tanggapan Pengunjung ({comments.length})
        </h4>

        {isLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Memuat tanggapan...</div>
        ) : comments.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontStyle: 'italic' }}>
            Belum ada tanggapan. Jadilah yang pertama memberikan masukan!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '8px' }}>
            {comments.map((item) => (
              <div key={item.id} className="glass" style={{ 
                padding: '20px', 
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.name}</span>
                    <span style={{
                      background: item.category === 'bug' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                      color: item.category === 'bug' ? 'var(--accent-rose)' : 'var(--primary)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      border: `1px solid ${item.category === 'bug' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(139, 92, 246, 0.1)'}`
                    }}>
                      {item.category === 'bug' ? 'Bug Report' : 'Kritik & Saran'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(item.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {item.comment}
                </p>

                {/* Reply section with Developer badge */}
                {item.reply && (
                  <div style={{
                    marginTop: '8px',
                    padding: '16px',
                    background: 'rgba(139, 92, 246, 0.05)',
                    borderLeft: '3px solid var(--primary)',
                    borderRadius: '0 8px 8px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Award size={14} style={{ color: 'var(--primary)' }} />
                      <span style={{ 
                        fontWeight: 800, 
                        fontSize: '0.78rem', 
                        color: 'var(--primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {item.repliedBy || 'Developer'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {item.reply}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
